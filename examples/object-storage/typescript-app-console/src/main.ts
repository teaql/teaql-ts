import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { S3Client } from '@aws-sdk/client-s3';
import { ObjectKey, ObjectPutOptions, StorageError, UserContext } from 'teaql-ts';
import type { ObjectStorageEvent } from 'teaql-ts';
import { S3ObjectStorage } from 'teaql-ts/object-storage/s3';
import { SQLiteTeaQLClient } from 'teaql-ts/sql/sqlite';
import { E } from './generated/E';
import { Q } from './generated/Q';
import { GENERATED_RUNTIME_MODULE } from './runtime-module';

const receipt = Buffer.from('TeaQL order receipt fixture\nItem: tea\nTotal: 12.50\n');
const filename = 'receipt.txt';
const mediaType = 'text/plain';

async function verify(database: string, download: string, round: number): Promise<void> {
  const provider = new S3ObjectStorage(new S3Client({
    endpoint: process.env.TEAQL_S3_ENDPOINT!,
    forcePathStyle: true,
    region: 'us-east-1',
    maxAttempts: 1,
    credentials: {
      accessKeyId: process.env.TEAQL_S3_ACCESS_KEY!,
      secretAccessKey: process.env.TEAQL_S3_SECRET_KEY!,
    },
  }), process.env.TEAQL_S3_BUCKET!);
  const sqlite = new SQLiteTeaQLClient(database, GENERATED_RUNTIME_MODULE.schemas).install(GENERATED_RUNTIME_MODULE);
  const events: ObjectStorageEvent[] = [];
  const audits: Readonly<Record<string, unknown>>[] = [];
  sqlite.setAuditSink(event => {
    if (event.entity === 'CustomerOrder' || event.entity === 'OrderAttachment') audits.push(event);
  });
  const trace = `order-attachment-${round}`;
  const context = new UserContext().insertResource('dataService', sqlite).insertResource('traceId', trace)
    .withObjectStorage(provider).withObjectStorageObserver(event => events.push(event));
  const storage = context.objectStorage('file and retrieve an order receipt');
  const key = new ObjectKey(`private-order-attachments/${randomUUID()}`);
  const hash = createHash('sha256').update(receipt).digest('hex');
  let uploaded = false;
  try {
    await context.ensureSchema();
    const [platform] = await Q.commercePlatforms().withIdIs('1').limit(1)
      .comment('load the commerce platform').purpose('associate the new order to its root')
      .executeForList(context);
    assert(platform, 'generated platform missing');
    const orderNumber = `ATTACH-ORDER-${round}`;
    const order = await Q.customerOrders().comment('prepare receipt order')
      .purpose('file a receipt against this order').newEntity(context);
    order.updateOrderNumber(orderNumber);
    order.updateCommercePlatform(platform.id);
    await order.auditAs('place the order receiving the receipt').save(context);

    assert.equal(await storage.exists(key), false);
    await storage.putBytes(key, receipt, new ObjectPutOptions(receipt.length, 'create_only', mediaType, { 'receipt-sha256': hash }));
    uploaded = true;
    const attachment = await Q.orderAttachments().comment('prepare receipt attachment')
      .purpose('save the uploaded receipt reference on its order').newEntity(context);
    attachment.updateCustomerOrder(order.id);
    attachment.updateFileName(filename);
    attachment.updateContentType(mediaType);
    attachment.updateContentLength(receipt.length);
    attachment.updateContentSha256(hash);
    attachment.updateObjectKey(key.value);
    await attachment.auditAs('associate the stored receipt with its order').save(context);

    const attachments = () => Q.orderAttachments().filterByCustomerOrder(order.id).limit(2)
      .comment('load order attachments').purpose('retrieve this order’s stored receipt').executeForList(context);
    const rows = await attachments();
    assert.equal(rows.length, 1);
    const expression = E.orderAttachment(rows[0]);
    assert.equal(expression.id().eval(), attachment.id);
    assert.equal(expression.customerOrderId().eval(), order.id);
    assert.equal(expression.fileName().eval(), filename);
    assert.equal(expression.contentType().eval(), mediaType);
    const persistedKeyText = expression.objectKey().eval();
    const length = expression.contentLength().eval();
    const digest = expression.contentSha256().eval();
    assert(persistedKeyText === key.value, 'stored receipt reference changed');
    assert.equal(length, receipt.length);
    assert.equal(digest, hash);
    const persistedKey = new ObjectKey(persistedKeyText);
    const metadata = await storage.head(persistedKey);
    assert(metadata && metadata.size === length && metadata.contentType === mediaType && metadata.customMetadata['receipt-sha256'] === digest);
    const replacement = Buffer.from('replacement');
    await assert.rejects(() => storage.putBytes(persistedKey, replacement, new ObjectPutOptions(replacement.length, 'create_only')),
      error => error instanceof StorageError && error.code === 'Conflict');
    await assert.rejects(() => storage.getBytes(persistedKey, length - 1),
      error => error instanceof StorageError && error.code === 'TooLarge');
    const returned = Buffer.from(await storage.getBytes(persistedKey, length));
    assert(returned.equals(receipt));
    assert.equal(createHash('sha256').update(returned).digest('hex'), digest);
    writeFileSync(download, returned, { mode: 0o600 });

    await storage.delete(persistedKey);
    uploaded = false;
    await assert.rejects(() => storage.get(persistedKey), error => error instanceof StorageError && error.code === 'NotFound');
    assert.equal(await storage.exists(persistedKey), false);
    assert.deepEqual((await attachments()).map(row => row.id), [attachment.id]);
    assert(events.length > 0 && events.every(event => event.traceId === trace));
    assert.deepEqual(audits.map(event => [event.entity, event.id]), [['CustomerOrder', order.id], ['OrderAttachment', attachment.id]]);
    assert(!JSON.stringify(events).includes(key.value) && !JSON.stringify(audits).includes(key.value), 'private key reached safe events');
    console.log('ORDER_ATTACHMENT ' + JSON.stringify({ round, order: order.id, attachment: attachment.id, orderNumber,
      filename, contentType: mediaType, length, sha256: digest, conflict: true, sizeRefused: true, missing: true, businessAudits: audits.length }));
  } finally {
    try {
      if (uploaded) await storage.delete(key);
    } finally {
      provider.close();
      await sqlite.close();
    }
  }
}

const [database, download, round] = process.argv.slice(2);
verify(database, download, Number(round)).catch(error => {
  console.error('Order attachment example failed', error instanceof Error ? error.name : 'unknown');
  process.exitCode = 1;
});
