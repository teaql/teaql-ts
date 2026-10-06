#!/usr/bin/env bash
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
evidence="${TEAQL_TS_AGGREGATE_EVIDENCE:-$(mktemp -d -t teaql-ts-aggregate-gate.XXXXXXXX)}"
mkdir -p "$evidence"
database="${TEAQL_TRACE_CHAIN_MEMBERSHIP_DB:-$evidence/membership.sqlite}"
unset TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS
(cd "$repo" && npm run build) > "$evidence/runtime-build.log" 2>&1
(cd "$repo/examples/trace-chain" && npm run build) > "$evidence/app-build.log" 2>&1
(cd "$repo/examples/trace-chain/lib" && rg --files --hidden --no-ignore -0 | sort -z | xargs -0 sha256sum) > "$evidence/library-before.sha256"
for round in 1 2; do
  (cd "$repo" && timeout --kill-after=5s 120s npm test -- --runInBand \
    tests/numeric-partition-trace.test.ts tests/sql-relation-membership.test.ts) > "$evidence/native-$round.log" 2>&1
  (cd "$repo/examples/trace-chain" && TEAQL_TRACE_CHAIN_MEMBERSHIP_DB="$database" \
    timeout --kill-after=5s 90s node node_modules/ts-node/dist/bin.js aggregate-membership.ts) > "$evidence/run-$round.log" 2>&1
  rg -Fxq 'PASS TypeScript generated aggregate membership: 24 scenarios; actual SQL, complete safe ancestry, FK and independent filtered views' "$evidence/run-$round.log"
  [[ "$(rg -c '^TS_AGGREGATE_MEMBERSHIP ' "$evidence/run-$round.log")" == 24 ]]
done
(cd "$repo/examples/trace-chain/lib" && rg --files --hidden --no-ignore -0 | sort -z | xargs -0 sha256sum) > "$evidence/library-after.sha256"
cmp "$evidence/library-before.sha256" "$evidence/library-after.sha256"
echo "PASS TypeScript current aggregate gate: native and generated twice; retained database=$database; evidence=$evidence"
