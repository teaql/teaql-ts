#!/usr/bin/env node
"use strict";
// Run after npm ci at the runtime root. No remote TeaQL package is substituted.
const fs = require("node:fs"), path = require("node:path"), os = require("node:os"), cp = require("node:child_process"), crypto = require("node:crypto"), assert = require("node:assert/strict");
const example = __dirname, repo = path.resolve(example, "../..");
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
function fingerprint() {
  const manifest = JSON.parse(fs.readFileSync(path.join(example, "fixture-manifest.json")));
  assert.equal(manifest.language, "typescript"); assert.equal(manifest.evaluationErrors, 0);
  assert.equal(sha(fs.readFileSync(path.join(example, "model.xml"))), manifest.modelSha256);
  const actual = [];
  function visit(directory, prefix = "") {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const name = path.join(prefix, entry.name), original = path.join(directory, entry.name);
      assert(!entry.isSymbolicLink(), "generated fixture cannot be a symlink");
      if (entry.isDirectory()) visit(original, name); else { assert(entry.isFile()); actual.push(name); }
    }
  }
  visit(path.join(example, "generated"));
  assert.deepEqual(actual.sort(), Object.keys(manifest.files).sort());
  for (const [name, expected] of Object.entries(manifest.files)) assert.equal(sha(fs.readFileSync(path.join(example, "generated", name))), expected, name);
  return manifest;
}
const requested = process.env.TEAQL_FIX_E_EVIDENCE_DIR;
const evidence = requested ? path.resolve(requested) : fs.mkdtempSync(path.join(os.tmpdir(), "teaql-ts-fix-e-evidence-"));
if (requested) { assert(path.isAbsolute(requested) && !fs.existsSync(evidence)); fs.mkdirSync(evidence, {recursive: true}); }
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "teaql-ts-fix-e-build-"));
const report = {schema: "teaql.typescript-fix-e-example/v1", passed: false, rounds: [], sameDatabase: true,
  runtimeSource: path.join(repo, "src"), databaseRetained: true};
const {createOwnedRunner, ownedBytes} = require('./owned-command.cjs'), runner = createOwnedRunner();
async function main() {
try {
  const manifest = fingerprint(); report.modelSha256 = manifest.modelSha256;
  report.contextRootApplicationSha256 = sha(fs.readFileSync(path.join(example, 'context-root-probe.ts')));
  assert(fs.existsSync(path.join(repo, "node_modules/jest/bin/jest.js")), "run npm ci at the runtime root first");
  const tsconfig = path.join(scratch, "tsconfig.json"), config = path.join(scratch, "jest.cjs");
  fs.writeFileSync(tsconfig, JSON.stringify({extends: path.join(repo, "tsconfig.json"), compilerOptions: {
    baseUrl: repo, paths: {"teaql-ts": [path.join(repo, "src/index.ts")], "teaql-ts/*": [path.join(repo, "src/*")],
      "generated/*": [path.join(example, "generated/src/*")]}}}));
  fs.writeFileSync(config, "module.exports = " + JSON.stringify({rootDir: repo, roots: [example], testEnvironment: "node",
    testMatch: ["**/examples/fix-e-alignment/verify.test.ts"],
    moduleNameMapper: {"^teaql-ts$": path.join(repo, "src/index.ts"), "^teaql-ts/(.*)$": path.join(repo, "src/$1"),
      "^generated/(.*)$": path.join(example, "generated/src/$1")},
    transform: {"^.+\\.tsx?$": ["ts-jest", {tsconfig}]}}) + ";\n");
  for (const round of [1, 2]) {
    const command = [path.join(repo, "node_modules/jest/bin/jest.js"), "--config", config,
      "--runInBand", "--cacheDirectory", path.join(scratch, "jest")];
    const log = path.join(evidence, "round-" + round + ".log"), fd = fs.openSync(log, "w");
    let result;
    try { result = await runner.run([process.execPath, ...command], {cwd: repo, timeout: 120000,
      env: {...process.env, TEAQL_FIX_E_DB: path.join(evidence, "fixture.sqlite")}, stdio: ["ignore", fd, fd]}); }
    finally { fs.closeSync(fd); }
    report.rounds.push({command, exitCode: result.status, signal: result.signal, logSha256: sha(fs.readFileSync(log))});
    if (result.status !== 0) process.exitCode = result.status || 1;
    assert.equal(result.status, 0, fs.readFileSync(log, "utf8").slice(-12000));
    const lines = fs.readFileSync(log, "utf8").split(/\r?\n/);
    for (const marker of ["FIX_E_EXAMPLE=", "CORE_LOAD_EXAMPLE=", "CORE_MUTATION_OWNERSHIP=", "CORE_MUTATION_PAGING=", "CORE_CHECKER_METADATA=", "CORE_FILE_CHECKER_METADATA=", "CORE_TS_E_BOUNDARY_RESULT=", "CORE_TS_ROOT_RESULT=", "CORE_TS_ROOT_FILE_RESULT="]) {
      const values = lines.filter(line => line.startsWith(marker)).map(line => JSON.parse(line.slice(marker.length)));
      assert.equal(values.length, 1, marker); assert.equal(values[0].passed, true, marker);
    }
    assert.deepEqual(fingerprint(), manifest);
  }
  report.databaseSha256 = sha(fs.readFileSync(path.join(evidence, "fixture.sqlite")));
  report.contextRootDatabase = {file: 'fixture.sqlite.context-root.sqlite',
    sha256: sha(fs.readFileSync(path.join(evidence, 'fixture.sqlite.context-root.sqlite')))};
  report.contextRootFile = {file: 'fixture.sqlite.context-root.json',
    sha256: sha(fs.readFileSync(path.join(evidence, 'fixture.sqlite.context-root.json')))};
  report.passed = true;
  console.log("PASS TypeScript retained Fix/E/loading/ownership example twice on one database");
} catch (error) { console.error(error.stack); process.exitCode ||= 1; }
finally {
  // spawnSync has reaped the only owned child before cache/config cleanup.
  report.disposedOwnedBytes = runner.safeToClean ? ownedBytes(scratch) : 0;
  if (runner.safeToClean) fs.rmSync(scratch, {recursive: true});
  else report.unsafeBuildRetention = {path: scratch, processGroup: runner.unsafeGroup};
  report.scratchRemoved = !fs.existsSync(scratch); runner.dispose();
  fs.writeFileSync(path.join(evidence, "receipt.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("Retained compact example evidence: " + evidence);
}
}
main().catch(error => { console.error(error.stack); process.exitCode ||= 1; });
