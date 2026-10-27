# SQLite Blob retention checkpoint

`BlobRetentionPolicy` is a trusted host value. The upload authorization's
`currentOnLease` callback supplies it on the physical SQLite upload lease at
`begin`; the catalog snapshots its profile, server-stream mode, unbound
retention, and initial effective unreferenced retention. Replay preserves the
snapshot. `SqliteBlobUploadService` does not implement direct uploads.

For a new binding, `BlobBindingAuthorization.currentPolicyOnLease` must return
the current target-field policy on the physical graph SQL lease. The catalog
checks the source deadline before binding, accepts the maximum unreferenced
retention seen so far, and extends the minimum-retention floor. Binding and
last-unbind time changes commit with the business graph. A migrated row with
unknown policy or time facts cannot acquire a new binding or enter completed
retention collection; historical values must not be guessed.

The host explicitly schedules `SqliteBlobMaintenanceService` outside a graph
transaction. It can collect expired incomplete uploads, completed unbound
server-stream Blobs, and formerly bound Blobs past both their effective
unreferenced deadline and floor. An active binding blocks the claim. The claim
uses SQLite `BEGIN IMMEDIATE`; object deletion requires a pinned version and
an `ObjectStorage` implementation with version-conditional delete. For local
files, use the opt-in `SqliteFencedFileObjectStorage` with its private root.
The host may call `sweepOldGenerations(key)` on that provider for a known key.
It takes a per-key SQLite writer lock before the manifest lock, removes only
inaccessible old immutable data generations, and preserves the current one.

The optional `@teaql/teaql/blob-reference/file-generation-maintenance` entry
adds `SqliteBlobFileGenerationSweepService`. After **all** processes sharing
the private root run the fenced writer protocol, the host explicitly constructs
it with `true` as the `allWritersUpgraded` constructor argument and calls
`runBatch(context, provider, cursor)`
outside a graph transaction. It scans only the current authorized scope's
trusted server-stream catalog rows, including `deleted` rows whose old File
generations may remain. The passed provider must be the same
`SqliteFencedFileObjectStorage` installed in that context. Outcomes report the
number of removed generations; the current manifest generation is preserved.
The scan is bounded and cursor-based. Restart from the beginning to retry a
failed row, and keep catalog rows until their File sweep can complete. This
service is host-scheduled and separate from catalog deletion receipts.

The host upgrade assertion cannot detect an older external writer by itself.
Direct-upload quiescence and full five-language F2–F5 acceptance remain open.
