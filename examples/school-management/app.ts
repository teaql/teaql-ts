import { Q } from "./src/generated/Q";
import { E } from "./src/generated/E";
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
    const context = new UserContext().insertResource("dataService", client);
    await context.ensureSchema();
    await context.ensureSchema();

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
    const changedContext = new UserContext().insertResource("dataService", changedClient);
    await changedContext.ensureSchema();
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
    school.updateSchoolTypeToPrimary();
    school.updateName("Riverside Primary School");
    school.updateAddress("12 River Road, Springfield");
    school.updateEstablishedDate("1995-09-01");
    school.updateStudentCapacity(800);
    school.updateActive(true);
    await school.auditAs("Create Riverside Primary School").save(context);

    const primarySchools = await Q.schools().withSchoolTypeIsPrimary()
        .comment("Read schools linked through the PRIMARY helper")
        .purpose("Verify constant helper mutation-ledger semantics")
        .executeForList(context);
    if (primarySchools.length !== 1 || E.school(primarySchools[0]).schoolTypeId().eval() !== "1001") {
        throw new Error("PRIMARY helper did not persist and hydrate school_type=1001");
    }

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

    const queryCases: Array<[string, any, number]> = [
        ["string equality", Q.schools().withNameIs("Riverside Primary School"), 1],
        ["string inequality", Q.schools().withNameIsNot("Another School"), 1],
        ["string membership", Q.schools().withNameIn("Riverside Primary School", "Another School"), 1],
        ["negative membership", Q.schools().withNameNotIn("Another School"), 1],
        ["contains", Q.schools().withNameContaining("Primary"), 1],
        ["negative contains", Q.schools().withNameNotContaining("Secondary"), 1],
        ["starts with", Q.schools().withNameStartingWith("Riverside"), 1],
        ["negative starts with", Q.schools().withNameNotStartingWith("Lakeside"), 1],
        ["ends with", Q.schools().withNameEndingWith("School"), 1],
        ["negative ends with", Q.schools().withNameNotEndingWith("Academy"), 1],
        ["number range", Q.schools().withStudentCapacityBetween(700, 900), 1],
        ["strict comparison", Q.schools().withStudentCapacityGreaterThan(799).withStudentCapacityLessThan(801), 1],
        ["date range", Q.schools().withEstablishedDateBetween("1995-01-01", "1995-12-31"), 1],
        ["known", Q.schools().withAddressIsKnown(), 1],
        ["unknown", Q.schools().withAddressIsUnknown(), 0],
        ["boolean", Q.schools().whichAreActive(), 1],
        ["constant relation", Q.schools().withSchoolTypeIsPrimary(), 1],
    ];
    for (const [label, request, expected] of queryCases) {
        const result = await request.comment(`Query parity: ${label}`)
            .purpose("Execute the shared School Query conformance case")
            .executeForList(context);
        if (result.length !== expected) throw new Error(`${label}: expected ${expected}, got ${result.length}`);
    }
    const projected = await Q.schools().selectName().orderByIdDescending()
        .comment("Query parity: projection and ordering")
        .purpose("Execute the shared School Query conformance case")
        .executeForList(context);
    if (projected.length !== 1 || projected[0].name !== "Riverside Primary School") {
        throw new Error("projection/order query did not preserve typed School result");
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
    console.log("PASS TypeScript School Management: bootstrap, portable Query parity, relations, and Update");
    await client.close();
}

main().catch(error => { console.error(error); process.exit(1); });
