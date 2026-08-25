import fs from 'node:fs';
import path from 'node:path';
import { RuntimeModule, SelectQuery } from 'teaql-ts';
import type { EntitySchema } from 'teaql-ts/sql/core';
import { SQLiteTeaQLClient } from 'teaql-ts/sql/sqlite';

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
    },
  },
};

const generatedModule = new RuntimeModule(schemas, {}, {
  defaultDomainRoot: {
    entity: 'Platform', id: '1', values: { name: 'Default Platform' },
  },
  constants: [
    { entity: 'OrderStatus', id: '1001', values: { name: 'Pending' } },
  ],
});

function read(entity: string): SelectQuery {
  return new SelectQuery(entity)
    .comment('what: read Ensure Schema bootstrap records')
    .purpose('why: demonstrate the TypeScript runtime contract');
}

async function main(): Promise<void> {
  const directory = path.join(__dirname, '.local');
  fs.mkdirSync(directory, { recursive: true });
  const client = new SQLiteTeaQLClient(path.join(directory, 'bootstrap.sqlite'), {});

  client.install(generatedModule); // passive: metadata only
  await client.ensureSchema();     // explicit: DDL plus system bootstrap

  const platforms = await client.executeQuery(read('Platform'));
  const defaultRoot = platforms.find(platform => String(platform.id) === '1');
  if (!defaultRoot) throw new Error('Default Domain Root Platform(1) is missing');
  console.log(`[default-root] Platform(${defaultRoot.id}) ${defaultRoot.name}`);

  let isolatedRoot = platforms.find(platform => platform.name === 'Isolated Platform');
  if (!isolatedRoot) {
    const saved = await client.executeMutation({
      entity: 'Platform', action: 'Create', payload: { name: 'Isolated Platform' },
      comment: 'create an isolated data graph without assigning an ID',
    });
    isolatedRoot = saved.persistedRecord;
  }
  if (String(isolatedRoot?.id) === '1') throw new Error('Isolated root reused reserved ID 1');
  console.log(`[isolated-root] Platform(${isolatedRoot?.id}) ${isolatedRoot?.name}`);

  const constants = await client.executeQuery(read('OrderStatus'));
  console.log(`[constant] OrderStatus(${constants[0].id}) ${constants[0].name}`);
  await client.close();
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
