#!/usr/bin/env bash
set -euo pipefail
example="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$example/../.." && pwd)"
if [[ -n "${TEAQL_FACET_EVIDENCE_DIR:-}" ]]; then
  evidence="$TEAQL_FACET_EVIDENCE_DIR"
  mkdir "$evidence"
else
  evidence="$(mktemp -d -t teaql-ts-facet-evidence.XXXXXXXX)"
fi
scratch="$(mktemp -d -t teaql-ts-facet-scratch.XXXXXXXX)"
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
const library = fs.realpathSync(require.resolve('school-management-service-lib/package.json', {paths: [path.join(example, roots[0])]}));
assert.equal(library, fs.realpathSync(path.join(example, roots[1], 'package.json')));
console.log(JSON.stringify({runtime: origins, domainLibrary: library}, null, 2));
JS
export TEAQL_FACET_TRACE_DB="$evidence/school.sqlite"
unset TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS
for round in 1 2; do
 (cd "$example" && timeout --kill-after=5s 120s npm start) > "$evidence/run-$round.log" 2>&1
 [[ "$(rg -c '^FACET_OBSERVED ' "$evidence/run-$round.log")" == 48 ]]
 rg -Fq 'TypeScript generated Facet acceptance passed: 48 scenarios' "$evidence/run-$round.log"
done
fingerprint > "$evidence/source-after.sha256"
cmp "$evidence/source-before.sha256" "$evidence/source-after.sha256"
python3 -B - "$evidence" <<'CHECK'
import hashlib,json,pathlib,sqlite3,sys
root=pathlib.Path(sys.argv[1]);database=root/'school.sqlite'
with sqlite3.connect(database.resolve().as_uri()+'?mode=ro&immutable=1',uri=True) as connection:
 rows=connection.execute('SELECT name,version FROM school_data ORDER BY name').fetchall()
 assert rows==[('FACET-PRIVATE-SCHOOL',1),('FACET-PRIVATE-SCHOOL-B',1)],rows
 assert connection.execute('SELECT count(*) FROM platform_data').fetchone()==(1,)
 assert connection.execute('SELECT count(*) FROM school_type_data').fetchone()==(2,)
 assert connection.execute('PRAGMA quick_check').fetchone()==('ok',)
receipt=dict(schema='teaql.typescript-facet-business/v1',passed=True,scenariosPerRun=48,runs=2,sameDatabase=True,
 generatedScopesUnchanged=True,originalBusinessAssertionsRetained=True,nativeWorkspaceEntryUsed=True,
 packageOrigins=json.loads((root/'origins.json').read_text()),schools=rows,databaseSHA256=hashlib.sha256(database.read_bytes()).hexdigest())
(root/'business-receipt.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
print(json.dumps(dict(passed=True,scenariosPerRun=48,runs=2)))
CHECK
