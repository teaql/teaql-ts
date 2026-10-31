#!/usr/bin/env node
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const {createOwnedRunner, ownedBytes} = require('../fix-e-alignment/owned-command.cjs');
const repo = path.resolve(__dirname, '../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function fingerprint() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-manifest.json')));
  assert.equal(manifest.schema, 'teaql.generated-example-fixture/v1'); assert.equal(manifest.language, 'typescript'); assert.equal(manifest.evaluationErrors, 0);
  assert.equal(sha(fs.readFileSync(path.join(__dirname, 'model.xml'))), manifest.modelSha256);
  const actual = [];
  function walk(dir, prefix = '') { for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    assert(!entry.isSymbolicLink()); const file = path.join(dir, entry.name), relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) walk(file, relative); else { assert(entry.isFile()); actual.push(relative); }
  }}
  walk(path.join(__dirname, 'generated')); assert.deepEqual(actual.sort(), Object.keys(manifest.files).sort());
  for (const [file, expected] of Object.entries(manifest.files)) assert.equal(sha(fs.readFileSync(path.join(__dirname, 'generated', file))), expected, file);
  return manifest;
}
async function main() {
  const requested = process.env.TEAQL_SCALAR_EVIDENCE_DIR;
  const evidence = requested ? path.resolve(requested) : fs.mkdtempSync(path.join(os.tmpdir(), 'teaql-ts-scalar-evidence-'));
  if (requested) {assert(path.isAbsolute(requested) && !fs.existsSync(evidence)); fs.mkdirSync(evidence, {recursive: true});}
  const report = {schema: 'teaql.typescript-scalar-example/v1', passed: false, rounds: [], sameDatabase: true, databaseRetained: true};
  let scratch, runner;
  try {
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'teaql-ts-scalar-build-')); runner = createOwnedRunner();
    const manifest = fingerprint(); report.modelSha256 = manifest.modelSha256;
    const tsconfig = path.join(scratch, 'tsconfig.json'), config = path.join(scratch, 'jest.cjs');
    fs.writeFileSync(tsconfig, JSON.stringify({extends: path.join(repo, 'tsconfig.json'), compilerOptions: {baseUrl: repo,
      paths: {'teaql-ts': [path.join(repo, 'src/index.ts')], 'teaql-ts/*': [path.join(repo, 'src/*')],
        'scalar-lib/*': [path.join(__dirname, 'generated/src/*')]}}}));
    fs.writeFileSync(config, 'module.exports = ' + JSON.stringify({rootDir: repo, roots: [__dirname], testEnvironment: 'node',
      testMatch: ['**/examples/scalar-type-probe/*.test.ts'], moduleNameMapper: {'^teaql-ts$': path.join(repo, 'src/index.ts'),
        '^teaql-ts/(.*)$': path.join(repo, 'src/$1'), '^scalar-lib/(.*)$': path.join(__dirname, 'generated/src/$1')},
      transform: {'^.+\\.tsx?$': ['ts-jest', {tsconfig}]}}) + ';\n');
    for (const round of [1, 2]) {
      const command = [process.execPath, path.join(repo, 'node_modules/jest/bin/jest.js'), '--config', config,
        '--runInBand', '--cacheDirectory', path.join(scratch, 'jest')];
      const log = path.join(evidence, `round-${round}.log`), fd = fs.openSync(log, 'wx'); let result;
      try {result = await runner.run(command, {cwd: repo, timeout: 120000,
        env: {...process.env, TEAQL_FULL_SCALAR_DB: path.join(evidence, 'fixture.sqlite'), TEAQL_INTEGER32_ROUND: String(round)}, stdio: ['ignore', fd, fd]});}
      finally {fs.closeSync(fd);}
      const bytes = fs.readFileSync(log), text = bytes.toString();
      report.rounds.push({command, exitCode: result.status, signal: result.signal, logSha256: sha(bytes)});
      assert.equal(result.status, 0, text.slice(-16000));
      for (const prefix of ['CORE_SCALAR_WIRE=', 'CORE_SCALAR_RESTORATION=']) {
        const records = text.split(/\r?\n/).filter(line => line.startsWith(prefix)).map(line => JSON.parse(line.slice(prefix.length)));
        assert.equal(records.length, 1, prefix); assert.equal(records[0].passed, true);
      }
      const rejected = text.split(/\r?\n/).filter(line => line.startsWith('CORE_NONFINITE_REJECTED=')); assert.equal(rejected.length, 6);
      const width=text.split(/\r?\n/).filter(line=>line.startsWith('TYPESCRIPT_INTEGER32=')).map(line=>JSON.parse(line.slice('TYPESCRIPT_INTEGER32='.length)));
      assert.equal(width.length,2);assert.deepEqual(width.map(r=>r.backend).sort(),['file','sqlite']);
      for(const r of width){assert.equal(r.round,round);assert.equal(r.passed,true);assert.equal(r.cases.length,55);assert(r.cases.every(c=>c.passed));assert.equal(r.legacy.length,8);}
      assert.deepEqual(fingerprint(), manifest);
    }
    report.databaseSha256 = sha(fs.readFileSync(path.join(evidence, 'fixture.sqlite'))); report.passed = true;
    console.log('PASS TypeScript generated scalar Q/E/JSON/restoration: twice on one database');
  } catch (error) {console.error(error.stack); process.exitCode ||= 1;}
  finally {
    const safe = !runner || runner.safeToClean;
    report.disposedOwnedBytes = scratch && safe ? ownedBytes(scratch) : 0;
    if (scratch && safe) fs.rmSync(scratch, {recursive: true});
    if (!safe) report.unsafeBuildRetention = {path: scratch, processGroup: runner.unsafeGroup};
    report.scratchRemoved = !scratch || !fs.existsSync(scratch); runner?.dispose();
    fs.writeFileSync(path.join(evidence, 'receipt.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('Retained compact scalar evidence: ' + evidence);
  }
}
main().catch(error => {console.error(error.stack); process.exitCode ||= 1;});
