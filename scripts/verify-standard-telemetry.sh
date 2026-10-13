#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(cd "$repo" && npm run build)
(cd "$repo" && npm test -- --runInBand --silent \
  tests/telemetry-startup.test.ts tests/standard-telemetry-module.test.ts \
  tests/sql-telemetry-correlation.test.ts tests/runtime-telemetry.test.ts \
  tests/opentelemetry.test.ts tests/log-privacy.test.ts tests/sql-stream.test.ts)
(cd "$repo/examples/trace-chain" && npm run build)
for attempt in 1 2; do
  (cd "$repo/examples/trace-chain" && env -u TEAQL_TELEMETRY_ENABLED \
    -u TEAQL_TELEMETRY_SERVICE_NAME -u TEAQL_TELEMETRY_OTLP_ENDPOINT npm run test:standard-telemetry)
  (cd "$repo/examples/trace-chain" && env -u TEAQL_TELEMETRY_ENABLED \
    -u TEAQL_TELEMETRY_SERVICE_NAME -u TEAQL_TELEMETRY_OTLP_ENDPOINT npm run test:standard-telemetry-graph)
done
if [[ "${TEAQL_TELEMETRY_ENABLED:-}" == true ]]; then
  for attempt in 1 2; do
    (cd "$repo/examples/trace-chain" && npm run test:standard-telemetry)
    (cd "$repo/examples/trace-chain" && npm run test:standard-telemetry-graph)
  done
fi
echo 'PASS TypeScript standard telemetry local example verification'
