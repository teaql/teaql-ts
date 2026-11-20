#!/usr/bin/env bash
set -euo pipefail
example="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$example/../.." && pwd)"
if [[ -n "${TEAQL_CONFORMANCE_EVIDENCE_DIR:-}" ]]; then
  evidence="$TEAQL_CONFORMANCE_EVIDENCE_DIR"
  mkdir "$evidence"
else
  evidence="$(mktemp -d -t teaql-ts-work-item-evidence.XXXXXXXX)"
fi
scratch="$(mktemp -d -t teaql-ts-work-item-scratch.XXXXXXXX)"
trap 'status=$?; trap - EXIT; rm -rf -- "$scratch"; exit "$status"' EXIT
fingerprint() {
  (cd "$example" && find typescript-node-lib-core typescript-app-console -type f \
    ! -path '*/node_modules/*' ! -path '*/.local/*' -print0 | sort -z | xargs -0 sha256sum)
  sha256sum "$example/package.json" "$example/package-lock.json"
}
fingerprint > "$evidence/source-before.sha256"
(cd "$repo" && npm run build) > "$evidence/runtime-build.log" 2>&1
(cd "$example" && npm ci && npm run build) > "$evidence/workspace-build.log" 2>&1
node - "$example" "$repo" <<'JS' > "$evidence/origins.json"
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const [example, runtime] = process.argv.slice(2), roots = ['typescript-app-console', 'typescript-node-lib-core'];
const origins = {};
for (const name of roots) {
  const resolved = fs.realpathSync(require.resolve('teaql-ts', {paths: [path.join(example, name)]}));
  assert.equal(resolved, fs.realpathSync(path.join(runtime, 'dist/index.js')));
  origins[name] = resolved;
}
const library = fs.realpathSync(require.resolve('runtime-example-conformance-service-lib/package.json', {paths: [path.join(example, roots[0])]}));
assert.equal(library, fs.realpathSync(path.join(example, roots[1], 'package.json')));
console.log(JSON.stringify({runtime: origins, domainLibrary: library}, null, 2));
JS
export TEAQL_CONFORMANCE_DB="$evidence/work-items.sqlite"
for round in 1 2; do
 (cd "$example" && npm start) > "$evidence/run-$round.log" 2>&1
 rg -Fq 'PASS TypeScript minimum runtime conformance: 8/8' "$evidence/run-$round.log"
 rg -Fq 'TYPESCRIPT_OPERATIONAL_CLOCK_EXAMPLE=' "$evidence/run-$round.log"
done
TEAQL_MANAGED_EVIDENCE_DIR="$evidence/managed" node "$example/verify-managed.cjs" > "$evidence/managed.log" 2>&1
fingerprint > "$evidence/source-after.sha256"
cmp "$evidence/source-before.sha256" "$evidence/source-after.sha256"
python3 -B - "$evidence" <<'CHECK'
import hashlib,json,pathlib,sqlite3,sys
root=pathlib.Path(sys.argv[1]);managed=json.loads((root/'managed/report.json').read_text())
assert managed['passed'] and managed['sameDatabase'] and len(managed['rounds'])==2
assert all(row['passed']==14 and row['exitCode']==0 for row in managed['rounds'])
database=root/'work-items.sqlite'
with sqlite3.connect(database.resolve().as_uri()+'?mode=ro&immutable=1',uri=True) as connection:
 rows=connection.execute('SELECT title,version FROM work_item_data ORDER BY id').fetchall();assert len(rows)==2 and all(row[1]==-3 for row in rows),rows
 assert connection.execute('PRAGMA quick_check').fetchone()==('ok',)
receipt=dict(schema='teaql.typescript-work-item-business/v1',passed=True,originalBusinessAssertionsRetained=True,
 starts=2,sameDatabase=True,databaseNeverReset=True,managedCasesPerRound=14,managedRounds=2,
 managedRoundsUseSameSeparateDatabase=True,nativeWorkspaceEntryUsed=True,generatedScopesUnchanged=True,
 packageOrigins=json.loads((root/'origins.json').read_text()),workItems=rows,
 managedReceiptSHA256=hashlib.sha256((root/'managed/report.json').read_bytes()).hexdigest(),
 databaseSHA256=hashlib.sha256(database.read_bytes()).hexdigest())
(root/'business-receipt.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
print(json.dumps(dict(passed=True,starts=2,managedCasesPerRound=14,managedRounds=2)))
CHECK
