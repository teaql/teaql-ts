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

This checkpoint does not sweep older immutable File data generations or prove
direct-upload quiescence. It does not imply that the full five-language F2–F5
acceptance gates are complete.
