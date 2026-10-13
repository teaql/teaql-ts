import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UserContext } from 'teaql-ts';
import { SQLiteTeaQLClient } from 'teaql-ts/sql/sqlite';
import { SQLExecutionEvidenceStore } from 'teaql-ts/sql/core';
import { Q } from './lib/src/generated/Q';
import { E } from './lib/src/generated/E';
import { GENERATED_RUNTIME_MODULE } from './lib/src/runtime-module';

async function main(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), 'teaql-standard-telemetry-'));
  // No OpenTelemetry imports, SDK initialization or per-query instrumentation.
  const client = new SQLiteTeaQLClient(join(directory, 'startup.sqlite'), GENERATED_RUNTIME_MODULE.schemas)
    .install(GENERATED_RUNTIME_MODULE);
  const context = new UserContext().insertResource('dataService', client);
  const evidence = new SQLExecutionEvidenceStore();
  let committedAudits = 0;
  client.setRuntimeTelemetrySink(evidence).setAuditSink(() => { committedAudits++; });
  try {
    await context.ensureSchema();
    assert.equal(committedAudits, 1, 'the fresh generated root must be seeded through audited mutation');
    await context.ensureSchema();
    assert.equal(committedAudits, 1, 'repeated startup must not repeat the root mutation');
    for (let run = 0; run < 2; run++) {
      const roots = await Q.platforms().withIdIs('1').limit(1)
        .comment('inspect seeded root').purpose('verify standard telemetry startup').executeForList(context);
      assert.equal(roots.length, 1);
      assert.equal(E.platform(roots[0]).id().eval(), '1');
    }
    assert.equal(evidence.snapshot().length, 6, 'seed lookup/write/readback, repeat lookup and two bounded Q requests');
    assert(evidence.snapshot().every(entry => entry.logMode === 'masked'));
    await client.flushTelemetry();
    const sdkModules = Object.keys(require.cache).filter(file =>
      /node_modules\/@opentelemetry\/(sdk-|exporter-|context-async-hooks)/.test(file));
    if (process.env.TEAQL_TELEMETRY_ENABLED !== 'true') {
      assert.equal(sdkModules.length, 0, 'disabled startup must not even load the SDK/exporters');
    } else assert(sdkModules.length > 0, 'enabled startup must load the standard SDK module');
    console.log('STANDARD_TELEMETRY_EXAMPLE ' + JSON.stringify({
      enabled: process.env.TEAQL_TELEMETRY_ENABLED === 'true',
      sqlExecutions: evidence.snapshot().length, seedAudits: committedAudits,
      repeatedSeedWrites: 0, generatedQandE: true, sdkInitializationInApplication: false,
      sdkModulesLoaded: sdkModules.length,
    }));
    console.log('PASS TypeScript standard telemetry: startup, audited seed, repeated seed, generated Q/E and safe SQL');
  } finally { await client.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
