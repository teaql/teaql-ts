import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { UserContext } from '../src/core/context';
import { ObjectKey, ObjectPutOptions, ObjectReadUrlOptions } from '../src/core/object-storage';
import { FileObjectStorage, SqliteFencedFileObjectStorage } from '../src/object-storage/file';

test('SQLite-fenced File deletion preserves same-byte replacement and waits across processes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'teaql-fenced-file-'));
  const secret = randomBytes(32);
  const writer = new SqliteFencedFileObjectStorage(root, secret);
  const collector = new SqliteFencedFileObjectStorage(root, secret);
  const write = new UserContext().withObjectStorage(writer).objectStorage('write fenced File');
  const collect = new UserContext().withObjectStorage(collector).objectStorage('collect fenced File');
  const key = new ObjectKey('objects/same-byte-generation');
  const bytes = Buffer.from('same bytes');
  try {
    const absent = new UserContext().withObjectStorage(
      new SqliteFencedFileObjectStorage(join(root, 'absent'), secret)).objectStorage('missing File root');
    expect(await absent.deleteIfVersion(key, 'absent')).toBe('already_missing');
    expect(collect.supportsVersionConditionalDelete()).toBe(true);
    expect(await collect.deleteIfVersion(key, 'absent')).toBe('already_missing');
    const old = await write.putBytes(key, bytes,
      new ObjectPutOptions(bytes.length, 'create_only', 'application/pdf'));
    const current = await write.putBytes(key, bytes,
      new ObjectPutOptions(bytes.length, 'replace', 'application/pdf'));
    expect(current.etag).not.toBe(old.etag);
    expect(await collect.deleteIfVersion(key, old.etag!)).toBe('version_mismatch');
    expect((await collect.head(key))?.etag).toBe(current.etag);

    // A separate Node process holds SQLite's OS-backed write lock while the
    // collector waits. Crash/exit releases the lock without stale lock files.
    const script = `const Database=require('better-sqlite3');
      const db=new Database(process.argv[1]); db.exec('BEGIN IMMEDIATE');
      process.stdout.write('READY\\n'); process.stdin.resume();
      process.stdin.on('end',()=>{db.exec('ROLLBACK');db.close();});`;
    const child = spawn(process.execPath, ['-e', script, join(root, 'manifest-lock.sqlite')],
      { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
    try {
      const [ready] = await Promise.race([
        once(child.stdout!, 'data'),
        once(child, 'exit').then(([code]) => { throw new Error(`lock holder exited before ready: ${code}`); }),
        delay(2000).then(() => { throw new Error('lock holder did not become ready'); }),
      ]);
      expect(String(ready)).toContain('READY');
      let finished = false;
      const deletion = collect.deleteIfVersion(key, current.etag!).then(result => {
        finished = true; return result;
      });
      await delay(100);
      expect(finished).toBe(false);
      child.stdin!.end();
      await once(child, 'exit');
      expect(await deletion).toBe('deleted');
    } finally { if (child.exitCode === null) child.kill(); }
    expect(await collect.deleteIfVersion(key, current.etag!)).toBe('already_missing');
    expect(await collect.head(key)).toBeUndefined();
    const hash = (await import('node:crypto')).createHash('sha256').update(key.value).digest('hex');
    await expect(stat(join(root, hash.slice(0, 2), hash,
      `data-${current.etag!.split('.')[1]}`))).rejects.toMatchObject({ code: 'ENOENT' });
  } finally { await rm(root, { recursive: true, force: true }); }
}, 20000);

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
