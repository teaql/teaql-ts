#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
expected=(conformance ensure-schema-bootstrap order-management school-management task-board)
mapfile -t actual < <(find "$repo/examples" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)
if [[ "${actual[*]}" != "${expected[*]}" ]]; then
  echo "example inventory changed; update scripts/verify-examples.sh: ${actual[*]}" >&2
  exit 1
fi

for example in conformance ensure-schema-bootstrap school-management; do
  (cd "$repo/examples/$example" && npm install && npm run build && { [[ "$example" == school-management ]] && npx ts-node app.ts || npm start; })
done
(cd "$repo/examples/order-management" && npm install && npm run build && npm start)
(cd "$repo/examples/task-board" && npm install && npm run build)
echo "PASS: all TypeScript examples"
