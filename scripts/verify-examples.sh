#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# file: dependencies resolve the package's dist entry points, not TypeScript source.
# Rebuild here so examples can never silently validate stale checked-in output.
(cd "$repo" && npm run build)
mkdir -p "$repo/.local"
expected=(browser-sqlite conformance ensure-schema-bootstrap order-management school-management task-board trace-chain)
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
(cd "$repo/examples/trace-chain" && npm install && npm run build && npm start && npm start && env -u TEAQL_TRACE_CHAIN_SCENARIO npm run test:shared-reference && env -u TEAQL_TRACE_CHAIN_SCENARIO npm run test:shared-reference && npm run test:page && npm run test:page && npm run test:stream-capture && npm run test:stream-capture)
(cd "$repo/examples/trace-chain" && npm run test:relation-aggregate && npm run test:relation-aggregate)
echo "PASS: all TypeScript examples"
