import { Q } from "./src/generated/Q";
import { Platform } from "./src/generated/models/Platform";
import { SchoolType } from "./src/generated/models/SchoolType";
import { UserContext } from "./src/teaql-ts";
import { RuntimeModule } from "teaql-ts";
import { GENERATED_RUNTIME_MODULE } from "./src/runtime-module";
import { SQLiteDriver, SQLiteTeaQLClient } from "./src/teaql-node-sqlite";

async function main(): Promise<void> {
    const database = ".local/school.sqlite";
    const cleanup = new SQLiteDriver(database);
    for (const table of ["school_data", "school_type_data", "platform_data", "teaql_id_space"]) {
        await cleanup.query(`DROP TABLE IF EXISTS ${table}`);
    }
    await cleanup.close();

    const client = new SQLiteTeaQLClient(database);
    client.install(GENERATED_RUNTIME_MODULE);
    await client.ensureSchema();
    await client.ensureSchema();
    const context = new UserContext().insertResource("dataService", client);

    const roots = await Q.platforms().comment("Read repeated root seed")
        .purpose("Verify School bootstrap idempotency").executeForList(context);
    const types = await Q.schoolTypes().comment("Read repeated constant seeds")
        .purpose("Verify School bootstrap idempotency").executeForList(context);
    if (roots.length !== 1 || roots[0].id !== "1") throw new Error("Platform(1) bootstrap is not idempotent");
    if (types.length !== 2 || !types.some(value => value.id === "1001") || !types.some(value => value.id === "1002")) {
        throw new Error("SchoolType bootstrap is not idempotent");
    }
    const changedConstants = GENERATED_RUNTIME_MODULE.bootstrap.constants?.map(value =>
        value.entity === "SchoolType" && value.id === "1001"
            ? { ...value, values: { ...value.values, name: "Primary School" } }
            : value) ?? [];
    const changedModule = new RuntimeModule({}, {}, {
        defaultDomainRoot: GENERATED_RUNTIME_MODULE.bootstrap.defaultDomainRoot,
        constants: changedConstants,
    });
    const changedClient = new SQLiteTeaQLClient(database);
    changedClient.install(GENERATED_RUNTIME_MODULE).install(changedModule);
    await changedClient.ensureSchema();
    const changedContext = new UserContext().insertResource("dataService", changedClient);
    const changedPrimary = await Q.schoolTypes().withIdIs("1001")
        .comment("Read reconciled Primary constant")
        .purpose("Verify versioned constant reconciliation")
        .executeForOne(changedContext);
    if (changedPrimary?.name !== "Primary School" || changedPrimary.version !== 2) {
        throw new Error("Changed SchoolType constant was not reconciled exactly once");
    }
    await changedClient.close();
    const extraType = Q.schoolTypes().comment("Create a post-bootstrap school type")
        .purpose("Verify bootstrap ID floor").newEntity(context);
    extraType.updatePlatform(Platform.refer("1"));
    extraType.updateName("Other").updateCode("OTHER").updateDisplayOrder(3);
    await extraType.auditAs("Verify SchoolType ID floor").save(context);
    if (Number(extraType.id) <= 1002) throw new Error("SchoolType ID floor did not advance beyond 1002");

    const school = Q.schools().comment("Create the example school")
        .purpose("Verify generated TypeScript mutations").newEntity(context);
    school.updatePlatform(Platform.refer("1"));
    school.updateSchoolType(SchoolType.refer("1001"));
    school.updateName("Riverside Primary School");
    school.updateAddress("12 River Road, Springfield");
    school.updateEstablishedDate("1995-09-01");
    school.updateStudentCapacity(800);
    school.updateActive(true);
    await school.auditAs("Create Riverside Primary School").save(context);

    const loaded = await Q.schools().withIdIs(school.id)
        .selectPlatformWith(Q.platformsWithMinimalFields().selectName().selectBaseUrl())
        .selectSchoolTypeWith(Q.schoolTypesWithMinimalFields().selectName().selectCode().selectDisplayOrder())
        .comment("Load a school with its forward relations")
        .purpose("Verify generated forward relation metadata")
        .executeForOne(context);
    if (!loaded) throw new Error("School was not loaded");
    const platform = loaded.platform as Platform;
    const schoolType = loaded.schoolType as SchoolType;
    if (platform.name !== "Campus Learning Platform") {
        throw new Error("Platform forward relation was not hydrated");
    }
    if (schoolType.code !== "PRIMARY" || schoolType.displayOrder !== 1) {
        throw new Error("SchoolType forward relation was not hydrated");
    }
    const previousVersion = loaded.version;
    if (previousVersion === undefined) throw new Error("Loaded school has no version");
    loaded.updateName("Riverside Primary School — verified");
    await loaded.auditAs("Verify TypeScript update fixes").save(context);
    if (loaded.version !== previousVersion + 1) throw new Error("Update did not advance version");
    const updated = await Q.schools().withIdIs(loaded.id)
        .comment("Reload the updated school")
        .purpose("Verify update_time fix and persisted mutation").executeForOne(context);
    if (updated?.name !== "Riverside Primary School — verified") {
        throw new Error("Updated school name was not persisted");
    }
    console.log("PASS TypeScript School Management: idempotent bootstrap, ID floor, relations, and Update");
    await client.close();
}

main().catch(error => { console.error(error); process.exit(1); });
