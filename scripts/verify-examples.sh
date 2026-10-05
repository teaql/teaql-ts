#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# file: dependencies resolve the package's dist entry points, not TypeScript source.
# Rebuild here so examples can never silently validate stale checked-in output.
(cd "$repo" && npm run build)
(cd "$repo" && npm test -- --runInBand tests/sql-relation-membership.test.ts)
mkdir -p "$repo/.local"
expected=(browser-sqlite conformance ensure-schema-bootstrap facet-trace order-management school-management task-board trace-chain)
mapfile -t actual < <(find "$repo/examples" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)
if [[ "${actual[*]}" != "${expected[*]}" ]]; then
  echo "example inventory changed; update scripts/verify-examples.sh: ${actual[*]}" >&2
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
(cd "$repo/examples/task-board" && npm install && npm run build)
(cd "$repo/examples/browser-sqlite" && npm install && npm run build && npm run smoke)
(
  cd "$repo/examples/trace-chain"
  npm install
  npm run build
  for attempt in 1 2; do
    graph_log="$(mktemp -t teaql-ts-graph.XXXXXX.log)"
    npm start | tee "$graph_log"
    rg -Fxq 'PASS TypeScript graph identity controls: duplicate, missing and equal-ID type collapse rejected' "$graph_log"
    rg -Fq 'GRAPH IDENTITY EVIDENCE ' "$graph_log"
    rg -Fxq 'PASS TypeScript generated trace-chain example: 7 checks' "$graph_log"
  done
  env -u TEAQL_TRACE_CHAIN_SCENARIO npm run test:shared-reference
  env -u TEAQL_TRACE_CHAIN_SCENARIO npm run test:shared-reference
  npm run test:page
  npm run test:page
  npm run test:stream-capture
  npm run test:stream-capture
)
for attempt in 1 2; do
  aggregate_log="$(mktemp -t teaql-ts-aggregate.XXXXXX.log)"
  (cd "$repo/examples/trace-chain" && npm run test:relation-aggregate) | tee "$aggregate_log"
  rg -Fq 'FORWARD_NOTLOADED_OBSERVED {"logging":true' "$aggregate_log"
  rg -Fq 'FORWARD_NOTLOADED_OBSERVED {"logging":false' "$aggregate_log"
done
for attempt in 1 2; do
  checker_log="$(mktemp -t teaql-ts-checker.XXXXXX.log)"
  TEAQL_TRACE_CHAIN_CHECKER_RUN="verify-examples-$attempt" \
    bash "$repo/scripts/run-checker-overlap.sh" "$checker_log"
done
for attempt in 1 2; do
  plan_log="$(mktemp -t teaql-ts-plan-items.XXXXXX.log)"
  (cd "$repo/examples/trace-chain" && timeout --kill-after=5s 90s npm run test:plan-item-lineage) | tee "$plan_log"
  rg -Fxq 'PASS TypeScript generated plan item lineage: 4 scenarios; one plan, ordered same-type items, sibling privacy, independent next request' "$plan_log"
done
bash "$repo/examples/facet-trace/verify.sh"
bootstrap_directory="$(mktemp -d -t teaql-ts-bootstrap.XXXXXXXX)"
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
