#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
verify_scratch="$(mktemp -d -t teaql-ts-example-scratch.XXXXXXXX)"
finish_verification() {
  local status=$?
  trap - EXIT
  # Only logs/configuration owned by this invocation; never databases or caches.
  if [[ -n "$verify_scratch" && -d "$verify_scratch" ]]; then
    if ! rm -r -- "$verify_scratch"; then echo "WARNING: owned scratch retained: $verify_scratch" >&2; fi
  fi
  exit "$status"
}
trap finish_verification EXIT
example_evidence="${TEAQL_EXAMPLES_EVIDENCE_DIR:-$(mktemp -d -t teaql-ts-example-evidence.XXXXXXXX)}"
mkdir -p "$example_evidence"
echo "Retained TypeScript example evidence: $example_evidence"
expected=(browser-sqlite conformance context-derived ensure-schema-bootstrap expression-profiles facet-trace fix-e-alignment natural-messages object-storage order-management scalar-type-probe school-management task-board trace-chain)
mapfile -t actual < <(find "$repo/examples" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)
if [[ "${actual[*]}" != "${expected[*]}" ]]; then
  echo "example inventory changed; update scripts/verify-examples.sh: ${actual[*]}" >&2
  exit 1
fi
# Bind the complete source snapshot before the build replaces tracked dist chunks.
# Profiles compile repository source in their own isolated copy; no source guard
# is weakened to accommodate generated build output.
TEAQL_GENERATED_E_PROFILE_EVIDENCE_DIR="$example_evidence/expression-profiles" \
  node "$repo/examples/expression-profiles/verify-local.cjs"
# file: dependencies resolve dist entry points. Rebuild before those consumers
# so they cannot silently validate stale checked-in output.
(cd "$repo" && npm run build)
TEAQL_CONTEXT_FIX_EVIDENCE_DIR="$example_evidence/context-derived" node "$repo/examples/context-derived/verify-local.cjs"
node "$repo/scripts/verify-natural-messages.cjs" --example --output "$example_evidence/natural-messages"
bash "$repo/examples/object-storage/verify.sh"
(cd "$repo" && npm test -- --runInBand tests/sql-relation-membership.test.ts)
mkdir -p "$repo/.local"
TEAQL_FIX_E_EVIDENCE_DIR="${TEAQL_FIX_E_EVIDENCE_DIR:-$example_evidence/fix-e-alignment}" node "$repo/examples/fix-e-alignment/verify-local.cjs"
TEAQL_SCALAR_EVIDENCE_DIR="${TEAQL_SCALAR_EVIDENCE_DIR:-$example_evidence/scalar-type-probe}" node "$repo/examples/scalar-type-probe/verify-local.cjs"
TEAQL_FILE_BOOTSTRAP_OUTPUT="$example_evidence/file-bootstrap" node "$repo/examples/school-management/verify-file-bootstrap.cjs"
TEAQL_MANAGED_EVIDENCE_DIR="$example_evidence/managed-construction" node "$repo/examples/conformance/verify-managed.cjs"
if rg -n --glob '*.ts' --glob '!**/node_modules/**' --glob '!**/dist/**' \
    '\b(executeForPage|ExecuteForPage|execute_for_page)\b' "$repo/examples"; then
  echo 'FAIL: an example still exposes or calls a retired page terminal; regenerate its library' >&2
  exit 1
fi

for example in conformance ensure-schema-bootstrap school-management; do
  (
    cd "$repo/examples/$example"
    npm install
    npm run build
    if [[ "$example" == school-management ]]; then
      npx ts-node app.ts
    else
      npm start
    fi
  )
done
(cd "$repo/examples/order-management" && npm install && npm run build && npm start)
(cd "$repo/examples/task-board" && npm install && npm run build && \
  TEAQL_TASK_BOARD_EVIDENCE_DIR="$example_evidence/task-board" npm run verify)
(cd "$repo/examples/browser-sqlite" && npm install && npm run build && npm run smoke && \
  TEAQL_BROWSER_ORDER_EVIDENCE="$example_evidence/browser-orders.json" npm run smoke:orders)
(
  cd "$repo/examples/trace-chain"
  npm install
  npm run build
  for attempt in 1 2; do
    graph_log="$verify_scratch/graph-$attempt.log"
    npm start | tee "$graph_log"
    rg -Fxq 'PASS TypeScript graph identity controls: duplicate, missing and equal-ID type collapse rejected' "$graph_log"
    rg -Fq 'GRAPH IDENTITY EVIDENCE ' "$graph_log"
    rg -Fxq 'PASS TypeScript generated trace-chain example: 7 checks' "$graph_log"
    [[ "$(rg -c '^PRIVATE_LINEAGE_OBSERVED ' "$graph_log")" == 8 ]]
    [[ "$(rg -c '^PASS TypeScript complete private lineage:' "$graph_log")" == 8 ]]
  done
  env -u TEAQL_TELEMETRY_ENABLED -u TEAQL_TELEMETRY_SERVICE_NAME -u TEAQL_TELEMETRY_OTLP_ENDPOINT npm run test:standard-telemetry
  env -u TEAQL_TELEMETRY_ENABLED -u TEAQL_TELEMETRY_SERVICE_NAME -u TEAQL_TELEMETRY_OTLP_ENDPOINT npm run test:standard-telemetry
  env -u TEAQL_TELEMETRY_ENABLED -u TEAQL_TELEMETRY_SERVICE_NAME -u TEAQL_TELEMETRY_OTLP_ENDPOINT npm run test:standard-telemetry-graph
  env -u TEAQL_TELEMETRY_ENABLED -u TEAQL_TELEMETRY_SERVICE_NAME -u TEAQL_TELEMETRY_OTLP_ENDPOINT npm run test:standard-telemetry-graph
  response_directory="$example_evidence/standard-response"
  mkdir -p "$response_directory"
  for attempt in 1 2; do
    response_log="$response_directory/round-$attempt.log"
    env -u TEAQL_TELEMETRY_ENABLED -u TEAQL_TELEMETRY_SERVICE_NAME -u TEAQL_TELEMETRY_OTLP_ENDPOINT \
      TEAQL_STANDARD_RESPONSE_DB="$response_directory/graphs.sqlite" \
      node node_modules/ts-node/dist/bin.js standard-export-responses.ts | tee "$response_log"
    rg -Fxq 'PASS TypeScript standard response graph: create, rollback, retry, update, delete, Q/E, committed audit' "$response_log"
    rg -Fq "\"firstSeedAudits\":$((2-attempt)),\"repeatSeedAudits\":0" "$response_log"
  done
  env -u TEAQL_TRACE_CHAIN_SCENARIO npm run test:shared-reference
  env -u TEAQL_TRACE_CHAIN_SCENARIO npm run test:shared-reference
  npm run test:page
  npm run test:page
  npm run test:stream-capture
  npm run test:stream-capture
)
for attempt in 1 2; do
  aggregate_log="$verify_scratch/aggregate-$attempt.log"
  (cd "$repo/examples/trace-chain" && npm run test:relation-aggregate) | tee "$aggregate_log"
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
  (cd "$repo/examples/trace-chain" && timeout --kill-after=5s 90s npm run test:plan-item-lineage) | tee "$plan_log"
  rg -Fxq 'PASS TypeScript generated plan item lineage: 4 scenarios; one plan, ordered same-type items, sibling privacy, independent next request' "$plan_log"
done
bash "$repo/examples/facet-trace/verify.sh"
bootstrap_directory="$example_evidence/bootstrap"
mkdir -p "$bootstrap_directory"
for attempt in 1 2; do
  bootstrap_log="$bootstrap_directory/round-$attempt.log"
  (cd "$repo/examples/trace-chain" && TEAQL_TRACE_CHAIN_BOOTSTRAP_DB="$bootstrap_directory/bootstrap.sqlite" \
    timeout --kill-after=5s 90s npm run test:bootstrap-intent) | tee "$bootstrap_log"
  rg -Fxq 'PASS TypeScript generated bootstrap intent: logging off/on, committed audit, repeat no writes, unchanged generated library' "$bootstrap_log"
  for logging in false true; do
    rg -Fq "\"path\":\"generated default bootstrap\",\"logging\":$logging,\"firstWrites\":$((2-attempt)),\"repeatWrites\":0" "$bootstrap_log"
  done
done
echo "PASS: all TypeScript examples"
