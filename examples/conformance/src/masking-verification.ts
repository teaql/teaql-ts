// Runtime-owned fixture: no generated library source or descriptor is patched.
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GraphMutationSession, MutationIntent, SelectQuery, UserContext } from 'teaql-ts';
import { SQLiteDriver } from 'teaql-ts/sql/sqlite';
import { AbstractSQLTeaQLClient, EntitySchema, SQLExecutionMetadata, TextDiagnosticSQLLogSink } from 'teaql-ts/sql/core';

export async function verifyMaskingLifecycle(): Promise<void> {
  const schemas: Record<string, EntitySchema> = { MaskingProbe: {
    table: 'masking_probe', auditMaskFields: ['display_name'], columns: {
      id: { columnName: 'id', logicalType: 'integer', decode: 'string', logPolicy: 'plain' },
      version: { columnName: 'version', logicalType: 'integer', decode: 'number', logPolicy: 'plain' },
      name: { columnName: 'display_name', logicalType: 'text', decode: 'native', logPolicy: 'plain' },
      address: { columnName: 'address', logicalType: 'text', decode: 'native', logPolicy: 'plain' },
      password: { columnName: 'password', logicalType: 'text', decode: 'native', logPolicy: 'plain' },
    },
    relations: { children: { targetEntity: 'MaskingChild', localKey: 'id', foreignKey: 'parentId', many: true } },
  }, MaskingChild: { table: 'masking_child', columns: {
    id: { columnName: 'id', logicalType: 'integer', decode: 'string', logPolicy: 'plain' },
    version: { columnName: 'version', logicalType: 'integer', decode: 'number', logPolicy: 'plain' },
    parentId: { columnName: 'parent_id', logicalType: 'integer', decode: 'string', logPolicy: 'plain' },
  } } };
  const entries: SQLExecutionMetadata[] = [], output: string[] = [];
  const driver = new SQLiteDriver(':memory:');
  class ProbeClient extends AbstractSQLTeaQLClient {
    constructor() { super(driver, schemas); }
  }
  const client = new ProbeClient().setDiagnosticSQLLogSink({ write(entry) {
    entries.push(entry); new TextDiagnosticSQLLogSink(line => output.push(line)).write(entry);
  } });
  const payload = { name: 'Riverside', address: '1 Runtime Road', password: 'PASSWORD-CANARY' };
  try {
    await new UserContext().insertResource('dataService', client).ensureSchema();
    for (const id of ['1', '2']) await client.executeMutation({ entity: 'MaskingProbe',
      action: 'Create', id, payload, comment: 'seed mask lifecycle fixture' });
    entries.length = 0; output.length = 0;
    const query = () => new SelectQuery('MaskingProbe').filter({ name: { $eq: 'Riverside' },
      address: { $eq: '1 Runtime Road' }, password: { $eq: 'PASSWORD-CANARY' } })
      .limit(10).comment('what: bounded private-name lookup').purpose('why: verify mask lifecycle');
    for await (const rows of client.executeForStream(query(), 1)) {
      assert.equal(rows[0].name, 'Riverside'); break;
    }
    assert.equal(entries[0].executionOutcome, 'cancelled');
    assert.equal(entries[0].resultCount, 1);
    // Real SQLite UNIQUE failure must still leave safe, useful SQL evidence.
    await assert.rejects(client.executeMutation({ entity: 'MaskingProbe', action: 'Create', id: '1',
      payload, comment: 'verify duplicate ID failure' }), /UNIQUE/);
    assert.equal(entries[1].executionOutcome, 'failure');
    assert.equal(entries[1].affectedRows, undefined);
    const rows = await client.executeQuery(query());
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, 'Riverside');
    const text = output.join('\n');
    assert(text.includes('Ri*****de') && text.includes('1 Runtime Road'));
    assert(!text.includes('Riverside') && !text.includes('PASSWORD-CANARY'));
    assert(text.includes('outcome=cancelled') && text.includes('outcome=failure'));

    await driver.query('CREATE TRIGGER remove_mask_probe AFTER INSERT ON masking_probe WHEN NEW.id = 777 BEGIN DELETE FROM masking_probe WHERE id = NEW.id; END');
    entries.length = 0; output.length = 0;
    const create = (id:string, graph?: GraphMutationSession) => {
      const mutation = {entity:'MaskingProbe',action:'Create',id,
        payload,comment:'what: insert Riverside PASSWORD-CANARY for readback'};
      return client.executeMutation(graph ? graph.request(mutation) : mutation);
    };
    await assert.rejects(create('777'),/could not be read back/);
    assert.equal(entries.length,2);
    assert.equal(entries[0].executionOutcome,'success');
    assert.equal(entries[0].affectedRows,1);
    assert.equal(entries[1].executionOutcome,'success');
    assert.equal(entries[1].resultCount,0);
    assert(entries[1].auditReason?.includes('what: insert'));
    assert(!JSON.stringify([entries,output]).match(/Riverside|PASSWORD-CANARY/));

    entries.length = 0; output.length = 0;
    await assert.rejects(client.executeGraphSave(new MutationIntent('what: insert Riverside PASSWORD-CANARY for readback'), async graph => {
      await create('30', graph);
      await create('777', graph);
      await create('31', graph);
    }),/could not be read back/);
    assert.deepEqual(entries.map(entry=>[entry.operation,entry.executionOutcome]),[
      ['insert','success'],['insert','success'],['select','success'],
    ]);
    assert.equal(entries[2].resultCount,0);
    assert(!JSON.stringify([entries,output]).match(/Riverside|PASSWORD-CANARY/));
    assert.equal((await driver.query('SELECT * FROM masking_probe WHERE id IN (30,31,777)')).rowCount,0);
    assert.equal((await driver.query('SELECT * FROM masking_probe')).rowCount,2);
    await create('32');
    assert.equal((await driver.query('SELECT * FROM masking_probe')).rowCount,3);
    console.log('PASS masking lifecycle: stream, SQLite failure, readback intent, partial graph rollback and session reuse');

    await client.executeMutation({ entity: 'MaskingChild', action: 'Create', id: '1',
      payload: { parentId: '1' }, comment: 'seed derived relation log fixture' });
    const relationLog = join(mkdtempSync(join(tmpdir(), 'teaql-ts-relation-log-')), 'sql.log');
    entries.length = 0;
    client.setDiagnosticSQLLogSink({ write(entry) {
      entries.push(entry);
      new TextDiagnosticSQLLogSink(line => appendFileSync(relationLog, line + '\n')).write(entry);
    } });
    const related = () => new SelectQuery('MaskingProbe')
      .filter({ id: { $eq: '1' }, name: { $eq: 'Riverside' }, password: { $eq: 'PASSWORD-CANARY' } })
      .relationQuery('children', new SelectQuery('MaskingChild').limit(2)).limit(1)
      .comment('what: load Riverside PASSWORD-CANARY children').purpose('why: verify inherited relation intent');
    await driver.query('ALTER TABLE masking_child RENAME TO masking_child_fault_probe');
    try { await assert.rejects(client.executeQuery(related()), /no such table/); }
    finally { await driver.query('ALTER TABLE masking_child_fault_probe RENAME TO masking_child'); }
    assert.equal(entries.length, 2);
    assert.equal(entries[0].executionOutcome, 'success');
    assert.equal(entries[1].executionOutcome, 'failure');
    assert(entries[1].comment?.includes('what: load'));
    const logText = readFileSync(relationLog, 'utf8');
    assert(logText.includes('masking_child') && logText.includes('outcome=failure'));
    assert(!JSON.stringify([entries, logText]).match(/Riverside|PASSWORD-CANARY/));
    const restored = await client.executeQuery(related());
    assert.equal(restored.length, 1);
    assert.equal(restored[0].children.length, 1);
    assert.equal(restored[0].children[0].id, '1');
    console.log('PASS masking relation: real SQLite failure, file/custom sinks and restored graph');
  } finally { await client.close(); }
}
