'use strict';
// Run in its own process: native SIGABRT must become a failed regression test,
// not terminate Jest or be hidden by an explicit global.gc() control.
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const {version} = require('better-sqlite3/package.json');
const database = new Database(':memory:');
process.stdout.write('SQLITE_NATIVE_GC_START=' + JSON.stringify({
  node: process.version, version, binding: Object.keys(require.cache).filter(p => p.endsWith('.node')),
}) + '\n');
try {
  let live = [];
  for (let i = 0; i < 300000; i++) {
    assert.equal(database.prepare('SELECT ? AS value').get(i).value, i);
    live.push({i, padding: String(i).repeat(16)});
    if (live.length === 1000) live = [];
  }
} finally { database.close(); }
process.stdout.write('SQLITE_NATIVE_GC_COMPLETE=300000\n');
