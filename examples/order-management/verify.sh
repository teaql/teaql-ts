#!/usr/bin/env bash
set -euo pipefail
example="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$example/../.." && pwd)"
if [[ -n "${TEAQL_ORDER_EVIDENCE_DIR:-}" ]]; then
  evidence="$TEAQL_ORDER_EVIDENCE_DIR"
  mkdir "$evidence"
else
  evidence="$(mktemp -d -t teaql-ts-order-evidence.XXXXXXXX)"
fi
scratch="$(mktemp -d -t teaql-ts-order-scratch.XXXXXXXX)"
trap 'status=$?; trap - EXIT; rm -rf -- "$scratch"; exit "$status"' EXIT
# Keep the runtime log out of the source tree covered by fingerprint().
export TEAQL_LOG_ENDPOINT="$evidence/runtime.log"
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
const library = fs.realpathSync(require.resolve('order-management-service-lib/package.json', {paths: [path.join(example, roots[0])]}));
assert.equal(library, fs.realpathSync(path.join(example, roots[1], 'package.json')));
console.log(JSON.stringify({runtime: origins, domainLibrary: library}, null, 2));
JS
for round in 1 2; do
  (cd "$example" && TEAQL_ORDER_MANAGEMENT_DB="$evidence/order.sqlite" npm start) > "$evidence/run-$round.log" 2>&1
done
fingerprint > "$evidence/source-after.sha256"
cmp "$evidence/source-before.sha256" "$evidence/source-after.sha256"
python3 -B - "$evidence" <<'PY'
import datetime, decimal, hashlib, json, pathlib, re, sqlite3, sys
root = pathlib.Path(sys.argv[1])
audits = []
for round in [1, 2]:
    log = (root / f'run-{round}.log').read_text()
    assert '[query] matched 1 order(s)' in log and 'WEB-2026-001  2026-08-12  129.95' in log
    if round == 2:
        assert 'no duplicate rows added' in log
    trace = re.findall(r'\[trace\] (\d+) SQL statements captured; (\d+) mutations audited', log)
    assert len(trace) == 1 and int(trace[0][0]) > 0, trace
    audits.append(int(trace[0][1]))
assert audits[0] > 0 and audits[1] == 0, audits
database = root / 'order.sqlite'
with sqlite3.connect(database.resolve().as_uri() + '?mode=ro&immutable=1', uri=True) as connection:
    rows = connection.execute('SELECT order_number,order_date,total_amount,version FROM customer_order_data').fetchall()
    assert len(rows) == 1 and rows[0][0] == 'WEB-2026-001', rows
    assert datetime.date.fromisoformat(str(rows[0][1])[:10]) == datetime.date(2026, 8, 12)
    assert decimal.Decimal(str(rows[0][2])) == decimal.Decimal('129.95') and rows[0][3] == 1
    presets = connection.execute('SELECT request_id,version FROM order_search_preset_data').fetchall()
    assert presets == [('quick-start-pending-orders', 1)], presets
    assert connection.execute('SELECT count(*) FROM customer_data').fetchone() == (1,)
    assert connection.execute('PRAGMA quick_check').fetchone() == ('ok',)
receipt = dict(schema='teaql.typescript-order-business/v1', passed=True,
    nativeWorkspaceEntryUsed=True, sameTerminalDatabase=True, terminalRuns=2,
    packageOrigins=json.loads((root / 'origins.json').read_text()), reportedMutationAudits=audits,
    generatedScopesUnchanged=True, orders=rows, presets=presets,
    databaseSHA256=hashlib.sha256(database.read_bytes()).hexdigest())
(root / 'business-receipt.json').write_text(json.dumps(receipt, indent=2, sort_keys=True) + '\n')
print(json.dumps(dict(passed=True, terminalRuns=2, reportedMutationAudits=audits)))
PY
