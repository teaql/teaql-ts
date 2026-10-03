# TeaQL-TS (TypeScript Runtime)

## Request intent on the feature branch

`feature/request-trace-chain` adds validated, request-owned `QueryIntent` and
`MutationIntent`. This is a local source checkpoint, not a published `0.2.10`
capability. Query Request requires non-blank `comment` and `purpose`; Mutation
Request requires non-blank `comment`, also exposed to policy/audit as its root
reason. Existing generated `.comment(...).purpose(...)` and `.auditAs(...)`
spelling stays unchanged after regeneration.

Missing intent fails with `REQUEST_COMMENT_REQUIRED` at `comment`, or
`QUERY_PURPOSE_REQUIRED` at `purpose`, before policies and provider access.
The errors identify the request kind without echoing payload values. Context
resources, fabricated trace frames, child comments, and logging switches do
not supply a missing request property. Unicode whitespace validation follows
Rust; valid text is preserved without trimming.

Low-level adapters can construct `QueryRequest(query)` or
`MutationRequest(mutation)`. Envelopes capture intent independently of mutable
builders. SQL relations, aggregates, Facets and TFP Facet serialization inherit
the root intent. Generated library guards delegate to the runtime validators;
pair the changed generator with this local runtime before testing.

The SQL execution path now uses the Rust-baseline canonical algorithm. Typed
nodes separate entity/relation names from operation/qualified-property detail.
The physical path contains no intent nodes; validated comment, purpose and root
audit reason are separate fields. Mutation lineage is a separate typed carrier,
not another name for the physical SQL path. Readback failure records a distinct
`Sql(select)` path instead of adding a second SQL node to a mutation path.

Query provenance belongs to immutable request snapshots. Derived relation,
aggregate and Facet requests carry the original root and append the local
relation name with its qualified property. Provenance never comes from a
caller-supplied `__teaqlTracePath` or a mutable Context stack. This also preserves
the root through overlapping queries and stream execution. Privacy projection
scrubs reason text without removing structural typed identity or path shape.

Graph saves now receive an explicit validated `MutationIntent` and an
operation-owned `GraphMutationSession`. Persistent immutable parent scopes carry
branch-local reasons; an unrelated request cannot join the active transaction
or borrow another graph's scope. Type plus ID distinguishes ledger entries;
an entity's complete ledger chain replaces its graph fallback. Database-assigned
IDs are captured before saving descendants. Context owns no lineage stack.

Audits are queued until the whole graph commits and discarded on rollback.
After commit, a failing sink does not stop remaining cleanup/audits or pretend
the database rolled back. `GraphCommittedError.committed` tells callers not to
retry the operation as an uncommitted write. SQL metadata still distinguishes
the physical path, root intent and each entity's mutation lineage. Failed
readback remains a separate SELECT outcome.

Successful SQL mutations also retain the actual persisted-row SELECT, not just
failed readbacks. `MutationResult.metadata` is a trusted internal logical write
summary; its frozen `statements` array contains ordered write/SELECT facts.
There is no additional query for tracing. Safe sinks receive each physical fact
once with inherited intent and per-item lineage, without double-counting audits.
Query/mutation log switches control diagnostic output independently; an installed
evidence sink and returned raw result metadata remain available when logs are
off. Use the evidence store's own modes to disable evidence collection. Do not
serialize raw result metadata across a trust boundary or log it directly.

The runtime adapter SPI is intentionally changed to
`executeGraphSave(intent, async graph => ...)`; adapter code must create each
request with `graph.request(...)`. Regenerate domain libraries rather than
patching their source. The generated public `.auditAs(...).save(context)` API
is unchanged. A child can supply its own local reason or inherit its parent;
save no longer overwrites child reasons with the root reason.

The [generated SQLite example](examples/trace-chain/README.md) verifies the
six-entity graph through real Q/E/Mutation APIs, independent overlapping saves,
provider/readback failures and two runs on the same database without cleanup.
Its generated library is hash-checked and unmodified. Shared graph vectors,
native transaction/audit tests and the prior canonical SQL cases are separate
evidence, not substitutes for generated acceptance.

Prepared same-type batches, complete entry-point/deep privacy coverage,
file-backed/Expo graph acceptance and immutable internal Registry replay remain
open. Verify local source with `npm test -- --runInBand` and
`bash scripts/verify-examples.sh` before any internal artifact or public release.
This branch does not change the released version or declare Trace Chain complete.

## Sensitive log data

Runtime diagnostic logs redact payload values by default, before delivery to
file, console, buffers, or custom logging sinks. Selecting a diagnostic sink
alone does not authorize plaintext. For controlled troubleshooting only:

```bash
export TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS=I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK
```

Only this exact value enables plaintext permission; empty values, `true`, and
whitespace variants do not. Enabling it emits a warning. Credential-classified
fields remain redacted. The flag does not force every sink to expose values.
SQL without reliable field/literal provenance may be suppressed and marked
`NOT REPLAYABLE`. Execution parameters and persisted business data are unchanged.

Do not put sensitive data in free-text comments or purpose declarations.
TeaQL cannot govern arbitrary application prints or independent driver loggers;
configure those separately. This setting does not erase older plaintext files.
Restrict access and retention when using plaintext diagnostics, then unset the
variable and restart processes when troubleshooting is complete.

`teaql-ts` is the core TypeScript runtime framework for the **TEAQL Federation Protocol (TFP)**. It provides an ultra-lightweight engine responsible for securely translating elegant chained DSLs into cross-language ASTs, allowing you to enjoy a strongly-typed, highly expressive data fetching experience on the frontend (or Node.js).

## Recommended Agent Harness

When building database-backed or federated applications with the TeaQL
TypeScript runtime, we recommend using it together with the [TeaQL Agent Kit](https://github.com/teaql/teaql-agent-kit).
The Agent Kit is TeaQL's continuously evolving **Harness Engineering** method.
It gives coding agents a model-mediated, executable workflow for domain
modeling, deterministic evaluation and repair, code generation, implementation,
and evidence-based verification as the generator and runtimes evolve.

## Runtime Profiles

`teaql-ts` uses explicit package entry points as runtime profiles. Import only the
profile needed by the application:

| Profile | Import | Runtime | Database driver |
| --- | --- | --- | --- |
| Browser / TFP | `teaql-ts` | Browser or Node HTTP client | None |
| PostgreSQL | `teaql-ts/sql/postgres` | Node.js | `pg` |
| MySQL | `teaql-ts/sql/mysql` | Node.js | `mysql2` |
| SQLite | `teaql-ts/sql/sqlite` | Node.js | `better-sqlite3` |
| Expo SQLite | `teaql-ts/sql/expo-sqlite` | React Native / Expo | `expo-sqlite` |
| Browser SQLite | `teaql-ts/sql/browser-sqlite` | Browser Web Worker | `@sqlite.org/sqlite-wasm` |

## Security Boundary

The browser/TFP profile is a client, not a key-custody service. It produces a
controlled AST and sends declared comment/purpose to a trusted TeaQL backend;
it cannot override server tenant, role, field, hard-limit, or optimistic-lock
policy. Browser SQLite is local application storage and does not turn the
browser into a public TFP server.

When a Java, Rust, Go, or .NET backend returns a TeaQL opaque entity reference,
TypeScript treats it as an indivisible string and returns it only for the
operation and purpose for which it was issued. Client code must not parse,
rewrite, log, or manufacture the token, and must not fall back to exposing a raw
internal ID/version pair. The current TypeScript profile deliberately does not
hold backend AES keys or provide local encode/decode APIs; this is a supported
frontend boundary rather than a conformance defect.

Local SQL diagnostics show expanded SQL with parameters masked by default.
Plaintext submitted values require the explicit, access-controlled diagnostic
opt-in above. The server-side envelope, golden vector, stable errors, and
development-only raw-reference acknowledgement are defined in the canonical
[opaque entity reference contract](https://github.com/teaql/teaql-conformance/blob/main/design/opaque-entity-references.md).

## Mutation Policy installation

All profiles support the same application-owned Mutation Policy identity,
approval, warning, and evidence contract. Node SQL and browser SQLite review a
complete generated graph after Checker/Fix and before the first provider
mutation. The TFP browser/Node client applies the policy before `fetch` as
defense in depth; the receiving server still performs the authoritative review.

```typescript
const context = new UserContext()
  .withMutationPolicyRegistry(policyRegistry)
  .withMutationPolicyApprovalProvider(approvalProvider)
  .withMutationGovernanceSink(warningSink);

client.setUserContext(context);
```

A customer policy denial reaches neither SQL, the browser SQLite worker, nor a
TFP mutation request. Missing customer policy or exact approval uses stable
warning codes and remains fail-open, while explicit denial and incomplete graph
plans fail closed. Policy implementations are installed only through trusted
context assembly and are never accepted from JSON or TFP payloads.

### Browser / TFP profile

The default entry point contains the AST, Peggy-generated controlled query
parser, and TFP HTTP client. It does not import or bundle PostgreSQL, MySQL, or
SQLite drivers.

```bash
npm install teaql-ts
```

```typescript
import { SelectQuery, TeaQLClient } from "teaql-ts";

const client = new TeaQLClient({ baseUrl: "/api/teaql" });
const tasks = await client.executeQuery(
  new SelectQuery("Task")
    .comment("task board initial load")
    .limit(20)
    .purpose("show current tasks"),
);
```

Database drivers are optional peer dependencies. A browser application should
import only from `teaql-ts` and should not install a SQL driver package.

### Node SQL profiles

Install only the driver selected by the service:

```bash
# PostgreSQL
npm install teaql-ts pg

# MySQL
npm install teaql-ts mysql2

# SQLite
npm install teaql-ts better-sqlite3
```

Use the matching subpath when building a runtime manually. `ENTITY_SCHEMAS` is
normally generated by `teaql-code-gen`:

```typescript
import { PostgreSQLTeaQLClient } from "teaql-ts/sql/postgres";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";

const client = new PostgreSQLTeaQLClient(
  process.env.DATABASE_URL!,
  ENTITY_SCHEMAS,
);
const ctx = { client };
```

The MySQL and SQLite forms are identical apart from the selected profile:

```typescript
import { MySQLTeaQLClient } from "teaql-ts/sql/mysql";
import { SQLiteTeaQLClient } from "teaql-ts/sql/sqlite";
```

Generated Node projects wrap these classes in `teaql-node-postgres.ts`,
`teaql-node-mysql.ts`, or `teaql-node-sqlite.ts`, so application code normally
imports the generated wrapper and does not pass `ENTITY_SCHEMAS` itself.

In a TeaQL model, `data_service="postgres"`, `data_service="mysql"`, or
`data_service="sqlite"` selects the corresponding generated SQL profile. The
regular TypeScript/browser generation profile continues to use TFP and has no
database-driver import.

### React Native / Expo SQLite profile

Generated `typescript-app-expo` workspaces open and ensure their local schema
on first launch, so a new user does not need to download or prepare a database
file. The generated schema remains the source of truth:

```typescript
import * as SQLite from "expo-sqlite";
import { ExpoSQLiteTeaQLClient } from "teaql-ts/sql/expo-sqlite";
import { ENTITY_SCHEMAS } from "./teaql-expo-sql";

const database = await SQLite.openDatabaseAsync("order-management.db");
const client = new ExpoSQLiteTeaQLClient(database, ENTITY_SCHEMAS);
```

Local queries still require `comment(...)` and `purpose(...)`, and saves still
require an audit reason. The same generated model can instead use the default
TFP client for authenticated server queries. Tenant, user, permission, purpose
policy, hard-limit policy, and continuous-page cursor policy must be supplied
by trusted runtime context; they are not accepted from federation JSON.

### Browser SQLite/WASM profile

Browser-local applications can execute the same generated Q API, E API,
Checker/Fix rules, audited mutations, and Runtime Module bootstrap without a
backend. Install the official SQLite/WASM package and create an
application-owned worker entry point so bundlers can package the worker and
WASM assets correctly:

```bash
npm install teaql-ts @sqlite.org/sqlite-wasm
```

```typescript title="sqlite.worker.ts"
import sqliteWasmUrl from "@sqlite.org/sqlite-wasm/sqlite3.wasm?url";
import { startBrowserSQLiteWorker } from "teaql-ts/sql/browser-sqlite-worker";

startBrowserSQLiteWorker({ wasmUrl: sqliteWasmUrl });
```

```typescript
import { BrowserSQLiteTeaQLClient } from "teaql-ts/sql/browser-sqlite";

const worker = new Worker(new URL("./sqlite.worker.ts", import.meta.url), {
  type: "module",
});
const client = await BrowserSQLiteTeaQLClient.open(worker, ENTITY_SCHEMAS, {
  storage: "memory", // deterministic default; use "opfs" only by explicit choice
});
client.install(GENERATED_RUNTIME_MODULE);
const context = new UserContext().insertResource("dataService", client);
client.setUserContext(context);
await context.ensureSchema();
```

`client.reset(context)` drops browser-local tables, explicitly reconciles the
schema again, and runs the generated mutation bootstrap. OPFS requires the
COOP/COEP headers documented by SQLite. The first browser profile deliberately
buffers stream results and does not promise multi-tab database coordination.
It is intended for Playground, offline, and local-data scenarios—not as a
trusted authorization boundary for tenant or permission enforcement.

See [`examples/browser-sqlite`](./examples/browser-sqlite) for the executable
memory, OPFS, Mutation Policy, generated-mutation seed, Q API, and reset
verification.

## 🌟 Why Will It Make You Say "Wow"?

Take a look at this code driven by `teaql-ts`, and you will feel the beauty of perfectly combining **type safety** with **declarative expression**. You no longer need to manually concatenate GraphQL strings or deal with tedious RESTful parameters, just write this:

### The Ultimate Elegance for Pro Code (Native)
If you are a full-stack developer, after having the generated `Q` Builder, you can write extremely smooth chained code, and the IDE will provide you with 100% intelligent auto-completion:

```typescript
// Business Requirement: Fetch all current tasks, and attach a "statistics panel" (Facet) to count them by status
const result = await Q.tasks()
  .withNameContaining("bug")
  .facetByStatusAs("statusFacet", Q.taskStatuses().count())
  .purpose("find bugs")
  .executeForList(ctx);

// Returns highly integrated JSON, a single response containing both main data and the statistics panel
console.log("Main Data (Tasks):", result.data);
console.log("Statistics Panel (Facets):", result.facets);
```

### Data Mutations and Updates (Mutations)

TeaQL TS also natively supports strongly-typed data creation and updates:

```typescript
import { Task } from './generated/models/Task';

// Create a new Task
const newTask = new Task({ 
    name: "New feature implementation", 
    status: 1001 
});
const createResult = await newTask.auditAs("Create new feature ticket").save(ctx);
const newVersion = createResult.data[0].saved_data.version;

// Update a Task
const updateTask = new Task({ 
    id: 9527, 
    version: newVersion, // Optimistic Concurrency Control requires version
    name: "New feature implementation (Updated)", 
    status: 1002 
});
const updateResult = await updateTask.auditAs("Move to ready").save(ctx);
const updatedVersion = updateResult.data[0].saved_data.version;

// Delete a Task
const taskToDelete = new Task({ id: 9527, version: updatedVersion });
const deleteResult = await taskToDelete.markForDeletion().auditAs("Delete obsolete task").save(ctx);
```

### The Ultimate Safety for Low Code (Dynamic)
If you are building a "No-Code Platform" or "Dynamic Reporting", you can pass the above code directly as a **raw string** from the webpage to the interpreter. It will execute perfectly without any risk of `eval()` injection:

```typescript
// Raw string received from a frontend input box
const userQuery = 'Q.tasks().withNameContaining("bug").facetByStatusAs("statusFacet", Q.taskStatuses().count())';

// Securely parse the complete source into a controlled AST, then invoke only
// methods exposed by the generated Q entry point. No eval/new Function is used.
const request = QueryParser.parse(userQuery, Q);
const result = await request.executeForList(ctx);
```

---

## 📂 Project Architecture and Domain Examples

Architecturally, `teaql-ts` adheres to the philosophy of absolute isolation between the **Framework Layer** and the **Business Layer**. The `src` directory in this repository is the pure, uncontaminated core engine, while all practical business demonstrations are divided by domain in the `examples` directory.

```text
teaql-ts/
├── src/                      # [Framework Layer] Pure core engine, no business code
│   ├── core/                 # AST definitions
│   ├── parser/               # DSL reflection and secure interpreter
│   ├── tfp/                  # Federation network transport protocol layer
│   └── sql/                  # Node-only SQL profiles, available through explicit subpaths
│
└── examples/                 # [Business Example Layer] Integrated demos for various use cases
    │
    ├── task-board/           # Example 1: Task Board System Domain
    │   ├── ts-lib-core/      # Strongly-typed domain models generated by the code generator (e.g. Task, Q.ts)
    │   ├── app-dynamic/      # Runtime Demo based on dynamic string parsing
    │   └── app-native/       # Demo based on fluent hardcoded API
    │
    └── ecommerce-system/     # Example 2: [Planned] E-commerce System Example
```
