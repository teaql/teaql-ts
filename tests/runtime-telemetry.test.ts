import {
  NOOP_RUNTIME_TELEMETRY,
  observeRuntimeOperation,
  RuntimeOperation,
  RuntimeTelemetry,
  RuntimeTelemetryScope,
  startRuntimeOperation,
} from '../src/core/telemetry';
import { runtimeErrorCategory } from '../src/core/telemetry';
import { SelectQuery } from '../src/core/ast';
import { EntitySchema } from '../src/sql/core';
import { SQLiteTeaQLClient } from '../src/sql/sqlite';

class RecordingTelemetry implements RuntimeTelemetry {
  readonly events: Array<{ phase: string; operation?: RuntimeOperation; value?: unknown }> = [];

  start(operation: RuntimeOperation): RuntimeTelemetryScope {
    this.events.push({ phase: 'start', operation });
    return {
      success: value => { this.events.push({ phase: 'success', value }); },
      failure: value => { this.events.push({ phase: 'failure', value }); },
    };
  }
}

test('classifies native error types without inspecting messages', () => {
  class DatabaseTimeoutError extends Error {}
  class PermissionError extends Error {}
  class UnknownTeaQLError extends Error {}
  expect(runtimeErrorCategory(new DatabaseTimeoutError('secret'))).toBe('timeout');
  expect(runtimeErrorCategory(new PermissionError('secret'))).toBe('authorization');
  expect(runtimeErrorCategory(new UnknownTeaQLError('timeout in message'))).toBe('internal');
});

test('records one balanced successful lifecycle and removes forbidden attributes', async () => {
  const telemetry = new RecordingTelemetry();
  const result = await observeRuntimeOperation(
    telemetry,
    {
      family: 'query',
      name: 'School.list',
      attributes: {
        'teaql.entity.type': 'School',
        'teaql.entity.id': 'must-not-leave-runtime',
      },
    },
    async () => ['school'],
    rows => ({ attributes: { 'teaql.result.cardinality': rows.length } }),
  );

  expect(result).toEqual(['school']);
  expect(telemetry.events.map(event => event.phase)).toEqual(['start', 'success']);
  expect(telemetry.events[0].operation?.attributes).toEqual({
    'teaql.operation.family': 'query',
    'teaql.operation.name': 'School.list',
    'teaql.entity.type': 'School',
  });
});

test('records failure and rethrows the original application error', async () => {
  const telemetry = new RecordingTelemetry();
  const original = new Error('database unavailable');
  await expect(observeRuntimeOperation(
    telemetry,
    { family: 'provider', name: 'sqlite.query' },
    async () => { throw original; },
  )).rejects.toBe(original);
  expect(telemetry.events.map(event => event.phase)).toEqual(['start', 'failure']);
});

test('adapter failures never change application behavior', async () => {
  const broken: RuntimeTelemetry = { start: () => { throw new Error('adapter failed'); } };
  await expect(observeRuntimeOperation(
    broken,
    { family: 'cache', name: 'continuous_page.get' },
    async () => 42,
  )).resolves.toBe(42);

  const completionFailure: RuntimeTelemetry = {
    start: () => ({
      success: () => { throw new Error('export failed'); },
      failure: () => { throw new Error('export failed'); },
    }),
  };
  await expect(observeRuntimeOperation(
    completionFailure,
    { family: 'mutation', name: 'School.create' },
    async () => 'saved',
  )).resolves.toBe('saved');
});

test('completion is idempotent and no-op telemetry is usable', () => {
  const telemetry = new RecordingTelemetry();
  const scope = startRuntimeOperation(telemetry, { family: 'audit', name: 'School.audit' });
  scope.success();
  scope.failure(new Error('late'));
  expect(telemetry.events.map(event => event.phase)).toEqual(['start', 'success']);
  expect(() => NOOP_RUNTIME_TELEMETRY.start({ family: 'tfp', name: 'client' }).success()).not.toThrow();
});

test('SQLite operations emit query, mutation, provider, relation and audit lifecycles', async () => {
  const schemas: Record<string, EntitySchema> = {
    School: {
      table: 'school_data',
      columns: {
        id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
        version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
      },
      relations: {
        students: { targetEntity: 'Student', localKey: 'id', foreignKey: 'schoolId', many: true },
      },
    },
    Student: {
      table: 'student_data',
      columns: {
        id: { columnName: 'id', logicalType: 'integer', decode: 'string' },
        version: { columnName: 'version', logicalType: 'integer', decode: 'number' },
        schoolId: { columnName: 'school_id', logicalType: 'integer', decode: 'string' },
      },
    },
  };
  const telemetry = new RecordingTelemetry();
  const client = new SQLiteTeaQLClient(':memory:', schemas)
    .setRuntimeTelemetry(telemetry)
    .setAuditSink(async () => undefined);
  await client.ensureSchema();
  await client.executeMutation({
    entity: 'School', action: 'Create', id: '1', payload: {}, comment: 'seed school',
  });
  await client.executeQuery(new SelectQuery('School')
    .purpose('telemetry conformance').comment('load schools')
    .relationQuery('students', new SelectQuery('Student')));

  const starts = telemetry.events
    .filter(event => event.phase === 'start')
    .map(event => event.operation?.family);
  expect(starts).toEqual(expect.arrayContaining([
    'mutation', 'provider', 'audit', 'query', 'relation_load',
  ]));
  const terminalCount = telemetry.events.filter(event => event.phase !== 'start').length;
  expect(terminalCount).toBe(telemetry.events.filter(event => event.phase === 'start').length);
  await client.close();
});
