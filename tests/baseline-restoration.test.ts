import { EntityRoot } from '../src/core/entity-root';
import { LoadedScalarSnapshot } from '../src/core/loaded-scalar-snapshot';
import { MutationFieldLayout } from '../src/core/mutation-field-layout';
import { GraphMutationSession, MutationIntent } from '../src/core/request-intent';
import { CheckException } from '../src/core/checker';
import { decimal } from '../src/core/decimal';
import { long } from '../src/core/long';
import { AbstractSQLTeaQLClient, EntitySchema } from '../src/sql/core';
import { SQLiteDriver } from '../src/sql/sqlite';
import { UserContext } from '../src/core/context';
import { RuntimeModule } from '../src/core/runtime-module';

const key = {entity: 'Payment', id: '1'};
const fields = new MutationFieldLayout(key.entity, ['name', 'note', 'amount', 'other', 'count', 'date', 'data', 'bytes', 'id', 'version']);
const graph = () => new GraphMutationSession(new MutationIntent('verify restoration without business writes'));
function loaded(values: Record<string, unknown>) {
  const root = new EntityRoot(); root.setOriginalVersion(key, 3);
  return {root, snapshot: new LoadedScalarSnapshot(values, key, 3)};
}

test.each([
  ['text', {name: 'A'}, 'name', 'A'], ['null', {note: null}, 'note', null],
  ['boolean', {other: false}, 'other', false], ['empty text', {name: ''}, 'name', ''],
  ['zero', {amount: 0}, 'amount', 0], ['exact decimal', {amount: decimal('3.50')}, 'amount', decimal('3.50')],
  ['exact long', {count: long('9007199254740993')}, 'count', long('9007199254740993')],
  ['date', {date: new Date('2032-03-01')}, 'date', new Date('2032-03-01')],
  ['nested JSON', {data: {a: [null, false, 0, '']}}, 'data', {a: [null, false, 0, '']}],
  ['binary', {bytes: new Uint8Array([1, 2, 3])}, 'bytes', new Uint8Array([1, 2, 3])],
] as const)('removes the known %s baseline while keeping versions and lineage', (_name, values, field, original) => {
  const {root, snapshot} = loaded(values);
  root.setTraceChain(key, [{kind: 'auditReason', name: 'Payment', detail: 'retain lineage'}]);
  const trace = root.traceChain(key);
  root.set(key, field, 'intermediate'); root.set(key, field, original);
  graph().discardRestoredFields(fields, root, key, snapshot);
  expect(root.change(key)).toEqual({}); expect(root.hasPending(key)).toBe(false);
  expect(root.originalVersion(key)).toBe(3); expect(root.traceChain(key)).toBe(trace);
});

test.each([
  ['scale', {amount: '3.50'}, 'amount', '3.500'], ['signed zero', {amount: 0}, 'amount', -0],
  ['number and text', {count: 3}, 'count', '3'], ['unknown original', {}, 'note', null],
  ['undefined original', {note: undefined}, 'note', null], ['nonfinite', {amount: NaN}, 'amount', NaN],
  ['invalid date', {date: new Date(NaN)}, 'date', new Date(NaN)],
] as const)('retains %s intent rather than inventing baseline equality', (_name, values, field, value) => {
  const {root, snapshot} = loaded(values); root.set(key, field, value);
  graph().discardRestoredFields(fields, root, key, snapshot);
  expect(Object.is(root.change(key)[field], value)).toBe(true); expect(root.hasPending(key)).toBe(true);
});

test.each(['different entity type', 'different ID type', 'different version', 'no owner', 'new', 'deleted'])('does not borrow a baseline: %s', scenario => {
  const {root} = loaded({name: 'A'});
  let owner = key, version = 3;
  if (scenario === 'different entity type') owner = {...key, entity: 'Order'};
  if (scenario === 'different ID type') owner = {...key, id: 1 as any};
  if (scenario === 'different version') version = 4;
  if (scenario === 'new') root.markAsNew(key);
  if (scenario === 'deleted') root.markAsDeleted(key);
  root.set(key, 'name', 'A');
  const snapshot = scenario === 'no owner' ? new LoadedScalarSnapshot({name: 'A'}) : new LoadedScalarSnapshot({name: 'A'}, owner, version);
  graph().discardRestoredFields(fields, root, key, snapshot);
  expect(root.change(key)).toEqual({name: 'A'});
});

test.each(['nativeName', '_count', '#note', '__proto__'])('rejects invalid raw %s before cancelling a valid restored field', invalid => {
  const {root, snapshot} = loaded({name: 'A', [invalid]: 'invalid'});
  root.set(key, 'name', 'A'); root.set(key, invalid, 'invalid');
  expect(() => graph().discardRestoredFields(fields, root, key, snapshot)).toThrow(CheckException);
  expect(root.change(key)).toHaveProperty('name', 'A'); expect(Object.keys(root.change(key))).toContain(invalid);
});

test('admission preserves immutable rejection even for equal or restored input', () => {
  const {root, snapshot} = loaded({name: 'A'});
  const strict = new MutationFieldLayout('Payment', ['name'], {name: 'IMMUTABLE_CODE'});
  root.set(key, 'name', 'A');
  expect(() => graph().discardRestoredFields(strict, root, key, snapshot)).toThrow('immutable');
  expect(root.change(key)).toEqual({name: 'A'});
});

test('discards only still-observed fields and keeps other typed owners and lifecycle', () => {
  const {root, snapshot} = loaded({name: 'A'}), sibling = {...key, entity: 'Order'};
  root.set(key, 'name', 'A'); root.set(key, 'other', 9); root.set(sibling, 'name', 'A'); root.markAsNew(sibling);
  graph().discardRestoredFields(fields, root, key, snapshot);
  expect(root.change(key)).toEqual({other: 9}); expect(root.change(sibling)).toEqual({name: 'A'}); expect(root.isNew(sibling)).toBe(true);
  root.discardFields(key, {other: 8}); expect(root.change(key)).toEqual({other: 9});
});

test('a complete plan must be sealed explicitly and cannot gain unplanned writes', () => {
  const empty = graph(); expect(empty.isPreparedEmpty).toBe(false); empty.sealPreparedGraph();
  expect(empty.isPreparedEmpty).toBe(true);
  expect(() => empty.recordPreparedMutation()).toThrow('SEALED');
  expect(() => empty.requireMutationAllowed()).toThrow('EMPTY');
  const dirty = graph(); dirty.recordPreparedMutation(); dirty.sealPreparedGraph();
  expect(dirty.isPreparedEmpty).toBe(false); expect(() => dirty.requireMutationAllowed()).not.toThrow();
  expect(() => graph().discardRestoredFields(fields, new EntityRoot(), {...key, entity: 'Order'}, undefined)).toThrow('OWNER');
});

test('discard is bounded and never executes object getters', () => {
  let reads = 0;
  const a = Object.defineProperty({}, 'get', {enumerable: true, get() {reads++; return 'A';}});
  const {root, snapshot} = loaded({data: a}); root.set(key, 'data', a);
  graph().discardRestoredFields(fields, root, key, snapshot);
  expect(reads).toBe(0); expect(root.hasPending(key)).toBe(true);
  const cyclic: any = {}; cyclic.self = cyclic;
  const cycle = loaded({data: cyclic}); cycle.root.set(key, 'data', cyclic);
  graph().discardRestoredFields(fields, cycle.root, key, cycle.snapshot);
  expect(cycle.root.hasPending(key)).toBe(true);
});

const schemas: Record<string, EntitySchema> = {Payment: {table: 'payment', columns: {
  id: {columnName: 'id', logicalType: 'integer', decode: 'string'},
  version: {columnName: 'version', logicalType: 'integer', decode: 'number'},
  displayName: {columnName: 'display_name', modelName: 'display_name', logicalType: 'text', decode: 'string'},
}}};
class Client extends AbstractSQLTeaQLClient { constructor(driver: SQLiteDriver) { super(driver, schemas); } }

test('only a sealed complete empty graph skips transactions, and rejects unplanned mutations', async () => {
  const driver = new SQLiteDriver(':memory:'), client = new Client(driver).setDiagnosticSQLLogSink(undefined);
  const context = new UserContext(); client.setUserContext(context);
  const transaction = jest.spyOn(driver, 'transaction'), query = jest.spyOn(driver, 'query');
  const policy = jest.spyOn(context, 'enterMutationPolicy');
  try {
    expect(await client.executeGraphSave(new MutationIntent('save the unchanged graph'), async () => 'same view', session => session.sealPreparedGraph())).toBe('same view');
    expect(transaction).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled(); expect(policy).not.toHaveBeenCalled();
    await expect(client.executeGraphSave(new MutationIntent('reject unplanned work'), async session =>
      client.executeMutation(session.request({entity: 'Payment', action: 'Create', payload: {}, comment: 'unplanned'})), session => session.sealPreparedGraph())).rejects.toThrow('EMPTY');
    expect(transaction).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled(); expect(client.auditTrace).toHaveLength(0);
    await client.executeGraphSave(new MutationIntent('preserve manual graph transaction semantics'), async () => 'manual');
    expect(transaction).toHaveBeenCalledTimes(1);
  } finally { await client.close(); }
});

test.each(['displayName', '_count', '#field', '__proto__'])('SQL admission rejects raw %s before Checker, policy or provider', async bad => {
  const driver = new SQLiteDriver(':memory:'), client = new Client(driver).setDiagnosticSQLLogSink(undefined);
  const context = new UserContext(); client.setUserContext(context);
  const transaction = jest.spyOn(driver, 'transaction'), query = jest.spyOn(driver, 'query');
  const policy = jest.spyOn(context, 'enterMutationPolicy');
  const checker = jest.fn(); (client as any).checkers.Payment = {checkAndFix: checker};
  try {
    await expect(client.executeMutation({entity: 'Payment', action: 'Update', id: '1', version: 1,
      payload: Object.fromEntries([[bad, 'same']]), comment: 'reject nonmodel field'})).rejects.toThrow('canonical');
    expect(checker).not.toHaveBeenCalled(); expect(policy).not.toHaveBeenCalled(); expect(transaction).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled();
    expect(client.auditTrace).toHaveLength(0);
  } finally { await client.close(); }
});

test('trusted legacy bootstrap metadata adapts native keys before create, reconciliation and repeat', async () => {
  const driver = new SQLiteDriver(':memory:'), client = new Client(driver).setDiagnosticSQLLogSink(undefined);
  const context = new UserContext().insertResource('dataService', client); client.setUserContext(context);
  const expectedPayloads: unknown[] = [];
  const checker = {checkAndFix: (_context: unknown, mutation: any) => {expectedPayloads.push({...mutation.payload});}};
  const module = (name: string) => new RuntimeModule(schemas, {Payment: checker}, {
    defaultDomainRoot: {entity: 'Payment', id: '1', values: {displayName: name}},
  });
  try {
    client.install(module('A')); await context.ensureSchema();
    expect(expectedPayloads.length).toBeGreaterThan(0);
    for (const payload of expectedPayloads) {expect(payload).toHaveProperty('display_name', 'A'); expect(payload).not.toHaveProperty('displayName');}
    const before = client.auditTrace.length; expectedPayloads.length = 0;
    await context.ensureSchema(); expect(client.auditTrace).toHaveLength(before); expect(expectedPayloads).toEqual([]);
    client.install(module('B')); await context.ensureSchema();
    expect(expectedPayloads.length).toBeGreaterThan(0);
    for (const payload of expectedPayloads) {expect(payload).toHaveProperty('display_name', 'B'); expect(payload).not.toHaveProperty('displayName');}
    expect(await driver.query('SELECT id,display_name,version FROM payment')).toMatchObject({rows: [{id: 1, display_name: 'B', version: 2}]});
    const after = client.auditTrace.length; expectedPayloads.length = 0;
    await context.ensureSchema(); expect(client.auditTrace).toHaveLength(after); expect(expectedPayloads).toEqual([]);
  } finally {await client.close();}
});
