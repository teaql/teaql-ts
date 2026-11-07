import { internalId, UserContext } from '../src';
import { AbstractSQLTeaQLClient, TeaQLSqlDriver, SqlSession } from '../src/sql/core';

test.each(['1', '9007199254740993', '9223372036854775807', 1, 37n])('preserves exact positive ID %s', value => {
  expect(internalId(value)).toBe(String(value));
});
test.each([undefined, null, true, false, {}, [], 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1,
  '', '0', '-1', '+1', '01', '1.0', ' 1', '1 ', '1e2', 0n, -1n, '9223372036854775808'])('rejects invalid ID %s', value => {
  expect(() => internalId(value)).toThrow();
});

test('awaits the selected provider and passes the requesting Context and type without storage fallback', async () => {
  let complete!: (value: string) => void;
  const generateId = jest.fn(() => new Promise<string>(resolve => { complete = resolve; }));
  const reserveInternalId = jest.fn(async () => '99');
  const context = new UserContext().insertResource('dataService', {reserveInternalId}).withInternalIdGenerator({generateId});
  let returned = false;
  const pending = context.generateInternalId('PurchaseOrder').then(value => { returned = true; return value; });
  await Promise.resolve(); expect(returned).toBe(false);
  expect(generateId).toHaveBeenCalledWith('PurchaseOrder', context);
  complete('9007199254740993'); expect(await pending).toBe('9007199254740993');
  expect(reserveInternalId).not.toHaveBeenCalled();
});

test('preserves provider error identity, rejects zero, recovers and never falls back', async () => {
  const failure = new Error('allocator unavailable');
  const generateId = jest.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce('0').mockResolvedValueOnce('7');
  const reserveInternalId = jest.fn(async () => '99');
  const context = new UserContext().insertResource('dataService', {reserveInternalId}).withInternalIdGenerator({generateId});
  await expect(context.generateInternalId('School')).rejects.toBe(failure);
  await expect(context.generateInternalId('School')).rejects.toThrow('positive');
  await expect(context.generateInternalId('School')).resolves.toBe('7');
  expect(generateId).toHaveBeenCalledTimes(3); expect(reserveInternalId).not.toHaveBeenCalled();
});

test.each([undefined, null, {}, {generateId: 1}])('an explicitly invalid provider cannot select the default: %s', provider => {
  const reserveInternalId = jest.fn(async () => '1');
  const context = new UserContext().insertResource('dataService', {reserveInternalId}).insertResource('idGenerator', provider);
  return expect(context.generateInternalId('School')).rejects.toThrow('Configured internal ID generator').then(() => {
    expect(reserveInternalId).not.toHaveBeenCalled();
  });
});

test('default allocation requires the actual Context data service reservation capability', async () => {
  const context = new UserContext();
  await expect(context.generateInternalId('School')).rejects.toThrow('dataService');
  context.insertResource('dataService', {});
  await expect(context.generateInternalId('School')).rejects.toThrow('reserveInternalId');
  const reserveInternalId = jest.fn(async () => '8'); context.insertResource('dataService', {reserveInternalId});
  await expect(context.generateInternalId('School')).resolves.toBe('8');
  expect(reserveInternalId).toHaveBeenCalledWith('School', context);
});

test.each(['', ' ', ' School', 'School '])('invalid entity name %s does not invoke a provider', async entity => {
  const generateId = jest.fn(() => '1'), context = new UserContext().withInternalIdGenerator({generateId});
  await expect(context.generateInternalId(entity)).rejects.toThrow('entity type'); expect(generateId).not.toHaveBeenCalled();
});

class Client extends AbstractSQLTeaQLClient {
  constructor(driver: TeaQLSqlDriver) { super(driver, {School: {table: 'school_data', columns: {}}}); }
}
test('SQL default reserves through its driver transaction; invalid result rolls back before returning', async () => {
  const nextId = jest.fn().mockResolvedValueOnce('0').mockResolvedValueOnce('9');
  const outcomes: string[] = [], session = {} as SqlSession;
  const transaction = jest.fn(async (work: (value: SqlSession) => Promise<string>) => {
    try { const result = await work(session); outcomes.push('commit'); return result; }
    catch (error) { outcomes.push('rollback'); throw error; }
  });
  const client = new Client({nextId, transaction} as unknown as TeaQLSqlDriver);
  const context = new UserContext().insertResource('dataService', client);
  const mutation = jest.spyOn(client, 'executeMutation'), preflight = jest.spyOn(client, 'preflightMutation');
  await expect(context.generateInternalId('School')).rejects.toThrow('positive');
  await expect(context.generateInternalId('School')).resolves.toBe('9');
  expect(outcomes).toEqual(['rollback', 'commit']); expect(nextId).toHaveBeenNthCalledWith(2, session, 'School');
  expect(mutation).not.toHaveBeenCalled(); expect(preflight).not.toHaveBeenCalled();
});

test('concurrent SQL reservations serialize and preserve a failed provider error', async () => {
  let active = 0, maximum = 0, sequence = 10;
  const failure = new Error('storage reservation failed');
  const nextId = jest.fn().mockRejectedValueOnce(failure).mockImplementation(async () => String(++sequence));
  const transaction = async (work: (session: SqlSession) => Promise<string>) => {
    active++; maximum = Math.max(maximum, active);
    try { await Promise.resolve(); return await work({} as SqlSession); } finally { active--; }
  };
  const client = new Client({nextId, transaction} as unknown as TeaQLSqlDriver);
  const context = new UserContext().insertResource('dataService', client);
  const results = await Promise.allSettled([1, 2, 3].map(() => context.generateInternalId('School')));
  expect(results).toEqual([{status: 'rejected', reason: failure}, {status: 'fulfilled', value: '11'}, {status: 'fulfilled', value: '12'}]);
  expect(maximum).toBe(1);
});

test('SQL reservation rejects a driver string outside its exact numeric storage domain', async () => {
  const transaction = jest.fn(async (work: (session: SqlSession) => Promise<string>) => work({} as SqlSession));
  const nextId = jest.fn(async () => '9007199254740992');
  const client = new Client({nextId, transaction} as unknown as TeaQLSqlDriver);
  const context = new UserContext().insertResource('dataService', client);
  await expect(context.generateInternalId('School')).rejects.toThrow('exhausted');
});
