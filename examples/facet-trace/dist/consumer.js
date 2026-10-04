"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const Q_1 = require("./lib/src/generated/Q");
const School_1 = require("./lib/src/generated/models/School");
const teaql_ts_1 = require("./lib/src/teaql-ts");
const teaql_node_sqlite_1 = require("./lib/src/teaql-node-sqlite");
const core_1 = require("teaql-ts/sql/core");
const privateName = 'FACET-PRIVATE-SCHOOL';
const privatePlatform = 'Campus Learning Platform';
const purpose = 'verify generated Facet ownership';
function schoolFacets(includeAll, prefix, nested) {
    const query = Q_1.Q.schools();
    if (prefix)
        query.withNameStartingWith(privateName);
    else
        query.withNameIn(privateName, privateName + '-B');
    const types = Q_1.Q.schoolTypes().orderByIdAscending().limit(10).countAs('schoolCount');
    if (nested)
        types.facetByPlatformAs('platforms', Q_1.Q.platforms().withNameIs(privatePlatform)
            .orderByIdAscending().limit(10).countAs('typeCount'), includeAll);
    return query.orderByIdAscending().limit(1).facetBySchoolTypeAs('types', types, includeAll);
}
function assertFacets(list, includeAll, count, nested) {
    const types = list.facets.types;
    strict_1.default.ok(types instanceof teaql_ts_1.SmartList, 'requested type Facet must exist even when empty');
    const pairs = types.map(row => {
        strict_1.default.equal(typeof row.schoolCount, 'number', 'count is present, not defaulted');
        return [String(row.id), row.schoolCount];
    });
    strict_1.default.deepEqual(pairs, includeAll ? [['1001', count], ['1002', 0]]
        : count ? [['1001', count]] : []);
    const platforms = types.facets.platforms;
    if (!nested) {
        strict_1.default.equal(platforms, undefined, 'unrequested nested Facet must remain absent');
        return { types: pairs, platforms: null };
    }
    strict_1.default.ok(platforms instanceof teaql_ts_1.SmartList, 'nested platform Facet must exist');
    const platformPairs = platforms.map(row => [String(row.id), row.typeCount]);
    strict_1.default.deepEqual(platformPairs, includeAll ? [['1', 2]] : count ? [['1', 1]] : []);
    return { types: pairs, platforms: platformPairs };
}
function assertEvidence(entries, diagnostics, root, loaded, nested, logging) {
    const expectedRoutes = loaded ? ['', 'schoolList', 'schoolList', 'schoolList',
        'schoolList/schoolType', 'schoolList/schoolType', 'schoolList/schoolType/platform',
        'schoolList', 'schoolList/schoolType', 'schoolList/schoolType', 'schoolList/schoolType/platform']
        : nested ? ['', '', 'schoolType', 'schoolType', 'schoolType/platform'] : ['', '', 'schoolType'];
    strict_1.default.equal(entries.length, expectedRoutes.length, 'physical SQL count');
    strict_1.default.deepEqual(entries.map(entry => entry.tracePath.filter(node => node.kind === 'relation')
        .map(node => node.name).join('/')), expectedRoutes, 'ordered physical Facet ancestry');
    const allowed = loaded ? [[], ['schoolList'], ['schoolList', 'schoolType'],
        ['schoolList', 'schoolType', 'platform']]
        : [[], ['schoolType'], ['schoolType', 'platform']];
    for (const entry of entries) {
        strict_1.default.equal(entry.executionOutcome, 'success');
        strict_1.default.equal(entry.purpose, purpose);
        strict_1.default.match(entry.comment ?? '', /^load /);
        const path = entry.tracePath;
        strict_1.default.deepEqual(path.slice(0, 2).map(n => [n.kind, n.name, n.detail ?? '']), [['operation', root, 'query'], ['request', root, '']]);
        const route = path.slice(2, -2);
        strict_1.default.ok(allowed.some(a => JSON.stringify(a) === JSON.stringify(route.map(n => n.name))));
        let entity = root;
        for (const node of route) {
            strict_1.default.equal(node.kind, 'relation');
            strict_1.default.equal(node.detail, entity + '.' + node.name);
            entity = node.name === 'schoolList' ? 'School' : node.name === 'schoolType' ? 'SchoolType' : 'Platform';
        }
        strict_1.default.deepEqual(path.slice(-2).map(n => [n.kind, n.name]), [['provider', 'sqlite'], ['sql', 'select']]);
    }
    const deepest = loaded ? 'schoolList/schoolType/platform' : nested ? 'schoolType/platform' : 'schoolType';
    strict_1.default.ok(entries.some(e => e.tracePath.filter(n => n.kind === 'relation')
        .map(n => n.name).join('/') === deepest));
    const counts = entries.filter(e => /COUNT\s*\(/i.test(e.parameterizedSQL));
    strict_1.default.equal(counts.length, loaded ? 4 : nested ? 2 : 1, 'physical membership count SQL');
    strict_1.default.equal(diagnostics.length, logging ? entries.length : 0);
    for (const secret of [privateName, privatePlatform]) {
        strict_1.default.ok(!JSON.stringify(entries).includes(secret), 'private intent leaked in execution evidence: '
            + JSON.stringify(entries.filter(entry => JSON.stringify(entry).includes(secret))));
        strict_1.default.ok(!JSON.stringify(diagnostics).includes(secret), 'private intent leaked in diagnostics');
    }
}
async function main() {
    const database = process.env.TEAQL_FACET_TRACE_DB;
    strict_1.default.ok(database, 'Set TEAQL_FACET_TRACE_DB or run examples/facet-trace/verify.sh');
    const client = new teaql_node_sqlite_1.SQLiteTeaQLClient(database).setDiagnosticSQLLogSink(undefined);
    const context = new teaql_ts_1.UserContext().insertResource('dataService', client);
    try {
        await context.ensureSchema();
        for (const suffix of ['', '-B']) {
            const name = privateName + suffix;
            const existing = await Q_1.Q.schools().withNameIs(name).limit(1)
                .comment('find retained fixture').purpose('idempotent seed').executeForList(context);
            if (!existing.length) {
                const school = Q_1.Q.schools().comment('initialize fixture').purpose('idempotent seed').newEntity(context);
                school.updatePlatform('1').updateSchoolType('1001').updateName(name)
                    .updateAddress('12 River Road').updateEstablishedDate('1995-09-01')
                    .updateStudentCapacity(800).updateActive(true);
                await school.auditAs('seed retained Facet acceptance').save(context);
            }
        }
        const evidence = new core_1.SQLExecutionEvidenceStore();
        const diagnostics = [];
        client.setRuntimeTelemetrySink(evidence).setDiagnosticSQLLogSink({ write: entry => diagnostics.push(entry) });
        let cases = 0;
        for (const prefix of [false, true])
            for (const logging of [false, true])
                for (const includeAll of [false, true])
                    for (const mode of ['root', 'nested', 'loaded']) {
                        client.setQueryLoggingEnabled(logging);
                        for (const empty of [false, true]) {
                            evidence.enableSelect();
                            diagnostics.length = 0;
                            const nested = mode !== 'root', loaded = mode === 'loaded';
                            const request = schoolFacets(includeAll, prefix, nested);
                            if (empty)
                                request.withNameIs('absent');
                            const comment = 'load ' + privateName + (nested ? ' via ' + privatePlatform : '');
                            const results = [];
                            if (loaded) {
                                const parents = await Q_1.Q.schoolTypes().orderByIdAscending().limit(10)
                                    .selectSchoolListWith(request).comment(comment).purpose(purpose).executeForList(context);
                                strict_1.default.deepEqual(parents.map(parent => String(parent.id)), ['1001', '1002']);
                                for (const parent of parents) {
                                    const children = parent.schoolList();
                                    strict_1.default.ok(children instanceof teaql_ts_1.SmartList, 'generated loaded relation lost native SmartList');
                                    strict_1.default.equal(children.isLoaded, true, 'loaded empty and nonempty collections retain loaded state');
                                    const members = !empty && parent.id === '1001' ? 2 : 0;
                                    strict_1.default.equal(children.length, members ? 1 : 0);
                                    if (children.length)
                                        strict_1.default.ok(children[0] instanceof School_1.School);
                                    results.push({ parentId: String(parent.id), visibleRows: children.length,
                                        facets: assertFacets(children, includeAll, members, true) });
                                }
                            }
                            else {
                                const result = await request.comment(comment).purpose(purpose).executeForList(context);
                                strict_1.default.equal(result.length, empty ? 0 : 1);
                                if (!empty)
                                    strict_1.default.ok(result[0] instanceof School_1.School);
                                results.push({ visibleRows: result.length,
                                    facets: assertFacets(result, includeAll, empty ? 0 : 2, nested) });
                            }
                            const entries = evidence.snapshot();
                            assertEvidence(entries, diagnostics, loaded ? 'SchoolType' : 'School', loaded, nested, logging);
                            console.log('FACET_OBSERVED ' + JSON.stringify({ mode, prefix, logging, includeAll, empty,
                                physical: entries.length, counts: entries.filter(entry => /COUNT\s*\(/i.test(entry.parameterizedSQL)).length,
                                results, diagnostics: diagnostics.length, sql: entries }));
                            cases++;
                        }
                        evidence.enableSelect();
                        diagnostics.length = 0;
                        const independent = await Q_1.Q.schoolTypes().withIdIs('1001').limit(1)
                            .comment(privateName + ' is ordinary prose in the next request')
                            .purpose('independent next request').executeForList(context);
                        strict_1.default.equal(evidence.snapshot()[0].comment, privateName + ' is ordinary prose in the next request');
                        const notLoaded = independent[0].schoolList();
                        strict_1.default.equal(notLoaded.isLoaded, false, 'absent relation must remain NotLoaded');
                        strict_1.default.equal(independent[0].isLoaded('schoolList'), false);
                    }
        strict_1.default.equal(cases, 48);
        console.log('TypeScript generated Facet acceptance passed: ' + cases
            + ' scenarios; both logging modes; exact/prefix; root/nested/loaded/empty/includeAll; retained school.db');
    }
    finally {
        await client.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
