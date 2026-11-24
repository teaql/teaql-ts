'use strict';

// Reconstruct the producer's exact manifest for its retained hash check.
// The installed source workspace binds TeaQL to this repository.
function originalExamplePackage(bytes, publishedVersion) {
  const text = bytes.toString('utf8');
  const manifest = JSON.parse(text);
  const selected = manifest.dependencies?.['teaql-ts'];
  if (selected !== 'file:../../..') return bytes;
  const binding = /("teaql-ts"\s*:\s*)"file:\.\.\/\.\.\/\.\."/g;
  if ([...text.matchAll(binding)].length !== 1) {
    throw new Error('Expected one exact local TeaQL dependency binding');
  }
  return Buffer.from(text.replace(binding, (_, key) => key + JSON.stringify('npm:@teaql/teaql@' + publishedVersion)));
}

module.exports = {originalExamplePackage};
