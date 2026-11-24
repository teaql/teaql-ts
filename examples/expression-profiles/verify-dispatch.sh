#!/usr/bin/env bash
set -euo pipefail
example="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$example/../.." && pwd)"
if [[ -n "${TEAQL_DISPATCH_PROFILE_EVIDENCE_DIR:-}" ]]; then
  evidence="$TEAQL_DISPATCH_PROFILE_EVIDENCE_DIR"
  mkdir "$evidence"
else
  evidence="$(mktemp -d -t teaql-ts-dispatch-profile.XXXXXXXX)"
fi
evidence="$(cd "$evidence" && pwd)"
scratch="$(mktemp -d -t teaql-ts-dispatch-build.XXXXXXXX)"
cleanup() {
  status=$?
  trap - EXIT
  rm -rf -- "$scratch" || { [[ "$status" != 0 ]] || status=1; }
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

TEAQL_GENERATED_E_PROFILE_EVIDENCE_DIR="${TEAQL_GENERATED_E_PROFILE_EVIDENCE_DIR:-$evidence/calibration}" node "$example/verify-local.cjs" | tee "$evidence/calibration.log"
(cd "$repo" && npm run build) > "$evidence/runtime-build.log" 2>&1 || {
  tail -80 "$evidence/runtime-build.log"
  exit 1
}
mkdir "$scratch/node_modules"
ln -s "$repo" "$scratch/node_modules/teaql-ts"
(cd "$scratch" && node -p 'require.resolve("teaql-ts")') > "$evidence/runtime-origin.log"
printf '%s\n' "$repo/dist/index.js" | cmp - "$evidence/runtime-origin.log"
for profile in camelCase snake_case PascalCase; do
  source="$example"
  if [[ "$profile" != camelCase ]]; then source="$example/profiles/$profile"; fi
  folder="$evidence/$profile"
  build="$scratch/$profile"
  mkdir "$folder" "$build"
  node - "$build" "$repo" "$source" <<'JS'
const fs = require('node:fs');
const path = require('node:path');
const [build, repo, source] = process.argv.slice(2);
fs.writeFileSync(path.join(build, 'tsconfig.json'), JSON.stringify({
  extends: path.join(source, 'typescript-app-console/tsconfig.json'),
  compilerOptions: {
    rootDir: source,
    outDir: path.join(build, 'compiled'),
    declaration: false,
    typeRoots: [path.join(repo, 'node_modules/@types')],
    types: ['node'],
    paths: {
      'teaql-ts': [path.join(repo, 'dist/index.d.ts')],
      'teaql-ts/*': [path.join(repo, 'dist/*')],
    },
  },
}));
JS
  node "$repo/node_modules/typescript/bin/tsc" --project "$build/tsconfig.json" --pretty false | tee "$folder/build.log"
  for phase in first restart; do
    node "$build/compiled/typescript-app-console/src/main.js" "$folder/dispatch.sqlite" "$profile" "$phase" | tee "$folder/$phase.log"
  done
done
