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

if (( $# > 1 )); then
  echo "Usage: verify-reference-package.sh [candidate.tgz]" >&2
  exit 2
fi
if (( $# == 1 )); then
  candidate="$1"
  test -f "$candidate"
  candidate="$(cd "$(dirname "$candidate")" && pwd)/$(basename "$candidate")"
else
  package_name="$(cd "$repo_root" && npm_config_cache="$test_root/npm-cache" \
    npm pack --ignore-scripts --pack-destination "$test_root" --silent)"
  candidate="$test_root/$package_name"
fi
tar -xzf "$candidate" -C "$test_root/unpacked"
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

TEAQL_PACKED_ROOT="$packed" TEAQL_SOURCE_ROOT="$repo_root" node --input-type=module <<'NODE'
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.env.TEAQL_PACKED_ROOT;
const source = process.env.TEAQL_SOURCE_ROOT;
const packedMetadata = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const sourceMetadata = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
if (packedMetadata.name !== sourceMetadata.name || packedMetadata.version !== sourceMetadata.version) {
  throw new Error('Packed package identity differs from the built checkout');
}
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

# Resolve the same extracted candidate through its public package exports from
# a fresh application outside this checkout. This catches missing or misrouted
# exports that absolute-path imports above cannot detect.
consumer="$test_root/consumer"
mkdir -p "$consumer/node_modules/@teaql"
mv "$packed" "$consumer/node_modules/@teaql/teaql"
(
  cd "$consumer"
  env -u NODE_PATH -u NODE_OPTIONS node <<'NODE'
const entries = [
  ['@teaql/teaql/blob-reference/module', 'BlobReferenceModule'],
  ['@teaql/teaql/secure-document-reference/document-round-trip',
    'SecureDocumentReferenceModule'],
  ['@teaql/teaql/blob-reference/file-generation-maintenance',
    'SqliteBlobFileGenerationSweepService'],
];
for (const [name, symbol] of entries) {
  if (typeof require(name)[symbol] !== 'function') {
    throw new Error(`CJS consumer: missing ${symbol} from ${name}`);
  }
  console.log(`PASS CJS consumer ${name}`);
}
NODE
  env -u NODE_PATH -u NODE_OPTIONS node --input-type=module <<'NODE'
const entries = [
  ['@teaql/teaql/blob-reference/module', 'BlobReferenceModule'],
  ['@teaql/teaql/secure-document-reference/document-round-trip',
    'SecureDocumentReferenceModule'],
  ['@teaql/teaql/blob-reference/file-generation-maintenance',
    'SqliteBlobFileGenerationSweepService'],
];
for (const [name, symbol] of entries) {
  if (typeof (await import(name))[symbol] !== 'function') {
    throw new Error(`ESM consumer: missing ${symbol} from ${name}`);
  }
  console.log(`PASS ESM consumer ${name}`);
}
NODE
)

# Install the exact tarball into fresh applications with an isolated npm cache.
# The base/Secure app gets only production dependencies; the S3 app adds only
# the two optional peers declared by this same candidate. No source checkout
# node_modules or installed development dependencies are on either app's path.
closure="$test_root/dependency-closure"
mkdir -p "$closure/core" "$closure/s3"
printf '{"name":"teaql-reference-core-closure","private":true,"version":"1.0.0"}\n' \
  > "$closure/core/package.json"
TEAQL_PACKED_METADATA="$consumer/node_modules/@teaql/teaql/package.json" \
  TEAQL_S3_APP_PACKAGE="$closure/s3/package.json" node <<'NODE'
const fs = require('node:fs');
const packed = JSON.parse(fs.readFileSync(process.env.TEAQL_PACKED_METADATA, 'utf8'));
const dependencies = {};
for (const name of ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner']) {
  const version = packed.peerDependencies?.[name];
  if (!/^\d+\.\d+\.\d+$/.test(version) || !packed.peerDependenciesMeta?.[name]?.optional) {
    throw new Error(name + ' must be an exact optional peer in the candidate');
  }
  dependencies[name] = version;
}
fs.writeFileSync(process.env.TEAQL_S3_APP_PACKAGE, JSON.stringify({
  name: 'teaql-reference-s3-closure', private: true, version: '1.0.0', dependencies,
}) + '\n');
NODE
for cell in core s3; do
  (
    cd "$closure/$cell"
    env -u NODE_PATH -u NODE_OPTIONS npm_config_cache="$test_root/npm-cache" \
      npm install --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund "$candidate"
    cmp "$consumer/node_modules/@teaql/teaql/dist/blob-reference/module.js" \
      "node_modules/@teaql/teaql/dist/blob-reference/module.js"
    cmp "$consumer/node_modules/@teaql/teaql/dist/secure-document-reference/document-round-trip.js" \
      "node_modules/@teaql/teaql/dist/secure-document-reference/document-round-trip.js"
    cmp "$consumer/node_modules/@teaql/teaql/dist/object-storage/s3.js" \
      "node_modules/@teaql/teaql/dist/object-storage/s3.js"
    env -u NODE_PATH -u NODE_OPTIONS TEAQL_CLOSURE_CELL="$cell" node <<'NODE'
const cell = process.env.TEAQL_CLOSURE_CELL;
const entries = [
  ['@teaql/teaql/blob-reference/module', 'BlobReferenceModule'],
  ['@teaql/teaql/secure-document-reference/document-round-trip',
    'SecureDocumentReferenceModule'],
];
if (cell === 's3') entries.push(['@teaql/teaql/object-storage/s3', 'S3ObjectStorage']);
if (typeof require('node-fetch') !== 'function') throw new Error('missing production node-fetch');
if (cell === 'core') {
  for (const peer of ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner']) {
    try {
      require.resolve(peer);
      throw new Error('optional peer leaked into core application: ' + peer);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
}
for (const [name, symbol] of entries) {
  if (typeof require(name)[symbol] !== 'function') throw new Error(cell + ': ' + name);
  console.log('PASS installed ' + cell + ' CJS ' + name);
}
NODE
    env -u NODE_PATH -u NODE_OPTIONS TEAQL_CLOSURE_CELL="$cell" \
      node --input-type=module <<'NODE'
const cell = process.env.TEAQL_CLOSURE_CELL;
const entries = [
  ['@teaql/teaql/blob-reference/module', 'BlobReferenceModule'],
  ['@teaql/teaql/secure-document-reference/document-round-trip',
    'SecureDocumentReferenceModule'],
];
if (cell === 's3') entries.push(['@teaql/teaql/object-storage/s3', 'S3ObjectStorage']);
for (const [name, symbol] of entries) {
  if (typeof (await import(name))[symbol] !== 'function') throw new Error(cell + ': ' + name);
  console.log('PASS installed ' + cell + ' ESM ' + name);
}
NODE
  )
done
