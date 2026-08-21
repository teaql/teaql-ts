import { CheckException, CheckResult, EntityChecker, RuntimeModule, UserContext } from '../src';
import { AbstractSQLTeaQLClient, TeaQLSqlDriver } from '../src/sql/core';

class Driver implements TeaQLSqlDriver {
  readonly databaseKind = 'sqlite' as const;
  transactions = 0;
  query = async () => ({ rows: [], rowCount: 1 });
  stream = async function* () {};
  identifier = (value: string) => `"${value}"`;
  placeholder = () => '?';
  encode = (value: any) => value;
  contains = () => '';
  aggregateFunction = (name: string) => name;
  ensureSchema = async () => {};
  transaction = async <T>(work: (session: any) => Promise<T>) => { this.transactions++; return work(this); };
  nextId = async () => '1';
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
      if (!mutation.payload.name) results.push({ ruleId: 'required', location: 'name' });
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
