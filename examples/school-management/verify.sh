#!/usr/bin/env bash
set -euo pipefail
example="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$example/../.." && pwd)"
app="$example/typescript-app-console"
if [[ -n "${TEAQL_SCHOOL_EVIDENCE_DIR:-}" ]]; then
  evidence="$TEAQL_SCHOOL_EVIDENCE_DIR"
  mkdir "$evidence"
else
  evidence="$(mktemp -d -t teaql-ts-school-evidence.XXXXXXXX)"
fi
scratch="$(mktemp -d -t teaql-ts-school-build.XXXXXXXX)"
trap 'status=$?; trap - EXIT; rm -rf -- "$scratch"; exit "$status"' EXIT
fingerprint() {
  (cd "$example" && find typescript-lib-core typescript-app-console -type f \
    ! -path '*/node_modules/*' ! -path '*/.local/*' -print0 | sort -z | xargs -0 sha256sum)
}
fingerprint > "$evidence/source-before.sha256"
(cd "$repo" && npm run build) > "$evidence/runtime-build.log" 2>&1
(cd "$app" && npm ci && npm run build) > "$evidence/workspace-build.log" 2>&1
[[ "$(realpath "$app/node_modules/teaql-ts")" == "$(realpath "$repo")" ]]
TEAQL_FILE_BOOTSTRAP_OUTPUT="$evidence/file-bootstrap" \
  node "$example/verify-file-bootstrap.cjs" > "$evidence/file-bootstrap.log" 2>&1
mkdir "$scratch/application"
(cd "$scratch/application" && node "$app/node_modules/ts-node/dist/bin.js" \
  --project "$app/tsconfig.json" "$app/src/main.ts") > "$evidence/application.log" 2>&1
cp "$scratch/application/.local/school.sqlite" "$evidence/showcase.sqlite"
fingerprint > "$evidence/source-after.sha256"
cmp "$evidence/source-before.sha256" "$evidence/source-after.sha256"
python3 -B - "$evidence" <<'PY'
import hashlib, json, pathlib, sqlite3, sys
root = pathlib.Path(sys.argv[1])
file_result = json.loads((root / 'file-bootstrap/receipt.json').read_text())
assert file_result['passed'] and file_result['sameStores']
assert len(file_result['rounds']) == 2 and file_result['cleanup']['scratchRemoved']
text = (root / 'application.log').read_text()
for expected in ['PASS TypeScript generated School request-intent gates',
    'PASS TypeScript generated School dynamic search:',
    'PASS TypeScript School Management: bootstrap, portable Query parity, relations, and Update']:
    assert expected in text, expected
database = root / 'showcase.sqlite'
with sqlite3.connect(database.resolve().as_uri() + '?mode=ro&immutable=1', uri=True) as connection:
    assert connection.execute('PRAGMA quick_check').fetchone() == ('ok',)
    tables = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    candidates = []
    for table in tables:
        quoted = '"' + table.replace('"', '""') + '"'
        columns = {row[1] for row in connection.execute('PRAGMA table_info(' + quoted + ')')}
        if {'name', 'version', 'student_capacity'}.issubset(columns):
            candidates.append(table)
    assert len(candidates) == 1, candidates
    quoted = '"' + candidates[0].replace('"', '""') + '"'
    rows = connection.execute('SELECT name,version,student_capacity FROM ' + quoted).fetchall()
    assert rows == [('Riverside Primary School — verified', 2, 800)], rows
receipt = dict(schema='teaql.typescript-school-business/v1', passed=True,
    originalApplicationAssertionsPassed=True, fileProviderScenarios=6, fileProviderRounds=2,
    sameFileProviderStores=True, runtimeOrigin='current source checkout',
    generatedScopesUnchanged=True, sqliteTable=candidates[0], sqliteRows=rows,
    databaseSHA256=hashlib.sha256(database.read_bytes()).hexdigest())
(root / 'business-receipt.json').write_text(json.dumps(receipt, indent=2, sort_keys=True) + '\n')
print(json.dumps(dict(passed=True, fileProviderScenarios=6, fileProviderRounds=2)))
PY
