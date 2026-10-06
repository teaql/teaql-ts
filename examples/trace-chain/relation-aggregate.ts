import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {UserContext} from 'teaql-ts';
import {AbstractSQLTeaQLClient, SQLExecutionEvidenceStore} from 'teaql-ts/sql/core';
import {SQLiteDriver} from 'teaql-ts/sql/sqlite';
import {Q} from './lib/src/generated/Q';
import {E} from './lib/src/generated/E';
import {GENERATED_RUNTIME_MODULE} from './lib/src/runtime-module';

type Order = Parameters<typeof E.customerOrder>[0];
type Payment = Parameters<typeof E.payment>[0];

const manifest = (path: string): string => readdirSync(path, {withFileTypes: true})
  .sort((a, b) => a.name.localeCompare(b.name)).map(entry => entry.isDirectory()
    ? manifest(join(path, entry.name))
    : createHash('sha256').update(readFileSync(join(path, entry.name))).digest('hex')).join('');

class Driver extends SQLiteDriver {
  calls = 0;
  aggregateFailure?: Error;
  override async query(sql: string, values: any[] = []) {
    this.calls++;
    if (this.aggregateFailure && /COUNT\(/i.test(sql)) throw this.aggregateFailure;
    return super.query(sql, values);
  }
  override async *stream(sql: string, values: any[] = []) {
    this.calls++;
    yield* super.stream(sql, values);
  }
}
class Client extends AbstractSQLTeaQLClient {
  constructor(driver: Driver) { super(driver, GENERATED_RUNTIME_MODULE.schemas); }
}
async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const row of stream) result.push(row);
  return result;
}
function relatedCount(entity: object, alias: string): number {
  const value = (entity as unknown as Record<string, unknown>)[alias];
  assert.equal(typeof value, 'number', `related count ${alias} was not loaded`);
  assert(Number.isSafeInteger(value));
  return value as number;
}

async function main() {
  const before = manifest('lib');
  const path = resolve(process.env.TEAQL_TRACE_CHAIN_AGGREGATE_DB ?? '.local/relation-aggregate.sqlite');
  mkdirSync(dirname(path), {recursive: true});
  const driver = new Driver(path);
  const client = new Client(driver).install(GENERATED_RUNTIME_MODULE).setDiagnosticSQLLogSink(undefined);
  const context = new UserContext().insertResource('dataService', client);
  const evidence = new SQLExecutionEvidenceStore();
  client.setRuntimeTelemetrySink(evidence);
  const group = randomUUID(), secret = 'PRIVATE-GENERATED-AGGREGATE', alias = 'matchingItems';
  const ids: string[] = [];
  try {
    await context.ensureSchema();
    await context.ensureSchema();
    for (let i = 0; i < 2; i++) {
      const order = Q.customerOrders().comment('initialize aggregate fixture').purpose('verify generated relation aggregate')
        .newEntity(context).updatePlatform('1').updateOrderNumber(`${group}-${i}`).updateDescription(group);
      for (const name of [secret, 'ordinary item']) {
        order.orderItemList().push(Q.orderItems().comment('initialize item').purpose('verify count predicate')
          .newEntity(context).updateName(name));
      }
      order.paymentList().push(Q.payments().comment('initialize payment').purpose('verify nested count')
        .newEntity(context).updateReferenceCode(`${group}-${i}`));
      await order.auditAs('seed generated aggregate graph').save(context);
      ids.push(order.id!);
    }
    for (const logging of [true, false]) {
      client.setQueryLoggingEnabled(logging);
      const filtered = await Q.payments().filterByCustomerOrderIn(ids[0]).limit(1)
        .selectCustomerOrderWith(Q.customerOrders().withIdIs('0').limit(1))
        .comment('load a filtered forward reference').purpose('distinguish NotLoaded details from null')
        .executeForList(context);
      assert.equal(filtered.length, 1);
      const identity = E.payment(filtered[0]).customerOrder().eval();
      assert(identity, 'a filtered target must retain its actual FK identity');
      assert.equal(E.customerOrder(identity).id().eval(), ids[0]);
      assert.throws(() => E.customerOrder(identity).description().eval(),
        {name: 'TeaQLNotLoadedError'},
        'unfetched description must not become a loaded-null value');
      const visible = await Q.payments().filterByCustomerOrderIn(ids[0]).limit(1)
        .selectCustomerOrderWith(Q.customerOrders().withIdIs(ids[0]).limit(1))
        .comment('load the full forward reference').purpose('verify independent detail loading')
        .executeForList(context);
      const full = E.payment(visible[0]).customerOrder().eval();
      assert(full);
      assert.equal(E.customerOrder(full).description().eval(), group);
      assert.throws(() => E.customerOrder(identity).description().eval(),
        {name: 'TeaQLNotLoadedError'},
        'a later loaded view must not leak into the filtered edge');
      console.log(`FORWARD_NOTLOADED_OBSERVED ${JSON.stringify({logging, id: ids[0]})}`);
    }
    for (const nested of [false, true]) for (const mode of ['list', 'stream-full', 'stream-tail']) {
      for (const logging of [true, false]) {
        evidence.enableAll();
        client.setQueryLoggingEnabled(logging);
        const child = Q.orderItems().withNameIs(secret).limit(2);
        const orders = Q.customerOrders().withIdIn(...ids).limit(2)
          .countOrderItemsWith(alias, child)
          .selectOrderItemListWith(Q.orderItems().limit(2));
        const payments = logging
          ? Q.payments().withCustomerOrderMatching(Q.customerOrders().withIdIn(...ids).limit(2))
          : Q.payments().filterByCustomerOrderIn(...ids);
        const query = nested ? payments.limit(2).selectCustomerOrderWith(orders) : orders;
        const request = query.comment(`inspect ${secret}`).purpose('verify generated aggregate ancestry');
        const start = driver.calls;
        const rows = mode === 'list' ? await request.executeForList(context)
          : await collect<Order | Payment>(request.executeForStream(context, mode === 'stream-full' ? 1 : 3));
        assert.equal(rows.length, 2);
        const chunkCount = mode === 'stream-full' ? 2 : 1;
        const calls = 1 + 2 + chunkCount * (nested ? 2 : 1);
        assert.equal(driver.calls - start, calls, 'actual aggregate and relation SQL must execute even with logs off');
        for (const row of rows) {
          // Narrow the public union at its known query boundary, not generated implementation state.
          const order = nested ? E.payment(row as Payment).customerOrder().eval() : row as Order;
          assert(order);
          assert(ids.includes(E.customerOrder(order).id().eval()!));
          assert.equal(relatedCount(order, alias), 1);
          assert.equal(E.customerOrder(order).orderItemList().size().eval(), 2);
        }
        if (logging) {
          const entries = evidence.snapshot();
          assert.equal(entries.length, calls);
          assert(!JSON.stringify(entries).includes(secret));
          assert(entries.every(entry => entry.tracePath[0].name === (nested ? 'Payment' : 'CustomerOrder')));
          const aggregate = entries.filter(entry => /COUNT\(/i.test(entry.parameterizedSQL));
          assert.equal(aggregate.length, chunkCount);
          for (const entry of aggregate) {
            assert.deepEqual(entry.tracePath.filter(frame => frame.kind === 'relation').map(frame => frame.name),
              nested ? ['customerOrder', 'orderItemList'] : ['orderItemList']);
          }
        }
        console.log(`AGGREGATE_OBSERVED ${JSON.stringify({nested, mode, logging, rows: rows.length, calls})}`);
      }
    }
    client.setQueryLoggingEnabled(true);
    const loaded = await Q.customerOrders().withIdIs(ids[0]).countOrderItemsAs(alias)
      .selectOrderItemListWith(Q.orderItems().limit(2)).limit(1)
      .comment('load graph with a computed projection').purpose('verify aggregate is not mutation data').executeForList(context);
    assert.equal(relatedCount(loaded[0], alias), 2);
    evidence.enableAll();
    await loaded[0].updateDescription(`saved-${group}`).auditAs('update aggregate-loaded graph').save(context);
    const writes = evidence.snapshot().filter(entry => entry.operation === 'update');
    assert.equal(writes.length, 1, 'unchanged children and count projection are not mutations');
    assert(!writes[0].parameterizedSQL.includes(alias));
    const reloaded = await Q.customerOrders().withIdIs(ids[0]).countOrderItemsAs(alias).limit(1)
      .comment('recheck saved graph').purpose('verify computed count survives ordinary save').executeForList(context);
    assert.equal(E.customerOrder(reloaded[0]).description().eval(), `saved-${group}`);
    assert.equal(relatedCount(reloaded[0], alias), 2);
    evidence.enableAll();
    const failure = new Error('generated aggregate failure');
    driver.aggregateFailure = failure;
    await assert.rejects(collect(Q.customerOrders().withIdIn(...ids).countOrderItemsAs(alias).limit(2)
      .comment('reject incomplete aggregate rows').purpose('verify failed stream provenance').executeForStream(context, 1)),
      error => error === failure);
    assert.deepEqual(evidence.snapshot().map(entry => entry.executionOutcome), ['failure', 'failure']);
    driver.aggregateFailure = undefined;
    assert.equal(manifest('lib'), before, 'generated library must remain unchanged');
    console.log('PASS TypeScript generated relation aggregates: 12 combinations, audited save and stream failure');
  } finally { await client.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
