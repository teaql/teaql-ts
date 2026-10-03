import { UserContext } from '../src/core/context';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SelectQuery } from '../src/core/ast';
import { RuntimeModule } from '../src/core/runtime-module';
import { EntitySchema, SQLExecutionEvidenceStore } from '../src/sql/core';
import { MutationRequest } from '../src/core/request-intent';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';

function assertProviderSchemaAPIIsHidden(client: SQLiteTeaQLClient): void {
  // @ts-expect-error Ensure Schema is intentionally available only through UserContext.
  void client.ensureSchema;
}

void assertProviderSchemaAPIIsHidden;

const schemas: Record<string, EntitySchema> = {
  Platform: {
    table: 'platform_data',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      name: { columnName: 'name', logicalType: 'text', decode: 'native' },
    },
  },
  OrderStatus: {
    table: 'order_status_data',
    columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      name: { columnName: 'name', logicalType: 'text', decode: 'native' },
      code: { columnName: 'code', logicalType: 'text', decode: 'native' },
    },
  },
};

function moduleWithStatus(name: string): RuntimeModule {
  return new RuntimeModule(schemas, {}, {
    defaultDomainRoot: { entity: 'Platform', id: '1', values: { name: 'Default Platform' } },
    constants: [{ entity: 'OrderStatus', id: '1001', values: { name, code: 'PENDING' } }],
  });
}

function read(entity: string): SelectQuery {
  return new SelectQuery(entity).comment('read bootstrap evidence').purpose('verify Ensure Schema');
}

it.each([false, true])('metadata bootstrap owns request intent and committed audit with logging=%p', async logging => {
  const client = new SQLiteTeaQLClient(':memory:', {}).install(moduleWithStatus('Pending')) as SQLiteTeaQLClient;
  const evidence = new SQLExecutionEvidenceStore();
  client.setRuntimeTelemetrySink(evidence);
  client.setQueryLoggingEnabled(logging).setMutationLoggingEnabled(logging);
  const mutate = jest.spyOn(client, 'executeMutation');
  const context = new UserContext().insertResource('dataService', client)
    .insertResource('bootstrapActor', 'prior actor').insertResource('bootstrapCategory', 'prior category');
  try {
    await context.ensureSchema();
    await context.ensureSchema();
    expect(context.getResource('bootstrapActor')).toBe('prior actor');
    expect(context.getResource('bootstrapCategory')).toBe('prior category');
    expect(mutate).toHaveBeenCalledTimes(2);
    for (const [request] of mutate.mock.calls) {
      expect(request).toBeInstanceOf(MutationRequest);
      expect(request.comment).toBe('reconcile model bootstrap data');
    }
    const events = client.auditTrace;
    expect(events).toHaveLength(2);
    expect(events.map(event => event.entity)).toEqual(['Platform', 'OrderStatus']);
    for (const event of events) {
      expect(event.actor).toBe('teaql-generated-bootstrap');
      expect(event.category).toBe('runtime-bootstrap');
    }
    const entries = evidence.snapshot();
    expect(entries).toHaveLength(8); // two lookup/insert/readback triples, then two no-op lookups
    expect(entries.filter(entry => entry.comment === 'inspect model bootstrap record')).toHaveLength(4);
    for (const entry of entries) {
      expect((entry.comment ?? entry.auditReason)?.trim()).toBeTruthy();
      if (entry.operation === 'select') expect(entry.purpose?.trim()).toBeTruthy();
      expect(entry.tracePath.map(node => node.kind)).toEqual([
        'operation', entry.operation === 'select' ? 'request' : 'entity', 'provider', 'sql',
      ]);
    }
  } finally { await client.close(); }
});

it.each([false, true])('metadata bootstrap cannot bypass Checker with logging=%p', async logging => {
  const checkAndFix = jest.fn(() => { throw new Error('constant checker refused'); });
  const client = new SQLiteTeaQLClient(':memory:', {}).install(new RuntimeModule(
    schemas, { OrderStatus: { checkAndFix } }, moduleWithStatus('Pending').bootstrap,
  )) as SQLiteTeaQLClient;
  client.setQueryLoggingEnabled(logging).setMutationLoggingEnabled(logging);
  const context = new UserContext().insertResource('dataService', client);
  try {
    await expect(context.ensureSchema())
      .rejects.toThrow('constant checker refused');
    expect(checkAndFix).toHaveBeenCalledTimes(1);
    expect(client.auditTrace).toEqual([]);
    expect(context.getResource('bootstrapActor')).toBeUndefined();
    expect(context.getResource('bootstrapCategory')).toBeUndefined();
    expect(await client.executeQuery(read('Platform'))).toEqual([]);
    expect(await client.executeQuery(read('OrderStatus'))).toEqual([]);
  } finally { await client.close(); }
});

it('serializes bootstrap callers without losing the active bootstrap actor', async () => {
  const client = new SQLiteTeaQLClient(':memory:', {}).install(moduleWithStatus('Pending')) as SQLiteTeaQLClient;
  const callers = [new UserContext(), new UserContext()]
    .map(context => context.insertResource('dataService', client));
  try {
    await Promise.all(callers.map(context => context.ensureSchema()));
    expect(client.auditTrace).toHaveLength(2);
    for (const event of client.auditTrace) expect(event.actor).toBe('teaql-generated-bootstrap');
    for (const caller of callers) expect(caller.getResource('bootstrapActor')).toBeUndefined();
    expect(await client.executeQuery(read('OrderStatus'))).toEqual([
      expect.objectContaining({ id: '1001', version: 1, code: 'PENDING' }),
    ]);
  } finally { await client.close(); }
});

it('does not mistake a soft-deleted constant for a missing primary key', async () => {
  const client = new SQLiteTeaQLClient(':memory:', {}).install(moduleWithStatus('Pending')) as SQLiteTeaQLClient;
  const context = new UserContext().insertResource('dataService', client);
  try {
    await context.ensureSchema();
    await client.executeMutation({ entity: 'OrderStatus', action: 'Delete', id: '1001',
      version: 1, comment: 'retire a constant for the bootstrap identity regression' });
    const audits = client.auditTrace.length;
    await context.ensureSchema();
    expect(client.auditTrace).toHaveLength(audits);
    expect(await client.executeQuery(read('OrderStatus'))).toEqual([]);
  } finally { await client.close(); }
});

it('reconciles bootstrap data idempotently and advances ID spaces', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'teaql-ts-bootstrap-'));
  const database = path.join(directory, 'bootstrap.sqlite');
  try {
    const first = new SQLiteTeaQLClient(database, {}).install(moduleWithStatus('Pending')) as SQLiteTeaQLClient;
    await new UserContext().insertResource('dataService', first).ensureSchema();
    await new UserContext().insertResource('dataService', first).ensureSchema();

    expect(await first.executeQuery(read('Platform'))).toEqual([
      expect.objectContaining({ id: '1', version: 1, name: 'Default Platform' }),
    ]);
    expect(await first.executeQuery(read('OrderStatus'))).toEqual([
      expect.objectContaining({ id: '1001', version: 1, name: 'Pending', code: 'PENDING' }),
    ]);

    const isolated = await first.executeMutation({
      entity: 'Platform', action: 'Create', payload: { name: 'Isolated Platform' },
      comment: 'create an isolated data graph',
    });
    expect(isolated.id).not.toBe('1');
    await first.close();

    const second = new SQLiteTeaQLClient(database, {}).install(
      moduleWithStatus('Awaiting Payment'),
    ) as SQLiteTeaQLClient;
    await new UserContext().insertResource('dataService', second).ensureSchema();
    expect(await second.executeQuery(read('Platform'))).toHaveLength(2);
    expect(await second.executeQuery(read('OrderStatus'))).toEqual([
      expect.objectContaining({
        id: '1001', version: 2, name: 'Awaiting Payment', code: 'PENDING',
      }),
    ]);
    await second.close();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
