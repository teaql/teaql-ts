# Optional JPEG/PNG content verifier

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

Other eight extensions still need production verifier adapters. A host must use a
verifier supporting every extension it enables; the fixture PDF verifier in tests
is only test scaffolding. No parser or storage I/O runs at construction.
