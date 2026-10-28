#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -f "$repo_root/dist/blob-reference/module.js" ||
      ! -f "$repo_root/dist/esm/blob-reference/module.js" ||
      ! -f "$repo_root/dist/secure-document-reference/document-round-trip.js" ]]; then
  echo "Build the TypeScript package before verifying its reference modules" >&2
  exit 1
fi

test_root="$(mktemp -d /tmp/teaql-reference-package.XXXXXX)"
trap 'rm -rf -- "$test_root"' EXIT
mkdir "$test_root/unpacked"

package_name="$(cd "$repo_root" && npm_config_cache="$test_root/npm-cache" \
  npm pack --ignore-scripts --pack-destination "$test_root" --silent)"
tar -xzf "$test_root/$package_name" -C "$test_root/unpacked"
packed="$test_root/unpacked/package"
test ! -e "$packed/node_modules"

for file in \
  dist/blob-reference/module.js \
  dist/blob-reference/maintenance-service.js \
  dist/blob-reference/upload-service.js \
  dist/esm/blob-reference/module.js \
  dist/esm/blob-reference/maintenance-service.js \
  dist/esm/blob-reference/upload-service.js \
  dist/secure-document-reference/document-round-trip.js \
  dist/esm/secure-document-reference/document-round-trip.js; do
  cmp "$repo_root/$file" "$packed/$file"
done

TEAQL_PACKED_ROOT="$packed" node --input-type=module <<'NODE'
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.env.TEAQL_PACKED_ROOT;
const require = createRequire(import.meta.url);
const entries = [
  ['blob-cjs', 'dist/blob-reference/module.js', 'BlobReferenceModule', false],
  ['blob-esm', 'dist/esm/blob-reference/module.js', 'BlobReferenceModule', true],
  ['secure-cjs', 'dist/secure-document-reference/document-round-trip.js',
    'SecureDocumentReferenceModule', false],
  ['secure-esm', 'dist/esm/secure-document-reference/document-round-trip.js',
    'SecureDocumentReferenceModule', true],
  ['file-sweep-cjs', 'dist/blob-reference/file-generation-maintenance.js',
    'SqliteBlobFileGenerationSweepService', false],
  ['file-sweep-esm', 'dist/esm/blob-reference/file-generation-maintenance.js',
    'SqliteBlobFileGenerationSweepService', true],
];
for (const [label, path, symbol, esm] of entries) {
  const absolute = join(root, path);
  const entry = esm ? await import(pathToFileURL(absolute).href) : require(absolute);
  if (typeof entry[symbol] !== 'function') {
    throw new Error(`${label}: missing ${symbol}`);
  }
  console.log(`PASS ${label} packed optional reference entry`);
}
NODE
