#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
evidence="${TEAQL_TRACE_CHAIN_CHECKER_EVIDENCE:-$(mktemp -d /tmp/teaql-ts-checker-overlap.XXXXXX)}"
mkdir -p "$evidence"
evidence="$(cd "$evidence" && pwd)"
database="${TEAQL_TRACE_CHAIN_CHECKER_DB:-$evidence/checker.sqlite}"
export TEAQL_TRACE_CHAIN_CHECKER_EVIDENCE="$evidence"
export TEAQL_TRACE_CHAIN_CHECKER_DB="$database"

# file: dependencies execute dist. Rebuild without installing packages or
# resetting data, then replay both modes/orderings against one retained DB.
(cd "$repo" && npm run build) > "$evidence/runtime-build.log" 2>&1
(cd "$repo/examples/trace-chain" && npm run build) > "$evidence/app-build.log" 2>&1
for attempt in 1 2; do
  (
    cd "$repo/examples/trace-chain"
    env -u TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS \
      TEAQL_TRACE_CHAIN_CHECKER_RUN="attempt-$attempt" npm run test:checker-overlap
  ) > "$evidence/attempt-$attempt.log" 2>&1
  tail -n 2 "$evidence/attempt-$attempt.log"
done
printf 'PASS: retained Checker overlap evidence %s\n' "$evidence"
