# Optional JPEG/PNG and PDF content verifiers

`@teaql/teaql/blob-reference/content-sharp` exports `SharpBlobContentVerifier`,
which implements the Blob upload service's trusted `BlobContentVerifier` interface.
Install `sharp@0.35.5` in the host application and inject this verifier into
`SqliteBlobUploadService`. The base runtime does not load sharp; `BlobReferenceModule.ready`
calls the verifier's explicit readiness hook.

The verifier accepts only `jpg`, `jpeg` and `png`. It checks a complete JPEG
terminator or complete PNG chunk sequence and CRCs, confirms the decoder's actual
format, then decodes all pixels to bounded RGBA output. It hashes the original
bytes, never filename or declared MIME. Defaults cap input at 32 MiB, decoded
output at 100 MiB and simultaneous verifications at two. The limits are parser
bounds, not a CPU or process isolation guarantee. Decoder errors are sanitized to
`BLOB_FORMAT_NOT_ALLOWED`; a missing optional decoder fails readiness as
`BLOB_CAPABILITY_MISSING`.

`@teaql/teaql/blob-reference/content-pdfjs` exports `PdfjsBlobContentVerifier`.
Install `pdfjs-dist@6.4.299` in the host application and inject it for `pdf` fields.
This optional entry requires a Node version supported by PDF.js (Node 22.13+
or 24+). It checks the PDF envelope and uses PDF.js to parse every page's
operator list, with strict parser errors, page and operator-count limits, an
input limit of 32 MiB and two simultaneous verifications by default. The
decoder's image-size setting is applied while parsing; it is not a separate
hard memory or CPU limit. Malformed, encrypted and unsupported documents fail
closed. Run `node scripts/verify-pdfjs.cjs` after `npm run build` to exercise
the real Node package entry and SQLite/File upload promotion.

Seven further extensions still need production verifier adapters. A host must
use a verifier supporting every extension it enables. No parser or storage I/O
runs at construction. These in-process parsers do not provide a process memory
or execution-time isolation guarantee; untrusted PDF deployments should apply
host process limits while that guard is not built into the adapter.
