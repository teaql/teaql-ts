# Context owned object storage

Tracking: [TypeScript #53](https://github.com/teaql/teaql-ts/issues/53),
[shared contract #122](https://github.com/teaql/teaql-conformance/issues/122).

Core exports contain portable typed values and asynchronous byte-stream contracts.
The optional server-only `@teaql/teaql/object-storage/s3` entry requires the pinned
`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` peers (3.1151.0), Node 20+,
and filesystem access. It is not imported by the browser core entry point.
SDK credentials, endpoints and buckets are configured at trusted startup.

```typescript
import {UserContext,ObjectKey,ObjectPutOptions} from '@teaql/teaql';
import {S3ObjectStorage} from '@teaql/teaql/object-storage/s3';

const provider = new S3ObjectStorage(sdkClient, 'attachments');
const storage = new UserContext().withObjectStorage(provider)
  .objectStorage('store payment receipt attachment');
const key = new ObjectKey('receipts/opaque-reference.pdf');
await storage.put(key, source, new ObjectPutOptions(contentLength, 'create_only'));
const link = await storage.getReadUrl(key);
// Return link.url to an authorized caller; never log it.
const response = await storage.get(key);
try { for await (const block of response.stream) { /* consume bytes */ } }
finally { await response.close(); }
```

Upload iterators are finalized on every exit. The adapter stages to a private
temporary file with bounded buffers and exact length checks, capped at 5 GiB.
It reopens the staged body for at most three transport/service retry attempts;
conditional PUT remains atomic. Downloads stream and must be consumed or closed.
`getBytes(key, maximumBytes)` requires an explicit memory ceiling. Replacement
is explicit; permissions and outages never become false absence.

Keys are durable; five-minute read URLs are reusable bearer links and can expire
early with credentials/policy. Issuing a URL does not check existence or grant
domain permission. Core inspection/diagnostic events exclude keys, metadata,
body, credentials, URLs and SDK messages. The observer/telemetry resource is
installed on Context (`objectStorageObserver` / `runtimeTelemetry`). S3 writes
remain independent of SQL transactions.

After installing this checkout's dependencies, set `TEAQL_S3_ENDPOINT`,
`TEAQL_S3_BUCKET`, `TEAQL_S3_ACCESS_KEY`, `TEAQL_S3_SECRET_KEY` to a dedicated
test service and run `bash examples/object-storage/verify.sh` twice. The example
uses a fresh local build, creates its fixture bucket if missing and removes
only its unique keys. The production provider never creates buckets. The gate
qualifies the dedicated fixture; other compatible services require their own
tests. Multipart, list/copy/range, signed upload and browser credentials are
outside this first server adapter.
