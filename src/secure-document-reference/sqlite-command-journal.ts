import { createHash } from 'node:crypto';
import type { UserContext } from '../core/context';
import type { GraphMutationSession } from '../core/request-intent';
import type { SqlSession, TeaQLDataService, TeaQLSqlDriver } from '../sql/core';
import type { ReferenceDocumentScope, TrustedReferencePrincipal } from './round-trip-reference';

export type SubmittedDocumentCommand = Readonly<{
  businessId: string;
  documentToken: string;
  commandId: string;
  body: Readonly<Record<string, unknown>>;
  /** tqs1 credentials are part of the durable replay identity, never an out-of-band request. */
  blobSelections?: readonly Readonly<{
    token: string; targetEntity: string; canonicalField: string;
    kind: 'EXISTING_ROW' | 'NEW_CLIENT_KEY'; targetKey: string;
  }>[];
}>;

/** The application-owned service validates the projection and writes its business mutation on this graph. */
export type DocumentCommandReceipt = Readonly<{
  previousRevision: number;
  newRevision: number;
  response: string;
}>;

/** Resolve and authorize the current context's trusted actor; never use submitted identity. */
export type DocumentCommandAuthority = (
  context: UserContext, scope: ReferenceDocumentScope, session: SqlSession,
) => Promise<TrustedReferencePrincipal>;

const MAX_COMMAND_BYTES = 256_000;
const MAX_RESPONSE_BYTES = 256_000;
const U64_MAX = (1n << 64n) - 1n;
const I64_MAX = (1n << 63n) - 1n;

function text(value: unknown, maximum = 16_384): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim() &&
    Buffer.byteLength(value, 'utf8') <= maximum &&
    !/[\x00-\x1f\x7f-\x9f]/.test(value);
}

function unsigned(value: unknown): bigint {
  if (typeof value !== 'bigint' && (typeof value !== 'number' || !Number.isSafeInteger(value)))
    throw new Error('DOCUMENT_COMMAND_INVALID');
  const result = BigInt(value);
  if (result < 1n || result > U64_MAX) throw new Error('DOCUMENT_COMMAND_INVALID');
  return result;
}

function revision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('DOCUMENT_COMMAND_INVALID');
  return value;
}

function scopeRevision(value: unknown): void {
  if (typeof value !== 'bigint' && (typeof value !== 'number' || !Number.isSafeInteger(value)))
    throw new Error('DOCUMENT_COMMAND_INVALID');
  const result = BigInt(value);
  if (result < 0n || result > I64_MAX) throw new Error('DOCUMENT_COMMAND_INVALID');
}

function canonical(value: unknown, depth: number, budget: { left: number }, seen: Set<object>): string {
  if (--budget.left < 0 || depth > 64) throw new Error('DOCUMENT_COMMAND_INVALID');
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') {
    if (Buffer.byteLength(value, 'utf8') > MAX_COMMAND_BYTES) throw new Error('DOCUMENT_COMMAND_INVALID');
    if (new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(value, 'utf8')) !== value)
      throw new Error('DOCUMENT_COMMAND_INVALID');
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) throw new Error('DOCUMENT_COMMAND_INVALID');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object' || seen.has(value)) throw new Error('DOCUMENT_COMMAND_INVALID');
  seen.add(value);
  try {
    if (Object.getOwnPropertySymbols(value).length) throw new Error('DOCUMENT_COMMAND_INVALID');
    if (Array.isArray(value)) {
      if (Object.keys(value).length !== value.length) throw new Error('DOCUMENT_COMMAND_INVALID');
      for (let index = 0; index < value.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, index);
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value'))
          throw new Error('DOCUMENT_COMMAND_INVALID');
      }
      return `[${value.map(item => canonical(item, depth + 1, budget, seen)).join(',')}]`;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
      throw new Error('DOCUMENT_COMMAND_INVALID');
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
    for (const key of keys) {
      if (!text(key) || key === '__proto__' || key === 'constructor' || key === 'prototype')
        throw new Error('DOCUMENT_COMMAND_INVALID');
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value'))
        throw new Error('DOCUMENT_COMMAND_INVALID');
    }
    return `{${keys.map(key => `${JSON.stringify(key)}:${canonical(record[key], depth + 1, budget, seen)}`).join(',')}}`;
  } finally { seen.delete(value); }
}

function freeze(value: unknown): void {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}

/** Closed JSON body for a document response; no getters, class instances or mutable nested nodes. */
export function freezeDocumentBody(body: unknown): Readonly<Record<string, unknown>> {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new Error('DOCUMENT_PROJECTION_VIOLATION');
  let encoded: string;
  try { encoded = canonical(body, 0, { left: 100_000 }, new Set()); }
  catch { throw new Error('DOCUMENT_PROJECTION_VIOLATION'); }
  if (Buffer.byteLength(encoded, 'utf8') > MAX_RESPONSE_BYTES)
    throw new Error('DOCUMENT_PROJECTION_VIOLATION');
  const copy = JSON.parse(encoded);
  freeze(copy);
  return copy;
}

function prepareCommand(command: SubmittedDocumentCommand): Readonly<{
  hash: string; snapshot: SubmittedDocumentCommand;
}> {
  if (!command || !text(command.businessId) || !text(command.documentToken, MAX_COMMAND_BYTES) ||
      !text(command.commandId, 256) || !command.body || typeof command.body !== 'object' ||
      Array.isArray(command.body))
    throw new Error('DOCUMENT_COMMAND_INVALID');
  const selections = command.blobSelections;
  if (selections !== undefined && (!Array.isArray(selections) || selections.length > 100 ||
      selections.some(selection => !selection ||
        !text(selection.token, MAX_COMMAND_BYTES) || !text(selection.targetEntity) ||
        !text(selection.canonicalField) || !text(selection.targetKey) ||
        !['EXISTING_ROW', 'NEW_CLIENT_KEY'].includes(selection.kind) ||
        Object.keys(selection).sort().join(',') !==
          'canonicalField,kind,targetEntity,targetKey,token')))
    throw new Error('DOCUMENT_COMMAND_INVALID');
  // Keep the original four-element digest for commands without selections so persisted
  // receipts remain replayable after upgrading the optional module.
  const encoded = canonical([command.businessId, command.documentToken, command.commandId,
    command.body, ...(selections === undefined ? [] : [selections])],
  0, { left: 100_000 }, new Set());
  if (Buffer.byteLength(encoded, 'utf8') > MAX_COMMAND_BYTES) throw new Error('DOCUMENT_COMMAND_INVALID');
  const [businessId, documentToken, commandId, body, copiedSelections] = JSON.parse(encoded);
  freeze(body);
  if (copiedSelections) freeze(copiedSelections);
  return { hash: createHash('sha256').update(encoded).digest('hex'),
    snapshot: Object.freeze({ businessId, documentToken, commandId, body,
      ...(copiedSelections === undefined ? {} : { blobSelections: copiedSelections }) }) };
}

function scopeHash(scope: ReferenceDocumentScope): string {
  if (!scope || !text(scope.documentId) || !text(scope.purpose) ||
      !text(scope.aggregateType)) throw new Error('DOCUMENT_COMMAND_INVALID');
  const id = unsigned(scope.aggregateId).toString();
  scopeRevision(scope.aggregateRevision);
  return createHash('sha256').update(canonical([scope.documentId, scope.purpose,
    scope.aggregateType, id], 0, { left: 16 }, new Set())).digest('hex');
}

function actorHash(principal: TrustedReferencePrincipal): string {
  if (!principal || !text(principal.authenticationRealm) || !text(principal.subject) ||
      !text(principal.domainRootType)) throw new Error('DOCUMENT_COMMAND_INVALID');
  return createHash('sha256').update(canonical([principal.authenticationRealm,
    principal.subject, principal.domainRootType, unsigned(principal.domainRootId).toString()],
  0, { left: 16 }, new Set())).digest('hex');
}

function checkedReceipt(receipt: DocumentCommandReceipt): DocumentCommandReceipt {
  if (!receipt || !text(receipt.response, MAX_RESPONSE_BYTES) ||
      revision(receipt.previousRevision) > revision(receipt.newRevision))
    throw new Error('DOCUMENT_COMMAND_INVALID');
  return Object.freeze({ previousRevision: receipt.previousRevision,
    newRevision: receipt.newRevision, response: receipt.response });
}

/** Explicit SQLite command receipt store. The application must consume the bound document token,
 * recheck the current model, binding and mutation plan, and present the accepted response after
 * commit. This store only makes the authorized command result durable with the business graph.
 */
export class SqliteDocumentCommandJournal {
  constructor(private readonly driver: TeaQLSqlDriver) {
    if (driver.databaseKind !== 'sqlite') throw new Error('DOCUMENT_CAPABILITY_MISSING');
  }

  async installSchema(): Promise<void> {
    await this.driver.query(`CREATE TABLE IF NOT EXISTS teaql_document_command_receipt (
      scope_hash TEXT NOT NULL, actor_hash TEXT NOT NULL, command_id TEXT NOT NULL,
      request_hash TEXT NOT NULL, previous_revision BIGINT NOT NULL,
      new_revision BIGINT NOT NULL, response TEXT NOT NULL,
      PRIMARY KEY (scope_hash, actor_hash, command_id)
    )`);
  }

  async validateSchema(): Promise<void> {
    try {
      const result = await this.driver.query('PRAGMA table_info(teaql_document_command_receipt)');
      const columns = new Map(result.rows.map(row => [String(row.name), row]));
      const expected = ['scope_hash', 'actor_hash', 'command_id', 'request_hash',
        'previous_revision', 'new_revision', 'response'];
      if (columns.size !== expected.length || !expected.every(column => columns.has(column)) ||
          expected.some(column => Number(columns.get(column).notnull) !== 1) ||
          expected.some((column, index) =>
            Number(columns.get(column).pk) !== (index < 3 ? index + 1 : 0)))
        throw new Error('DOCUMENT_SCHEMA_MISSING');
    } catch { throw new Error('DOCUMENT_SCHEMA_MISSING'); }
  }

  /** Caller must invoke this inside its current business graph; failures poison that owner. */
  async apply(context: UserContext, owner: TeaQLDataService, graph: GraphMutationSession,
              scope: ReferenceDocumentScope, command: SubmittedDocumentCommand,
              authority: DocumentCommandAuthority,
              mutate: (session: SqlSession, command: SubmittedDocumentCommand) =>
                Promise<DocumentCommandReceipt>): Promise<Readonly<{
                receipt: DocumentCommandReceipt; replayed: boolean;
              }>> {
    return owner.withGraphSqlSession(graph, async session => {
      if (!owner.isCurrentGraphActor(graph, context) || !authority || !mutate)
        throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED');
      const scopeKey = scopeHash(scope);
      const prepared = prepareCommand(command);
      const requestHash = prepared.hash;
      const current = async (): Promise<string> => {
        let principal: TrustedReferencePrincipal;
        try { principal = await authority(context, scope, session); }
        catch { throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED'); }
        return actorHash(principal);
      };
      const actorKey = await current();
      const values = [scopeKey, actorKey, command.commandId];
      let existing;
      try { existing = await session.query(`SELECT request_hash,previous_revision,new_revision,response
        FROM teaql_document_command_receipt
        WHERE scope_hash = ? AND actor_hash = ? AND command_id = ?`, values); }
      catch { throw new Error('DOCUMENT_CATALOG_FAILED'); }
      if (existing.rowCount > 1) throw new Error('DOCUMENT_CATALOG_FAILED');
      if (existing.rowCount === 1) {
        const row = existing.rows[0];
        if (row.request_hash !== requestHash) throw new Error('DOCUMENT_REPLAY_CONFLICT');
        const receipt = checkedReceipt({ previousRevision: Number(row.previous_revision),
          newRevision: Number(row.new_revision), response: String(row.response) });
        if (await current() !== actorKey) throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED');
        return { receipt, replayed: true };
      }
      const receipt = checkedReceipt(await mutate(session, prepared.snapshot));
      if (prepareCommand(command).hash !== requestHash) throw new Error('DOCUMENT_COMMAND_INVALID');
      if (await current() !== actorKey) throw new Error('DOCUMENT_AUTHORIZATION_REQUIRED');
      try {
        const inserted = await session.query(`INSERT INTO teaql_document_command_receipt
          (scope_hash,actor_hash,command_id,request_hash,previous_revision,new_revision,response)
          VALUES (?,?,?,?,?,?,?)`, [...values, requestHash, receipt.previousRevision,
          receipt.newRevision, receipt.response]);
        if (inserted.rowCount !== 1) throw new Error('DOCUMENT_CATALOG_FAILED');
      } catch { throw new Error('DOCUMENT_CATALOG_FAILED'); }
      return { receipt, replayed: false };
    });
  }
}
