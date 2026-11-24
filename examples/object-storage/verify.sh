#!/usr/bin/env bash
set -euo pipefail
example="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$example/../.." && pwd)"
: "${TEAQL_S3_ENDPOINT:?dedicated local test endpoint required}"
: "${TEAQL_S3_BUCKET:?dedicated test bucket required}"
: "${TEAQL_S3_ACCESS_KEY:?test access key required}"
: "${TEAQL_S3_SECRET_KEY:?test secret key required}"
app="$example/typescript-app-console"
if [[ -n "${TEAQL_ORDER_ATTACHMENT_EVIDENCE_DIR:-}" ]]; then
  evidence="$TEAQL_ORDER_ATTACHMENT_EVIDENCE_DIR"
  mkdir -p "$(dirname "$evidence")"
  mkdir "$evidence"
else
  evidence="$(mktemp -d -t teaql-typescript-order-attachment.XXXXXXXX)"
fi
evidence="$(cd "$evidence" && pwd)"
# Keep the runtime log out of the source tree covered by fingerprint().
export TEAQL_LOG_ENDPOINT="$evidence/runtime.log"
fingerprint() {
  (cd "$example" && find typescript-lib-core typescript-app-console -type d -name node_modules -prune -o \
    -type f -print0 | sort -z | xargs -0 sha256sum)
}
fingerprint > "$evidence/source-before.sha256"
cd "$repo"
npm run build > "$evidence/runtime-build.log" 2>&1
npm test -- --runInBand tests/object-storage.test.ts 2>&1 | tee "$evidence/provider-tests.log"
cd "$example"
npm ci > "$evidence/workspace-install.log" 2>&1
npm run build --workspace order-attachment-service-console 2>&1 | tee "$evidence/workspace-build.log"
cd "$app"
node - "$repo" "$app" <<'JS' > "$evidence/origins.log"
const {realpathSync} = require('node:fs'), {join} = require('node:path'), assert = require('node:assert/strict');
const [repo, app] = process.argv.slice(2);
for (const [entry, file] of [['teaql-ts','index.js'],['teaql-ts/object-storage/s3','object-storage/s3.js']]) {
  for (const from of [app, join(app,'../typescript-lib-core')]) {
    const resolved = realpathSync(require.resolve(entry,{paths:[from]}));
    assert.equal(resolved, join(repo,'dist',file));
    console.log(from, resolved);
  }
}
JS
node s3-lifecycle.cjs | tee "$evidence/s3-calibration.log"
for round in 1 2; do
  npm start -- "$evidence/orders.sqlite" "$evidence/receipt-$round.txt" "$round" | tee "$evidence/run-$round.log"
done
fingerprint > "$evidence/source-after.sha256"
cmp "$evidence/source-before.sha256" "$evidence/source-after.sha256"
printf 'Order attachment evidence retained at %s\n' "$evidence"
