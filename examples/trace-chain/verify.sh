#!/usr/bin/env bash
set -euo pipefail
example="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$example/../.." && pwd)"
workspace="$example/typescript-app-console"
library="$example/typescript-lib-core"
example_evidence="${TEAQL_TRACE_CHAIN_EVIDENCE_DIRECTORY:-$(mktemp -d -t teaql-ts-trace.XXXXXXXX)}"
mkdir -p "$example_evidence"
example_evidence="$(cd "$example_evidence" && pwd)"
verify_scratch="$example_evidence"
unset TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS

if [[ "${1:-}" == '--standard' ]]; then
  mode="${2:?disabled or enabled}"
  case "$mode" in
    disabled) unset TEAQL_TELEMETRY_ENABLED TEAQL_TELEMETRY_SERVICE_NAME TEAQL_TELEMETRY_OTLP_ENDPOINT ;;
    enabled) [[ "${TEAQL_TELEMETRY_ENABLED:-}" == true ]] ;;
    *) exit 2 ;;
  esac
  cd "$workspace"
  for attempt in 1 2; do
    npm run test:standard-telemetry | tee "$example_evidence/telemetry-$attempt.log"
    npm run test:standard-telemetry-graph | tee "$example_evidence/graph-$attempt.log"
    TEAQL_STANDARD_RESPONSE_DB="$example_evidence/response.sqlite" \
      node "$example/node_modules/ts-node/dist/bin.js" standard-export-responses.ts | tee "$example_evidence/response-$attempt.log"
    rg -Fxq 'PASS TypeScript standard response graph: create, rollback, retry, update, delete, Q/E, committed audit' "$example_evidence/response-$attempt.log"
    rg -Fq "\"firstSeedAudits\":$((2-attempt)),\"repeatSeedAudits\":0" "$example_evidence/response-$attempt.log"
  done
  exit
fi

(cd "$repo" && npm run build) > "$example_evidence/runtime-build.log" 2>&1
(cd "$example" && npm ci && npm run build --workspace typescript-app-console) > "$example_evidence/workspace-build.log" 2>&1
node - "$workspace" "$library" "$repo" <<'JS' > "$example_evidence/package-origins.json"
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const [workspace, library, runtime] = process.argv.slice(2);
const resolved = Object.fromEntries([workspace, library].map(project => [
  path.basename(project), fs.realpathSync(require.resolve('teaql-ts', {paths: [project]})),
]));
assert.deepEqual(Object.values(resolved), [path.join(runtime, 'dist/index.js'), path.join(runtime, 'dist/index.js')]);
console.log(JSON.stringify(resolved, null, 2));
JS
(cd "$library" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$example_evidence/library-before.sha256"
export TEAQL_TRACE_CHAIN_DB="$example_evidence/orders.sqlite"
export TEAQL_TRACE_CHAIN_SHARED_DB="$example_evidence/shared.sqlite"
export TEAQL_TRACE_CHAIN_PAGE_DB="$example_evidence/page.sqlite"
export TEAQL_TRACE_CHAIN_STREAM_DB="$example_evidence/stream.sqlite"
export TEAQL_TRACE_CHAIN_AGGREGATE_DB="$example_evidence/aggregate.sqlite"
export TEAQL_TRACE_CHAIN_CHECKER_DB="$example_evidence/checker.sqlite"
export TEAQL_TRACE_CHAIN_CHECKER_EVIDENCE="$example_evidence/checker-evidence"
export TEAQL_TRACE_CHAIN_PLAN_DB="$example_evidence/plan.sqlite"
export TEAQL_TS_AGGREGATE_EVIDENCE="$example_evidence/membership"

(
  cd "$workspace"
  for attempt in 1 2; do
    graph_log="$verify_scratch/graph-$attempt.log"
    npm start | tee "$graph_log"
    rg -Fxq 'PASS TypeScript graph identity controls: duplicate, missing and equal-ID type collapse rejected' "$graph_log"
    rg -Fq 'GRAPH IDENTITY EVIDENCE ' "$graph_log"
    rg -Fxq 'PASS TypeScript generated trace-chain example: 7 checks' "$graph_log"
    [[ "$(rg -c '^PRIVATE_LINEAGE_OBSERVED ' "$graph_log")" == 8 ]]
    [[ "$(rg -c '^PASS TypeScript complete private lineage:' "$graph_log")" == 8 ]]
  done
  for attempt in 1 2; do
    env -u TEAQL_TRACE_CHAIN_SCENARIO npm run test:shared-reference | tee "$example_evidence/shared-$attempt.log"
    npm run test:page | tee "$example_evidence/page-$attempt.log"
    npm run test:stream-capture | tee "$example_evidence/stream-$attempt.log"
  done
)
for attempt in 1 2; do
  aggregate_log="$verify_scratch/aggregate-$attempt.log"
  (cd "$workspace" && npm run test:relation-aggregate) | tee "$aggregate_log"
  rg -Fq 'FORWARD_NOTLOADED_OBSERVED {"logging":true' "$aggregate_log"
  rg -Fq 'FORWARD_NOTLOADED_OBSERVED {"logging":false' "$aggregate_log"
done
bash "$repo/scripts/verify-current-aggregate.sh"
for attempt in 1 2; do
  checker_log="$verify_scratch/checker-$attempt.log"
  TEAQL_TRACE_CHAIN_CHECKER_RUN="verify-examples-$attempt" \
    bash "$repo/scripts/run-checker-overlap.sh" "$checker_log"
done
for attempt in 1 2; do
  plan_log="$verify_scratch/plan-items-$attempt.log"
  (cd "$workspace" && timeout --kill-after=5s 90s npm run test:plan-item-lineage) | tee "$plan_log"
  rg -Fxq 'PASS TypeScript generated plan item lineage: 4 scenarios; one plan, ordered same-type items, sibling privacy, independent next request' "$plan_log"
done
bootstrap_directory="$example_evidence/bootstrap"
mkdir -p "$bootstrap_directory"
for attempt in 1 2; do
  bootstrap_log="$bootstrap_directory/round-$attempt.log"
  (cd "$workspace" && TEAQL_TRACE_CHAIN_BOOTSTRAP_DB="$bootstrap_directory/bootstrap.sqlite" \
    timeout --kill-after=5s 90s npm run test:bootstrap-intent) | tee "$bootstrap_log"
  rg -Fxq 'PASS TypeScript generated bootstrap intent: logging off/on, committed audit, repeat no writes, unchanged generated library' "$bootstrap_log"
  for logging in false true; do
    rg -Fq "\"path\":\"generated default bootstrap\",\"logging\":$logging,\"firstWrites\":$((2-attempt)),\"repeatWrites\":0" "$bootstrap_log"
  done
done
(cd "$library" && sha256sum -c "$example_evidence/library-before.sha256") > "$example_evidence/library-unchanged.log"
if [[ "${1:-}" != '--graph-only' ]]; then
  TEAQL_TRACE_CHAIN_EVIDENCE_DIRECTORY="$example_evidence/standard/disabled" bash "$example/verify.sh" --standard disabled
fi
echo 'PASS: TypeScript TraceChain replay, nested workloads and unchanged domain'
