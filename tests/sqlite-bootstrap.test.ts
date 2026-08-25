import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SelectQuery } from '../src/core/ast';
import { RuntimeModule } from '../src/core/runtime-module';
import { EntitySchema } from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';

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

it('reconciles bootstrap data idempotently and advances ID spaces', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'teaql-ts-bootstrap-'));
  const database = path.join(directory, 'bootstrap.sqlite');
  try {
    const first = new SQLiteTeaQLClient(database, {}).install(moduleWithStatus('Pending')) as SQLiteTeaQLClient;
    await first.ensureSchema();
    await first.ensureSchema();

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
    await second.ensureSchema();
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
