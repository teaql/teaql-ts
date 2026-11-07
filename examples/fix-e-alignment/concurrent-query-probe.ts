import { decimal, FixedBusinessClock, UserContext } from '../../src';
import { QueryRequest } from '../../src/core/request-intent';
import { queryExecutionOwner } from '../../src/core/query-snapshot';
import type { SQLExecutionMetadata } from '../../src/sql/core';
import { Q } from 'generated/generated/Q';
import { E } from 'generated/generated/E';
import { SQLiteTeaQLClient } from 'generated/teaql-node-sqlite';

function signal() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {resolve = done;});
  return {promise, resolve};
}

/** Read-only test seam for Context storage; never installs request provenance. */
function contextSnapshot(context: UserContext) {
  const keys = Reflect.ownKeys(context);
  const fields = keys.map(key => [key, (context as any)[key]] as const);
  const maps = fields.filter(([, value]) => value instanceof Map)
    .map(([key, value]) => [key, [...value.entries()]] as const);
  return {fieldCount: fields.length, matches: () => {
    const now = Reflect.ownKeys(context);
    return now.length === keys.length && keys.every(key => now.includes(key))
      && fields.every(([key, value]) => Object.is((context as any)[key], value))
      && maps.every(([key, entries]) => {
        const map = (context as any)[key] as Map<unknown, unknown>;
        return map.size === entries.length && entries.every(([k, v]) => map.has(k) && Object.is(map.get(k), v));
      });
  }};
}

export async function verifyConcurrentQuery(filename: string): Promise<void> {
  const round = Number(process.env.TEAQL_FIX_E_ROUND);
  if (![1, 2].includes(round)) throw new Error('An explicit retained-example round is required');
  const context = new UserContext().withBusinessClock(new FixedBusinessClock(new Date('2032-02-29T10:15:30Z')));
  const client = new SQLiteTeaQLClient(filename).setUserContext(context);
  context.insertResource('dataService', client);
  const events: SQLExecutionMetadata[] = [];
  client.setDiagnosticSQLLogSink({write: value => {events.push(value);}});
  const driver = (client as any).driver;
  const query = jest.spyOn(driver, 'query');
  const entered = signal(), release = signal();
  const tasks: Promise<unknown>[] = [];
  let execute: ReturnType<typeof jest.spyOn> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await context.ensureSchema();
    const prior = await Q.purchaseOrders().limit(5).comment('Determine the concurrent-query example round')
      .purpose('Retain both rounds without resetting SQLite').executeForList(context);
    expect(prior).toHaveLength((round - 1) * 2);
    const ids: Record<string, string> = {}, childIds: Record<string, string> = {};
    const auditBeforeSeed = client.auditTrace.length;
    query.mockClear();
    for (const label of ['alpha', 'beta']) {
      const parent = (await Q.purchaseOrders().comment('Prepare the ' + label + ' query fixture')
        .purpose('Use generated audited graph mutation before concurrent reads').newEntity(context))
        .updateContactPhone(label === 'alpha' ? '5550701' : '5550702').updateInternalNote(null);
      const child = (await Q.orderItems().comment('Prepare the ' + label + ' query leaf')
        .purpose('Read child identity through generated Q and E').newEntity(context))
        .updateProductName(label + ' child').updateUnitPrice(decimal('1.00'));
      parent.orderItemList().push(child);
      await parent.auditAs('Create the ' + label + ' concurrent-query graph').save(context);
      if (!parent.id) throw new Error('Missing persisted parent identity');
      ids[label] = String(parent.id);
      const seeded = (await Q.purchaseOrders().withIdIs(parent.id)
        .selectOrderItemListWith(Q.orderItems().limit(10).comment('Read the saved ' + label + ' child'))
        .limit(1).comment('Read back the ' + label + ' graph').purpose('Never infer a child ID from allocation order')
        .executeForList(context))[0];
      const childId = E.purchaseOrder(seeded).orderItemList().first().id().eval();
      if (!childId) throw new Error('Missing persisted child identity');
      childIds[label] = String(childId);
    }
    expect(client.auditTrace.length - auditBeforeSeed).toBe(4);
    expect(query.mock.calls.filter(call => /^\s*INSERT INTO\s+"?(?:purchase_order|order_item)_data\b/i.test(String(call[0])))).toHaveLength(4);
    const suppliedContexts: UserContext[] = [];
    const load = async (label: string, owner: string, supplied: UserContext) => {
      suppliedContexts.push(supplied);
      return (await Q.purchaseOrders().withIdIs(ids[owner])
        .selectOrderItemListWith(Q.orderItems().limit(10).comment(label + ' children'))
        .limit(1).comment(label + ' root').purpose(label + ' purpose').executeForList(supplied))[0];
    };
    await load('calibration', 'alpha', context);
    suppliedContexts.length = 0; events.length = 0; query.mockClear();
    const auditStart = client.auditTrace.length, baseline = contextSnapshot(context);
    const actual = (client as any).executeQueryWithIntent.bind(client);
    const live: QueryRequest[] = [];
    let providerCalls = 0, rootCalls = 0;
    execute = jest.spyOn(client as any, 'executeQueryWithIntent').mockImplementation(async (...args: any[]) => {
      providerCalls++;
      // Observe the actual runtime-created execution owner, not a test wrapper.
      const owner = queryExecutionOwner(args[0]);
      if (!(owner instanceof QueryRequest)) throw new Error('Runtime query snapshot has no formal request owner');
      if (!owner.parentRequest) rootCalls++;
      if (!owner.parentRequest && ['alpha root', 'beta root'].includes(owner.comment)) {
        live.push(owner); if (live.length === 2) entered.resolve();
        await release.promise;
      }
      return actual(...args);
    });
    let alphaDone = false, betaDone = false;
    const alpha = load('alpha', 'alpha', context).finally(() => {alphaDone = true;});
    const beta = load('beta', 'beta', context).finally(() => {betaDone = true;});
    tasks.push(alpha, beta);
    // Keep failures observed while the bounded overlap checkpoint is waiting.
    void alpha.catch(() => undefined); void beta.catch(() => undefined);
    await Promise.race([entered.promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Concurrent generated requests did not reach the overlap checkpoint')), 5000);
    })]);
    clearTimeout(timer); timer = undefined;
    const bothLive = !alphaDone && !betaDone;
    const distinctRoots = live.length === 2 && live[0].rootRequest !== live[1].rootRequest;
    const contextUnchangedWhileLive = baseline.matches();
    const crossInvocationErrors = [[live[0], live[1]], [live[1], live[0]]].map(([a, b]) => {
      try {a.withQuery(b.query); return null;} catch (error) {return error instanceof Error ? error.message : String(error);}
    });
    const checkpoints = live.map(request => ({comment: request.comment, purpose: request.purpose,
      parentAbsent: request.parentRequest === undefined, rootIsSelf: request.rootRequest === request,
      frozen: Object.isFrozen(request), nodes: request.traceChain}));
    release.resolve();
    const [a, b] = await Promise.all([alpha, beta]);
    const after = await load('after', 'alpha', context);
    const beforeE = {provider: providerCalls, queries: query.mock.calls.length, logs: events.length};
    const values: Record<string, unknown> = {};
    for (const [label, row] of [['alpha', a], ['beta', b], ['after', after]] as const) {
      const owner = label === 'after' ? 'alpha' : label;
      const value = {id: String(row.id), phone: E.purchaseOrder(row).contactPhone().eval(),
        count: E.purchaseOrder(row).orderItemList().size().eval(), product: E.purchaseOrder(row).orderItemList().first().productName().eval()};
      expect(value).toEqual({id: ids[owner], phone: owner === 'alpha' ? '5550701' : '5550702', count: 1, product: owner + ' child'});
      values[label] = value;
    }
    const observation = {language: 'typescript', round, sameContext: suppliedContexts.length === 3 && suppliedContexts.every(c => c === context),
      distinctRoots, bothLive, overlapEntered: live.length, checkpoints, crossInvocationErrors,
      contextUnchangedWhileLive, contextUnchangedAfter: baseline.matches(), contextFieldCount: baseline.fieldCount,
      providerCalls, rootCalls, physicalQueries: query.mock.calls.filter(call => /^\s*SELECT\b/i.test(String(call[0]))).length,
      physicalWrites: query.mock.calls.filter(call => /^\s*(?:INSERT|UPDATE|DELETE)\b/i.test(String(call[0]))).length,
      eProviderReads: providerCalls - beforeE.provider, eSqlReads: query.mock.calls.length - beforeE.queries, eLogEntries: events.length - beforeE.logs,
      auditEvents: client.auditTrace.length - auditStart, ids, childIds, values, synchronousSqliteDriver: true,
      events: events.map(m => ({operation: m.operation, outcome: m.executionOutcome, resultCount: m.resultCount,
        comment: m.comment, purpose: m.purpose, sql: m.parameterizedSQL, parameters: m.parameters,
        business: m.traceChain, physical: m.tracePath.map(({kind, name, detail}) => ({kind, name, detail}))})),
      generatedImplementationsModified: false};
    process.stdout.write('TYPESCRIPT_CONCURRENT_QUERY_OBSERVATION=' + JSON.stringify(observation) + '\n');
    expect(observation).toMatchObject({sameContext: true, distinctRoots: true, bothLive: true, overlapEntered: 2,
      contextUnchangedWhileLive: true, contextUnchangedAfter: true, physicalQueries: 6, physicalWrites: 0,
      rootCalls: 3, providerCalls: 6, eProviderReads: 0, eSqlReads: 0, eLogEntries: 0, auditEvents: 0});
    expect(crossInvocationErrors.every(message => message?.startsWith('QUERY_SCOPE_OWNER_MISMATCH:'))).toBe(true);
    expect(events).toHaveLength(6);
    process.stdout.write('TYPESCRIPT_CONCURRENT_QUERY=' + JSON.stringify({passed: true, observation}) + '\n');
  } finally {
    if (timer) clearTimeout(timer); release.resolve();
    await Promise.allSettled(tasks); execute?.mockRestore(); query.mockRestore(); await client.close();
  }
}
