import { Q } from "./src/generated/Q";
import { Platform } from "./src/generated/models/Platform";
import { SchoolType } from "./src/generated/models/SchoolType";
import { UserContext } from "./src/teaql-ts";
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
    const context = new UserContext().insertResource("dataService", client);

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
    console.log("PASS TypeScript School Management: forward relations and checker-fixed Update");
    await client.close();
}

main().catch(error => { console.error(error); process.exit(1); });
