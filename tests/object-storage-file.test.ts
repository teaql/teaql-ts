import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { UserContext } from '../src/core/context';
import { ObjectKey, ObjectPutOptions, ObjectReadUrlOptions } from '../src/core/object-storage';
import { FileObjectStorage } from '../src/object-storage/file';

test('file provider commits exact bytes and serves authenticated HTTP GET, HEAD and Range', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-file-store-'));
  const provider = new FileObjectStorage(root, randomBytes(32));
  const key = new ObjectKey('objects/PRIVATE-FILE-KEY-CANARY');
  const bytes = Buffer.from('%PDF-1.7\nTeaQL document\n%%EOF');
  const storage = new UserContext().withObjectStorage(provider)
    .withObjectStorageObserver(() => {}).objectStorage('verify file provider');
  try {
    await provider.start();
    const put = await storage.putBytes(key, bytes,
      new ObjectPutOptions(bytes.length, 'create_only', 'application/pdf'));
    expect(put.size).toBe(bytes.length);
    expect((await storage.head(key))?.etag).toMatch(/^[0-9a-f]{64}\.[0-9a-f-]{36}$/);
    expect(Buffer.from(await storage.getBytes(key, bytes.length))).toEqual(bytes);
    await expect(storage.putBytes(key, bytes,
      new ObjectPutOptions(bytes.length, 'create_only', 'application/pdf')))
      .rejects.toMatchObject({ code: 'Conflict' });
    await expect(storage.putBytes(key, bytes.subarray(0, 2),
      new ObjectPutOptions(bytes.length, 'replace', 'application/pdf')))
      .rejects.toMatchObject({ code: 'InvalidInput' });
    expect(Buffer.from(await storage.getBytes(key, bytes.length))).toEqual(bytes);

    const signed = await storage.getReadUrl(key, new ObjectReadUrlOptions(2, 'attachment', 'asset.pdf'));
    expect(signed.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/objects\//);
    expect(signed.url).not.toContain(key.value);
    const fetched = await fetch(signed.url);
    expect(fetched.status).toBe(200);
    expect(fetched.headers.get('content-type')).toBe('application/pdf');
    expect(fetched.headers.get('content-disposition')).toBe('attachment; filename="asset.pdf"');
    expect(fetched.headers.get('cache-control')).toBe('private, no-store');
    expect(Buffer.from(await fetched.arrayBuffer())).toEqual(bytes);

    const head = await fetch(signed.url, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('content-length')).toBe(String(bytes.length));
    expect((await head.arrayBuffer()).byteLength).toBe(0);
    const range = await fetch(signed.url, { headers: { Range: 'bytes=0-3' } });
    expect(range.status).toBe(206);
    expect(range.headers.get('content-range')).toBe(`bytes 0-3/${bytes.length}`);
    expect(Buffer.from(await range.arrayBuffer())).toEqual(bytes.subarray(0, 4));
    const suffix = await fetch(signed.url, { headers: { Range: 'bytes=-3' } });
    expect(suffix.status).toBe(206);
    expect(Buffer.from(await suffix.arrayBuffer())).toEqual(bytes.subarray(-3));
    const invalid = await fetch(signed.url, { headers: { Range: 'bytes=999-' } });
    expect(invalid.status).toBe(416);

    const tampered = signed.url.slice(0, -1) + (signed.url.endsWith('A') ? 'B' : 'A');
    expect((await fetch(tampered)).status).toBe(404);
    const replacement = Buffer.from('next version');
    await storage.putBytes(key, replacement,
      new ObjectPutOptions(replacement.length, 'replace', 'application/pdf'));
    expect((await fetch(signed.url)).status).toBe(404);
    expect(Buffer.from(await storage.getBytes(key, replacement.length))).toEqual(replacement);

    const short = await storage.getReadUrl(key, new ObjectReadUrlOptions(1));
    await delay(1100);
    expect((await fetch(short.url)).status).toBe(404);
    await storage.delete(key);
    expect(await storage.head(key)).toBeUndefined();
    await expect(storage.getBytes(key, 1024)).rejects.toMatchObject({ code: 'NotFound' });
  } finally {
    await provider.close();
    await rm(root, { recursive: true, force: true });
  }
});
