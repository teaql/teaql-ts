import assert from 'node:assert/strict';
import { UserContext } from 'teaql-ts';
import { E } from '../../typescript-node-lib-core/src/generated/E';
import { Q } from '../../typescript-node-lib-core/src/generated/Q';
import { GENERATED_RUNTIME_MODULE } from '../../typescript-node-lib-core/src/runtime-module';
import { SQLiteTeaQLClient } from '../../typescript-node-lib-core/src/teaql-node-sqlite';

const districtName = 'Isolated School District';
const schoolName = 'Riverside Primary School';

async function findDistrict(context: UserContext) {
  const rows = await Q.platforms().withNameIs(districtName).limit(2)
    .comment('Find the additional school district')
    .purpose('Reuse the existing isolated root if already registered').executeForList(context);
  assert(rows.length <= 1);
  return rows[0];
}

async function findSchool(context: UserContext) {
  const rows = await Q.schools().withNameIs(schoolName).limit(2)
    .comment('Read the school by its registered name')
    .purpose('Check the business data after schema reconciliation').executeForList(context);
  assert(rows.length <= 1);
  return rows[0];
}

async function main() {
  const database = process.env.TEAQL_SCHEMA_BOOTSTRAP_DB;
  assert(database, 'Supply a SQLite path with TEAQL_SCHEMA_BOOTSTRAP_DB');
  let statements = 0;
  let writes = 0;
  const client = new SQLiteTeaQLClient(database).setDiagnosticSQLLogSink({
    write(entry) {
      statements++;
      if (entry.operation === 'insert' || entry.operation === 'update' || entry.operation === 'delete') writes++;
    },
  });
  try {
    client.install(GENERATED_RUNTIME_MODULE);
    const context = new UserContext().insertResource('dataService', client);
    assert.equal(statements, 0, 'installing the generated module must issue no SQL');
    if (process.env.TEAQL_SCHEMA_BOOTSTRAP_INSTALL_ONLY === '1') {
      console.log('DISTRICT_BOOTSTRAP_INSTALL=' + JSON.stringify({ statements, writes }));
      return;
    }

    await context.ensureSchema();
    const bootstrapWrites = writes;
    await context.ensureSchema();
    assert.equal(writes, bootstrapWrites, 'repeating schema setup must not rewrite roots or constants');
    const startsWithWrites = writes;

    const defaultRoots = await Q.platforms().withNameIs('Default School District').limit(2)
      .comment('Read the bootstrapped district')
      .purpose('Check its fixed ID and initial version').executeForList(context);
    assert.deepEqual(defaultRoots.map(root => [root.id, Number(root.version)]), [['1', 1]]);
    const typeRows = await Q.schoolTypes().orderByIdAscending().limit(3)
      .comment('Read both bootstrapped school types')
      .purpose('Check constant identity and version').executeForList(context);
    assert.deepEqual(typeRows.map(type => [type.id, type.code, Number(type.version)]),
      [['1001', 'PRIMARY', 1], ['1002', 'SECONDARY', 1]]);

    let district = await findDistrict(context);
    let createdDistrict = false;
    if (!district) {
      district = await Q.platforms().comment('Initialize an additional school district')
        .purpose('Allocate a separate root without a caller-selected ID').newEntity(context);
      district.updateName(districtName);
      await district.auditAs('Register the isolated school district').save(context);
      createdDistrict = true;
    }
    assert(district.id && BigInt(district.id) > 1n, 'the new district cannot reuse the default ID');
    const districtId = district.id;

    let createdSchool = false;
    if (!await findSchool(context)) {
      const school = await Q.schools().comment('Initialize a primary school')
        .purpose('Register business data under the additional district').newEntity(context);
      school.updateName(schoolName).updatePlatform(districtId).updateSchoolTypeToPrimary();
      await school.auditAs('Register Riverside as the district primary school').save(context);
      createdSchool = true;
    }
    const loaded = await findSchool(context);
    assert(loaded?.id && BigInt(loaded.id) > 0n);
    assert.equal(E.school(loaded).name().eval(), schoolName);
    assert.equal(E.school(loaded).platformId().eval(), districtId);
    assert.equal(E.school(loaded).schoolTypeId().eval(), '1001');
    assert.equal(Number(E.school(loaded).version().eval()), 1);

    console.log('DISTRICT_BOOTSTRAP_RUN=' + JSON.stringify({
      passed: true, defaultRootId: '1', districtId, schoolId: loaded.id,
      constantIds: typeRows.map(type => type.id), schoolVersion: Number(loaded.version),
      bootstrapWrites, repeatedEnsureWrites: 0, businessWrites: writes - startsWithWrites,
      createdDistrict, createdSchool, runtimeOrigin: require.resolve('teaql-ts'),
    }));
  } finally {
    await client.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
