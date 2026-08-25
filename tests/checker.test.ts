import { CheckException, CheckResult, EntityChecker, ObjectLocation, RuntimeModule, UserContext } from '../src';
import { AbstractSQLTeaQLClient, TeaQLSqlDriver } from '../src/sql/core';

class Driver implements TeaQLSqlDriver {
  readonly databaseKind = 'sqlite' as const;
  transactions = 0;
  statements: string[] = [];
  query = async (sql: string) => { this.statements.push(sql); return { rows: sql.startsWith('SELECT') ? [{ id: '1', version: 1, userEmail: 'a@b.test' }] : [], rowCount: 1 }; };
  stream = async function* () {};
  identifier = (value: string) => `"${value}"`;
  placeholder = () => '?';
  encode = (value: any) => value;
  contains = () => '';
  aggregateFunction = (name: string) => name;
  ensureSchema = async () => {};
  transaction = async <T>(work: (session: any) => Promise<T>) => { this.transactions++; return work(this); };
  nextId = async () => '1';
  ensureIdFloor = async () => {};
  close = async () => {};
}

class Client extends AbstractSQLTeaQLClient {
  constructor(driver: Driver) { super(driver, {}); }
}

test('checker failure is structured, save scoped, and runs before SQL transaction', async () => {
  const driver = new Driver();
  const context = new UserContext();
  let calls = 0;
  const checker: EntityChecker = {
    checkAndFix(ctx, mutation, results: CheckResult[]) {
      calls++;
      expect(ctx.getResource('fixTime')).toBeInstanceOf(Date);
      if (!mutation.payload.name) results.push({ ruleId: 'required', location: ObjectLocation.property('name') });
    },
  };
  const client = new Client(driver).setUserContext(context).install(new RuntimeModule({
    Task: { table: 'task', columns: {} },
  }, { Task: checker }));
  const mutation = { entity: 'Task', action: 'Create', payload: {}, comment: 'test' };

  for (let attempt = 0; attempt < 2; attempt++) {
    await expect(client.executeMutation(mutation)).rejects.toBeInstanceOf(CheckException);
  }
  expect(calls).toBe(2);
  expect(driver.transactions).toBe(0);
  expect(context.getResource('fixTime')).toBeUndefined();
});

test('canonical multiword mutation key reaches checker and native SQL schema', async () => {
  const driver = new Driver();
  const checker: EntityChecker = {
    checkAndFix(_context, mutation, results) {
      if (!mutation.payload.user_email) {
        results.push({ ruleId: 'required', location: ObjectLocation.property('user_email') });
      }
    },
  };
  const client = new Client(driver).setUserContext(new UserContext()).install(new RuntimeModule({
    User: { table: 'user_data', columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      userEmail: { columnName: 'email_address', modelName: 'user_email', logicalType: 'text', decode: 'native' },
    } },
  }, { User: checker }));

  const result = await client.executeMutation({
    entity: 'User', action: 'Create', payload: { user_email: 'a@b.test' }, comment: 'test canonical key',
  });
  expect(result.persistedRecord?.userEmail).toBe('a@b.test');
  expect(driver.statements.some(sql => sql.includes('"email_address"'))).toBe(true);
});

test('update checker can add fixes to an immutable mutation ledger snapshot', async () => {
  const driver = new Driver();
  const context = new UserContext();
  const ledgerKey = { entity: 'Task', id: '1' } as const;
  const checker: EntityChecker = {
    checkAndFix(ctx, mutation) {
      expect(ctx.getResource('fixTime')).toBeInstanceOf(Date);
      mutation.payload.update_time = ctx.getResource('fixTime');
    },
  };
  const client = new Client(driver).setUserContext(context).install(new RuntimeModule({
    Task: { table: 'task_data', columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      name: { columnName: 'name', logicalType: 'text', decode: 'native' },
      updateTime: { columnName: 'update_time', modelName: 'update_time', logicalType: 'datetime', decode: 'date' },
    } },
  }, { Task: checker }));

  const immutableLedgerPayload = Object.freeze({ name: 'Updated task' });
  await expect(client.executeMutation({
    entity: 'Task', action: 'Update', payload: immutableLedgerPayload,
    id: '1', version: 1, comment: 'update task', ledgerKey,
  })).resolves.toBeDefined();

  expect(Object.isFrozen(immutableLedgerPayload)).toBe(true);
  expect((immutableLedgerPayload as Record<string, unknown>).update_time).toBeUndefined();
  expect(context.entityRoot.change(ledgerKey).update_time).toBeInstanceOf(Date);
  expect(driver.statements.some(sql => sql.includes('"update_time" = ?'))).toBe(true);
});
