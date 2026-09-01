import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CheckException, UserContext } from "./teaql-ts";
import { E, TeaQLNotLoadedError } from "./generated/E";
import { Q } from "./generated/Q";
import { WorkItem } from "./generated/models/WorkItem";
import { SQLiteTeaQLClient } from "./teaql-node-sqlite";

async function main(): Promise<void> {
  const database = path.resolve(__dirname, "../.local/conformance.sqlite");
  fs.mkdirSync(path.dirname(database), { recursive: true });
  fs.rmSync(database, { force: true });
  const client = new SQLiteTeaQLClient(database);
  const context = new UserContext().insertResource("dataService", client);
  client.setUserContext(context);

  await context.ensureSchema();
  console.log("PASS ensureSchema (explicit SQLite DDL and Platform(1) bootstrap)");

  const sqlBeforeInvalidSave = client.sqlTrace.length;
  const invalid = new WorkItem().updatePlatform("1");
  await assert.rejects(invalid.auditAs("Checker must reject a missing title").save(context), (error: unknown) => {
    assert(error instanceof CheckException);
    assert(error.violations.some(item => item.ruleId === "required" && String(item.location).includes("title")));
    return true;
  });
  assert.equal(client.sqlTrace.length, sqlBeforeInvalidSave, "Checker must run before mutation SQL");
  console.log("PASS Checker (canonical title key, rejected before SQL)");

  const created = await new WorkItem()
    .updateTitle("Verify TypeScript runtime")
    .updatePlatform("1")
    .auditAs("Create conformance work item").save(context);
  assert(created.id);
  assert.equal(created.version, 1);
  console.log(`PASS Create (id=${created.id}, version=${created.version})`);

  const queried = await Q.workItems().withIdIs(created.id)
    .selectPlatformWith(Q.platforms().selectName())
    .comment("Load the complete work item before mutation")
    .purpose("Verify typed Q API and update semantics").executeForOne(context);
  assert(queried);
  assert.equal(queried.title, "Verify TypeScript runtime");
  assert.equal(E.workItem(queried).platform().name().eval(), "Runtime Example");
  console.log("PASS Q API (typed WorkItem)");

  assert.equal(E.workItem(queried).title().eval(), "Verify TypeScript runtime");
  assert.equal(E.workItem(queried).description().orElse("N/A"), "N/A");
  const minimal = await Q.workItemsWithMinimalFields().withIdIs(created.id)
    .comment("Load only mandatory identity fields")
    .purpose("Verify E not-loaded semantics").executeForOne(context);
  assert(minimal);
  assert.throws(() => E.workItem(minimal).title().eval(), TeaQLNotLoadedError);
  console.log("PASS E API (loaded, null fallback, and not-loaded are distinct)");

  const previousVersion = queried.version!;
  await queried.updateTitle("Verified TypeScript runtime")
    .auditAs("Update conformance work item").save(context);
  assert.equal(queried.version, previousVersion + 1);
  console.log(`PASS Update (version ${previousVersion} -> ${queried.version})`);

  await queried.markForDeletion().auditAs("Delete conformance work item").save(context);
  const remaining = await Q.workItems().withIdIs(created.id)
    .comment("Verify soft-deleted work item is excluded")
    .purpose("Verify delete semantics").executeForList(context);
  assert.equal(remaining.length, 0);
  console.log("PASS Delete (default Q excludes deleted rows)");

  await client.close();
  console.log("PASS TypeScript minimum runtime conformance: 7/7");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
