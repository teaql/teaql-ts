import {spawnSync} from 'node:child_process';
import path from 'node:path';

describe('Node SQLite native automatic-GC regression', () => {
  test.each([1, 2])('allocation-driven collection completes in a real child process: %i', () => {
    const result = spawnSync(process.execPath, ['--max-old-space-size=64',
      path.resolve(__dirname, '../scripts/sqlite-native-gc-control.cjs')], {
      encoding: 'utf8', timeout: 30000,
      env: {...process.env, NODE_OPTIONS: '', NODE_PATH: ''},
    });
    const diagnostic = (result.stdout || '') + (result.stderr || '');
    expect(result.error).toBeUndefined();
    expect({status: result.status, signal: result.signal, diagnostic}).toEqual({
      status: 0, signal: null, diagnostic: expect.any(String),
    });
    const start = JSON.parse(result.stdout.match(/^SQLITE_NATIVE_GC_START=(.+)$/m)?.[1] || 'null');
    expect(start).toMatchObject({version: expect.stringMatching(/^13\./), binding: [expect.stringMatching(/better-sqlite3\/.*\.node$/)]});
    expect(result.stdout).toMatch(/^SQLITE_NATIVE_GC_COMPLETE=300000$/m);
    expect(result.stderr).not.toContain('RemoveEnvironmentCleanupHook');
  });
});
