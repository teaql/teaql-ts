#!/usr/bin/env bash
set -euo pipefail
example="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$example/../.." && pwd)"
if [[ -n "${TEAQL_FREIGHT_QUOTE_EVIDENCE_DIR:-}" ]]; then
  evidence="$TEAQL_FREIGHT_QUOTE_EVIDENCE_DIR"
  mkdir "$evidence"
else
  evidence="$(mktemp -d -t teaql-ts-freight-evidence.XXXXXXXX)"
fi
evidence="$(cd "$evidence" && pwd)"
scratch="$(mktemp -d -t teaql-ts-freight-build.XXXXXXXX)"
cleanup() {
  status=$?
  trap - EXIT
  rm -rf -- "$scratch" || { [[ "$status" != 0 ]] || status=1; }
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

mkdir "$scratch/node_modules"
ln -s "$repo" "$scratch/node_modules/teaql-ts"
node - "$scratch" "$repo" "$example" <<'JS'
const fs = require('node:fs');
const path = require('node:path');
const [scratch, repo, example] = process.argv.slice(2);
const tsconfig = {
  extends: path.join(example, 'typescript-app-console/tsconfig.json'),
  compilerOptions: {
    rootDir: example,
    outDir: path.join(scratch, 'compiled'),
    declaration: false,
    typeRoots: [path.join(repo, 'node_modules/@types')],
    types: ['node'],
    paths: {
      'teaql-ts': [path.join(repo, 'dist/index.d.ts')],
      'teaql-ts/*': [path.join(repo, 'dist/*')],
    },
  },
};
fs.writeFileSync(path.join(scratch, 'tsconfig.json'), JSON.stringify(tsconfig));
JS
(cd "$scratch" && node -p 'require.resolve("teaql-ts")') > "$evidence/runtime-origin.log"
printf '%s\n' "$repo/dist/index.js" | cmp - "$evidence/runtime-origin.log"
node "$repo/node_modules/typescript/bin/tsc" --project "$scratch/tsconfig.json" --pretty false | tee "$evidence/build.log"
for phase in first restart; do
  node "$scratch/compiled/typescript-app-console/src/main.js" "$evidence/freight.sqlite" "$phase" | tee "$evidence/$phase.log"
done
mkdir "$evidence/calibration"
TEAQL_SCALAR_EVIDENCE_DIR="${TEAQL_SCALAR_EVIDENCE_DIR:-$evidence/calibration/legacy}" node "$example/verify-local.cjs" | tee "$evidence/calibration/scalar.log"
echo "PASS Freight quotes and scalar calibrations. Evidence at $evidence"
