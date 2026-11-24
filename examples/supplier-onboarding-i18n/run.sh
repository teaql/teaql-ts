#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

example="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$example/../.." && pwd)"
runtime="${TEAQL_TYPESCRIPT_EXAMPLE_SOURCE_ROOT:-$repo}"
test -f "$runtime/dist/index.js" && test -x "$runtime/node_modules/.bin/tsc"
scratch="$(mktemp -d -t teaql-supplier-typescript.XXXXXXXX)"
cleanup() {
  local status=$?
  trap - EXIT
  python3 -c 'import shutil, sys; shutil.rmtree(sys.argv[1])' "$scratch"
  exit "$status"
}
trap cleanup EXIT
cp -R -- "$example/typescript-app-console" "$example/typescript-lib-core" "$scratch/"
mkdir -- "$scratch/node_modules"
for dependency in "$runtime"/node_modules/*; do
  [[ "${dependency##*/}" == teaql-ts ]] || ln -s -- "$dependency" "$scratch/node_modules/"
done
ln -s -- "$runtime" "$scratch/node_modules/teaql-ts"
"$runtime/node_modules/.bin/tsc" --project "$scratch/typescript-app-console/tsconfig.json" \
  --noEmit false --outDir "$scratch/out" --rootDir "$scratch"
binary="$scratch/out/typescript-app-console/src/main.js"
driver=(python3 "$example/run-example.py" --catalog "$example/typescript-lib-core/teaql-i18n.json")
cd -- "$scratch"
if [[ "${1:-}" == --verify ]]; then
  "${driver[@]}" --all --repeat 2 -- node "$binary"
  "${driver[@]}" --edge-cases -- node "$binary"
else
  "${driver[@]}" "$@" -- node "$binary"
fi
