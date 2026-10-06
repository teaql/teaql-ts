#!/usr/bin/env bash
set -euo pipefail
example="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$example/../.." && pwd)"
facet_run_directory="$(mktemp -d -t teaql-ts-facet.XXXXXX)"
export TEAQL_FACET_TRACE_DB="$facet_run_directory/school.db"
unset TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS
fingerprint() {
  (cd "$example/lib" && rg --files -g '!**/node_modules/**' -g '!**/dist/**' | LC_ALL=C sort | xargs -d '\n' sha256sum)
}
fingerprint > "$facet_run_directory/library-before.sha256"
# Always rebuild repository runtime outputs before exercising a file: dependency.
(cd "$repo" && npm run build) > "$facet_run_directory/runtime-build.log" 2>&1
(cd "$example" && npm install --prefer-offline --no-audit --no-fund && npm run build) > "$facet_run_directory/compile.log" 2>&1
(cd "$example" && node -e 'const fs=require("node:fs"), path=require("node:path");
  const actual=fs.realpathSync(require.resolve("teaql-ts"));
  if(actual!==path.join(fs.realpathSync("../.."),"dist/index.js")) throw Error("runtime must resolve repository dist");
  console.log(actual);') > "$facet_run_directory/resolution.log"
for round in first second; do
  log="$facet_run_directory/$round.log"
  if ! (cd "$example" && timeout --kill-after=5s 60s npm start) > "$log" 2>&1; then
    tail -50 "$log" >&2
    echo "FAIL: Facet $round; retained evidence $facet_run_directory" >&2
    exit 1
  fi
  [[ "$(rg -c '^FACET_OBSERVED ' "$log")" == 48 ]]
  rg -Fq 'TypeScript generated Facet acceptance passed: 48 scenarios' "$log"
  echo "PASS: Facet $round, 48 scenarios; same database $TEAQL_FACET_TRACE_DB; log $log"
done
fingerprint > "$facet_run_directory/library-after.sha256"
cmp "$facet_run_directory/library-before.sha256" "$facet_run_directory/library-after.sha256"
echo "PASS: generated Facet library unchanged; retained evidence $facet_run_directory"
