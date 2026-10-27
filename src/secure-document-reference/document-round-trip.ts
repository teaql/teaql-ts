import { timingSafeEqual } from 'node:crypto';
import { BlobRef } from '../core/blob-ref';
import type { UserContext } from '../core/context';
import { installRuntimeCapability, requireRuntimeCapabilities } from '../core/runtime-capability';
import type { AuthorizedResponseGraph, SecureDocumentContributor, ViewOptions } from '../core/view-preparation';
import {
  ContextBoundReferenceRuntime, ReferenceDocumentScope, ReferenceKey, TrustedReferencePrincipal,
} from './round-trip-reference';

type Mutation = 'UPDATE' | 'CREATE_CHILD' | 'REMOVE_CHILD';
type Identity = Readonly<{ entityType: string; id: bigint | number; version: bigint | number }>;
export type DocumentEntitySnapshot = Readonly<{
  rowKey: string; identity: Identity; loadedFields: readonly string[];
  writableFields: readonly string[]; allowedMutations: readonly Mutation[];
}>;
export type DocumentRelationSnapshot = Readonly<{
  name: string; rowKeys: readonly string[]; completeness: 'COMPLETE' | 'PARTIAL';
  writable: boolean; allowedMutations: readonly Mutation[];
}>;
export type DocumentSnapshot = Readonly<{
  modelFingerprint: string; businessId: string; scope: ReferenceDocumentScope;
  aggregate: Identity; entities: readonly DocumentEntitySnapshot[];
  relations: readonly DocumentRelationSnapshot[];
}>;
export type DocumentBlobBindingSnapshot = Readonly<{
  rowKey: string; canonicalField: string; entityType: string; stableKey: string | null;
  bindingVersion: bigint | number; nullable: boolean; writable: boolean;
}>;
export type BoundDocumentSnapshot = Readonly<{
  snapshot: DocumentSnapshot; bindings: readonly DocumentBlobBindingSnapshot[];
}>;
export type BlobSelectionTarget = Readonly<{
  scope: ReferenceDocumentScope; targetEntity: string; canonicalField: string;
  kind: 'EXISTING_ROW' | 'NEW_CLIENT_KEY'; targetKey: string; commandId: string;
}>;
export type BlobSelectionClaim = Readonly<{ target: BlobSelectionTarget; stableKey: string }>;
export type VerifiedDocument<T> = Readonly<{ document: T; keyId: string; issuedAt: Date; expiresAt: Date }>;
export type SecureDocumentAssembly = Readonly<{
  principal(context: UserContext): TrustedReferencePrincipal;
  snapshot(context: UserContext, graph: AuthorizedResponseGraph): Promise<Readonly<{
    document: BoundDocumentSnapshot; lifetimeSeconds: number;
  }>>;
}>;

const MAX_U64 = (1n << 64n) - 1n;
const MAX_I64 = (1n << 63n) - 1n;
const MIN_I64 = -(1n << 63n);
const mutationWire: Readonly<Record<Mutation, number>> = { UPDATE: 1, CREATE_CHILD: 2, REMOVE_CHILD: 3 };
function fail(code: 'ROUND_TRIP_REFERENCE_INVALID' | 'ROUND_TRIP_REFERENCE_EXPIRED' |
  'ROUND_TRIP_REFERENCE_SCOPE_MISMATCH' | 'DOCUMENT_PROJECTION_VIOLATION' =
  'ROUND_TRIP_REFERENCE_INVALID'): never { throw new Error(code); }
function big(value: bigint | number, signed = false): bigint {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) fail();
  if (typeof value !== 'number' && typeof value !== 'bigint') fail();
  const n = BigInt(value);
  if (signed ? n < MIN_I64 || n > MAX_I64 : n < 0n || n > MAX_U64) fail();
  return n;
}
function str(value: string): Buffer {
  if (typeof value !== 'string' || !value.trim()) fail();
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length > 16384 || new TextDecoder('utf-8', { fatal: true }).decode(bytes) !== value) fail();
  return bytes;
}
function txt(value: string): Buffer {
  const bytes = str(value); const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length);
  return Buffer.concat([length, bytes]);
}
function u32(n: number): Buffer {
  if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) fail();
  const bytes = Buffer.alloc(4); bytes.writeUInt32BE(n); return bytes;
}
function u64(n: bigint | number): Buffer {
  const bytes = Buffer.alloc(8); bytes.writeBigUInt64BE(big(n)); return bytes;
}
function i64(n: bigint | number): Buffer {
  const bytes = Buffer.alloc(8); bytes.writeBigInt64BE(big(n, true)); return bytes;
}
function flag(value: boolean): Buffer {
  if (typeof value !== 'boolean') fail();
  return Buffer.from([value ? 1 : 0]);
}
function compare(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}
function sorted(values: readonly string[], maximum: number): string[] {
  if (!Array.isArray(values) || values.length > maximum) fail('DOCUMENT_PROJECTION_VIOLATION');
  const result = [...values].sort(compare);
  if (result.some((value, index) => { str(value); return index > 0 && value === result[index - 1]; }))
    fail('DOCUMENT_PROJECTION_VIOLATION');
  return result;
}
function mutationSet(values: readonly Mutation[]): Mutation[] {
  if (!Array.isArray(values) || values.length > 3) fail('DOCUMENT_PROJECTION_VIOLATION');
  const supplied = values as readonly Mutation[];
  if (supplied.some(value => !mutationWire[value]))
    fail('DOCUMENT_PROJECTION_VIOLATION');
  const result = [...supplied].sort((a, b) => mutationWire[a] - mutationWire[b]);
  if (new Set(result).size !== result.length) fail('DOCUMENT_PROJECTION_VIOLATION');
  return result;
}
function scopeBytes(scope: ReferenceDocumentScope): Buffer {
  if (big(scope.aggregateId) === 0n || big(scope.aggregateRevision, true) < 0n) fail();
  return Buffer.concat([txt(scope.documentId), txt(scope.purpose), txt(scope.aggregateType),
    u64(scope.aggregateId), i64(scope.aggregateRevision)]);
}
function identityBytes(identity: Identity): Buffer {
  if (big(identity.id) === 0n || big(identity.version, true) < 0n) fail();
  return Buffer.concat([txt(identity.entityType), u64(identity.id), i64(identity.version)]);
}
class Reader {
  private offset = 0;
  constructor(private readonly data: Buffer) {}
  bytes(n: number): Buffer {
    if (n < 0 || this.offset + n > this.data.length) fail();
    const result = this.data.subarray(this.offset, this.offset + n); this.offset += n; return result;
  }
  byte(): number { return this.bytes(1)[0]; }
  flag(): boolean { const value = this.byte(); if (value > 1) fail(); return value === 1; }
  count(maximum: number): number { const n = this.bytes(4).readUInt32BE(); if (n > maximum) fail(); return n; }
  text(): string {
    const bytes = this.bytes(this.count(16384));
    let value: string;
    try { value = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { return fail(); }
    if (!bytes.equals(str(value))) fail();
    return value;
  }
  u64(): bigint { return this.bytes(8).readBigUInt64BE(); }
  i64(): bigint { return this.bytes(8).readBigInt64BE(); }
  end(): void { if (this.offset !== this.data.length) fail(); }
}
function readScope(reader: Reader): ReferenceDocumentScope {
  const scope = { documentId: reader.text(), purpose: reader.text(), aggregateType: reader.text(),
    aggregateId: reader.u64(), aggregateRevision: reader.i64() };
  scopeBytes(scope); return scope;
}
function readIdentity(reader: Reader): Identity {
  const identity = { entityType: reader.text(), id: reader.u64(), version: reader.i64() };
  identityBytes(identity); return identity;
}
function encodeSnapshot(snapshot: DocumentSnapshot, version: 1 | 2,
  actor: Buffer, issued: bigint, expires: bigint): Buffer {
  if (snapshot.entities.length > 10000 || snapshot.relations.length > 1024) fail('DOCUMENT_PROJECTION_VIOLATION');
  if (snapshot.aggregate.entityType !== snapshot.scope.aggregateType ||
      big(snapshot.aggregate.id) !== big(snapshot.scope.aggregateId) ||
      big(snapshot.aggregate.version, true) !== big(snapshot.scope.aggregateRevision, true))
    fail('DOCUMENT_PROJECTION_VIOLATION');
  const parts = [Buffer.from([version]), actor, i64(issued), i64(expires),
    txt(snapshot.modelFingerprint), txt(snapshot.businessId), scopeBytes(snapshot.scope),
    identityBytes(snapshot.aggregate), u32(snapshot.entities.length)];
  const rowKeys = new Set<string>();
  for (const entity of snapshot.entities) {
    if (rowKeys.has(entity.rowKey)) fail('DOCUMENT_PROJECTION_VIOLATION');
    rowKeys.add(entity.rowKey);
    const loaded = sorted(entity.loadedFields, 1024);
    const writable = sorted(entity.writableFields, 1024);
    if (!writable.every(field => loaded.includes(field))) fail('DOCUMENT_PROJECTION_VIOLATION');
    const mutations = mutationSet(entity.allowedMutations);
    if (!mutations.length) fail('DOCUMENT_PROJECTION_VIOLATION');
    parts.push(txt(entity.rowKey), identityBytes(entity.identity), u32(loaded.length),
      ...loaded.map(txt), u32(writable.length), ...writable.map(txt),
      u32(mutations.length), Buffer.from(mutations.map(value => mutationWire[value])));
  }
  parts.push(u32(snapshot.relations.length));
  for (const relation of snapshot.relations) {
    const mutations = mutationSet(relation.allowedMutations);
    if (!relation.writable && mutations.length) fail('DOCUMENT_PROJECTION_VIOLATION');
    if (relation.completeness !== 'COMPLETE' && relation.completeness !== 'PARTIAL') fail();
    if (relation.rowKeys.length > 10000 || new Set(relation.rowKeys).size !== relation.rowKeys.length ||
        relation.rowKeys.some(key => !rowKeys.has(key))) fail('DOCUMENT_PROJECTION_VIOLATION');
    parts.push(txt(relation.name), Buffer.from([relation.completeness === 'COMPLETE' ? 1 : 2]),
      flag(relation.writable), u32(mutations.length),
      Buffer.from(mutations.map(value => mutationWire[value])), u32(relation.rowKeys.length),
      ...relation.rowKeys.map(txt));
  }
  return Buffer.concat(parts);
}
function readMutation(reader: Reader): Mutation {
  const n = reader.byte();
  const value = (Object.keys(mutationWire) as Mutation[]).find(name => mutationWire[name] === n);
  if (!value) fail(); return value;
}
function readSet(reader: Reader, max: number): string[] {
  const values = Array.from({ length: reader.count(max) }, () => reader.text());
  if (new Set(values).size !== values.length) fail();
  return values;
}
function decodeSnapshot(reader: Reader, version: 1 | 2): { actor: Buffer; issued: bigint; expires: bigint; snapshot: DocumentSnapshot } {
  if (reader.byte() !== version) fail();
  const actor = reader.bytes(32); const issued = reader.i64(); const expires = reader.i64();
  const modelFingerprint = reader.text(); const businessId = reader.text();
  const scope = readScope(reader); const aggregate = readIdentity(reader);
  const entities = Array.from({ length: reader.count(10000) }, () => {
    const rowKey = reader.text(); const identity = readIdentity(reader);
    const loadedFields = readSet(reader, 1024); const writableFields = readSet(reader, 1024);
    const allowedMutations = Array.from({ length: reader.count(3) }, () => readMutation(reader));
    if (new Set(allowedMutations).size !== allowedMutations.length) fail();
    return { rowKey, identity, loadedFields, writableFields, allowedMutations };
  });
  const relations = Array.from({ length: reader.count(1024) }, () => {
    const name = reader.text(); const completenessByte = reader.byte();
    if (completenessByte !== 1 && completenessByte !== 2) fail();
    const writable = reader.flag();
    const allowedMutations = Array.from({ length: reader.count(3) }, () => readMutation(reader));
    if (new Set(allowedMutations).size !== allowedMutations.length) fail();
    const rowKeys = readSet(reader, 10000);
    return { name, completeness: completenessByte === 1 ? 'COMPLETE' as const : 'PARTIAL' as const,
      writable, allowedMutations, rowKeys };
  });
  const snapshot = { modelFingerprint, businessId, scope, aggregate, entities, relations };
  encodeSnapshot(snapshot, version, actor, issued, expires);
  return { actor, issued, expires, snapshot };
}
function validateBindings(document: BoundDocumentSnapshot): DocumentBlobBindingSnapshot[] {
  const bindings = [...document.bindings].sort((a, b) => compare(a.rowKey, b.rowKey) ||
    compare(a.canonicalField, b.canonicalField));
  if (bindings.length > 10000) fail('DOCUMENT_PROJECTION_VIOLATION');
  let previous = '';
  for (const binding of bindings) {
    str(binding.rowKey); str(binding.canonicalField); str(binding.entityType);
    if ([binding.rowKey, binding.canonicalField, binding.entityType].some(value => value.trim() !== value))
      fail('DOCUMENT_PROJECTION_VIOLATION');
    const pair = `${binding.rowKey}\0${binding.canonicalField}`;
    if (pair === previous) fail('DOCUMENT_PROJECTION_VIOLATION'); previous = pair;
    const entity = document.snapshot.entities.find(row => row.rowKey === binding.rowKey);
    if (!entity || entity.identity.entityType !== binding.entityType ||
        !entity.loadedFields.includes(binding.canonicalField) ||
        (binding.writable && !entity.writableFields.includes(binding.canonicalField)))
      fail('DOCUMENT_PROJECTION_VIOLATION');
    if (binding.stableKey !== null) validBlobKey(binding.stableKey);
    big(binding.bindingVersion); flag(binding.nullable); flag(binding.writable);
  }
  return bindings;
}
function validBlobKey(key: string): void {
  try { new BlobRef(key); } catch { fail(); }
}
function validateTarget(target: BlobSelectionTarget): void {
  scopeBytes(target.scope);
  for (const value of [target.targetEntity, target.canonicalField, target.targetKey, target.commandId]) {
    str(value);
    if (value.trim() !== value) fail();
  }
  if (target.kind !== 'EXISTING_ROW' && target.kind !== 'NEW_CLIENT_KEY') fail();
}
function sameScope(a: ReferenceDocumentScope, b: ReferenceDocumentScope): boolean {
  return a.documentId === b.documentId && a.purpose === b.purpose &&
    a.aggregateType === b.aggregateType && big(a.aggregateId) === big(b.aggregateId) &&
    big(a.aggregateRevision, true) === big(b.aggregateRevision, true);
}
function targetAllowed(document: BoundDocumentSnapshot, target: BlobSelectionTarget): void {
  validateTarget(target);
  if (!sameScope(document.snapshot.scope, target.scope)) fail('ROUND_TRIP_REFERENCE_SCOPE_MISMATCH');
  if (target.kind === 'EXISTING_ROW') {
    const entity = document.snapshot.entities.find(row => row.rowKey === target.targetKey);
    if (!entity || entity.identity.entityType !== target.targetEntity ||
        !entity.writableFields.includes(target.canonicalField) ||
        !document.bindings.some(binding => binding.rowKey === target.targetKey &&
          binding.canonicalField === target.canonicalField && binding.writable))
      fail('DOCUMENT_PROJECTION_VIOLATION');
  } else if (target.kind === 'NEW_CLIENT_KEY') {
    if (!document.snapshot.relations.some(relation => relation.completeness === 'COMPLETE' &&
        relation.writable && relation.allowedMutations.includes('CREATE_CHILD')))
      fail('DOCUMENT_PROJECTION_VIOLATION');
  } else fail();
}

/** Optional protocol runtime. Installation and host document/SQL orchestration remain explicit. */
export class SecureDocumentReferenceModule extends ContextBoundReferenceRuntime {
  /** Passive per-context assembly; the trusted host supplies the complete authorized snapshot. */
  install(context: UserContext, assembly: SecureDocumentAssembly): void {
    if (!context || !assembly || typeof assembly.principal !== 'function' ||
        typeof assembly.snapshot !== 'function' || context.getResource('secureDocumentContributor') ||
        context.getResource('teaql.runtime.capability:secure_document.v1')) {
      throw new Error('DOCUMENT_CONFIGURATION');
    }
    const contributor: SecureDocumentContributor = {
      prepare: async (current: UserContext, graph: AuthorizedResponseGraph, options: ViewOptions) => {
        if (current !== context || options.mode !== 'governed') throw new Error('DOCUMENT_CONFIGURATION');
        requireRuntimeCapabilities(current, ['secure_document.v1']);
        const principal = assembly.principal(current);
        const prepared = await assembly.snapshot(current, graph);
        for (const slot of graph.blobSlots) {
          if (!/^[1-9][0-9]*$/.test(slot.entityId)) fail('DOCUMENT_PROJECTION_VIOLATION');
          const row = prepared.document.snapshot.entities.find(entity =>
            entity.identity.entityType === slot.entity &&
            big(entity.identity.id) === big(BigInt(slot.entityId)));
          const binding = prepared.document.bindings.find(candidate =>
            candidate.rowKey === row?.rowKey && candidate.canonicalField === slot.field);
          if (!binding || binding.stableKey !== slot.reference.key ||
              big(binding.bindingVersion) !== big(slot.bindingVersion))
            fail('DOCUMENT_PROJECTION_VIOLATION');
        }
        const token = this.issueBoundDocumentSnapshot(principal, prepared.document, prepared.lifetimeSeconds);
        const verified = this.consumeBoundDocumentSnapshot(principal, token,
          prepared.document.snapshot.scope.aggregateType, prepared.document.snapshot.scope.purpose);
        return { graph, envelope: Object.freeze({ businessId: prepared.document.snapshot.businessId,
          documentToken: token }), expiresAt: verified.expiresAt };
      },
    };
    installRuntimeCapability(context, { name: 'secure_document.v1',
      assertReady: current => {
        if (current !== context || current.getResource('secureDocumentContributor') !== contributor)
          throw new Error('DOCUMENT_CONFIGURATION');
      } });
    context.insertResource('secureDocumentContributor', contributor);
  }

  private expiry(lifetimeSeconds: number): { issued: bigint; expires: bigint } {
    if (!Number.isSafeInteger(lifetimeSeconds) || lifetimeSeconds <= 0) fail();
    const issued = this.timestamp(); const expires = issued + BigInt(lifetimeSeconds);
    if (expires > MAX_I64) fail(); return { issued, expires };
  }
  private authorizeSnapshot(principal: TrustedReferencePrincipal, snapshot: DocumentSnapshot): void {
    this.checkAuthorization(principal, snapshot.scope, snapshot.aggregate);
    for (const entity of snapshot.entities) this.checkAuthorization(principal, snapshot.scope, entity.identity);
  }
  private verify<T>(principal: TrustedReferencePrincipal, actor: Buffer, key: ReferenceKey,
    issued: bigint, expires: bigint, scope: ReferenceDocumentScope,
    expectedAggregateType: string, expectedPurpose: string, document: T): VerifiedDocument<T> {
    const now = this.timestamp();
    if (expires <= now) fail('ROUND_TRIP_REFERENCE_EXPIRED');
    if (issued > now + 60n) fail();
    if (!timingSafeEqual(actor, this.actor(key, principal)) ||
        scope.purpose !== expectedPurpose || scope.aggregateType !== expectedAggregateType)
      fail('ROUND_TRIP_REFERENCE_SCOPE_MISMATCH');
    const issuedAt = new Date(Number(issued) * 1000);
    const expiresAt = new Date(Number(expires) * 1000);
    if (!Number.isFinite(issuedAt.getTime()) || !Number.isFinite(expiresAt.getTime())) fail();
    return { document, keyId: key.keyId, issuedAt, expiresAt };
  }

  issueDocumentSnapshot(principal: TrustedReferencePrincipal, snapshot: DocumentSnapshot,
    lifetimeSeconds: number): string {
    const { issued, expires } = this.expiry(lifetimeSeconds);
    const key = this.key(this.keys.currentKey());
    const payload = encodeSnapshot(snapshot, 1, this.actor(key, principal), issued, expires);
    this.authorizeSnapshot(principal, snapshot);
    return this.seal('tqd1', 'document-snapshot-encryption', snapshot.scope.purpose, payload, 256000, key);
  }
  consumeDocumentSnapshot(principal: TrustedReferencePrincipal, token: string,
    expectedAggregateType: string, expectedPurpose: string): VerifiedDocument<DocumentSnapshot> {
    const opened = this.open('tqd1', 'document-snapshot-encryption', expectedPurpose, token, 256000);
    const reader = new Reader(opened.plaintext);
    const decoded = decodeSnapshot(reader, 1); reader.end();
    const verified = this.verify(principal, decoded.actor, opened.key, decoded.issued,
      decoded.expires, decoded.snapshot.scope, expectedAggregateType, expectedPurpose, decoded.snapshot);
    this.authorizeSnapshot(principal, decoded.snapshot);
    return verified;
  }
  issueBoundDocumentSnapshot(principal: TrustedReferencePrincipal,
    document: BoundDocumentSnapshot, lifetimeSeconds: number): string {
    const { issued, expires } = this.expiry(lifetimeSeconds);
    const key = this.key(this.keys.currentKey());
    const bindings = validateBindings(document);
    const parts = [encodeSnapshot(document.snapshot, 2, this.actor(key, principal), issued, expires),
      u32(bindings.length)];
    for (const binding of bindings) parts.push(txt(binding.rowKey), txt(binding.canonicalField),
      txt(binding.entityType), flag(binding.stableKey !== null),
      ...(binding.stableKey === null ? [] : [txt(binding.stableKey)]),
      u64(binding.bindingVersion), flag(binding.nullable), flag(binding.writable));
    this.authorizeSnapshot(principal, document.snapshot);
    return this.seal('tqd2', 'document-snapshot-v2-encryption', document.snapshot.scope.purpose,
      Buffer.concat(parts), 256000, key);
  }
  consumeBoundDocumentSnapshot(principal: TrustedReferencePrincipal, token: string,
    expectedAggregateType: string, expectedPurpose: string): VerifiedDocument<BoundDocumentSnapshot> {
    const opened = this.open('tqd2', 'document-snapshot-v2-encryption', expectedPurpose, token, 256000);
    const reader = new Reader(opened.plaintext);
    const decoded = decodeSnapshot(reader, 2);
    const bindings = Array.from({ length: reader.count(10000) }, () => {
      const rowKey = reader.text(), canonicalField = reader.text(), entityType = reader.text();
      const stableKey = reader.flag() ? reader.text() : null;
      return { rowKey, canonicalField, entityType, stableKey,
        bindingVersion: reader.u64(), nullable: reader.flag(), writable: reader.flag() };
    });
    reader.end();
    const document = { snapshot: decoded.snapshot, bindings };
    const canonical = validateBindings(document);
    if (bindings.some((binding, index) => binding !== canonical[index])) fail();
    const verified = this.verify(principal, decoded.actor, opened.key, decoded.issued,
      decoded.expires, decoded.snapshot.scope, expectedAggregateType, expectedPurpose, document);
    this.authorizeSnapshot(principal, decoded.snapshot);
    return verified;
  }
  issueBlobSelection(principal: TrustedReferencePrincipal, documentToken: string,
    claim: BlobSelectionClaim, lifetimeSeconds: number): string {
    const document = this.consumeBoundDocumentSnapshot(principal, documentToken,
      claim.target.scope.aggregateType, claim.target.scope.purpose);
    targetAllowed(document.document, claim.target);
    const { issued, expires } = this.expiry(lifetimeSeconds);
    if (expires > BigInt(document.expiresAt.getTime() / 1000)) fail();
    validBlobKey(claim.stableKey);
    const key = this.key(this.keys.currentKey());
    const payload = Buffer.concat([Buffer.from([1]), this.actor(key, principal), i64(issued), i64(expires),
      scopeBytes(claim.target.scope), txt(claim.target.targetEntity), txt(claim.target.canonicalField),
      Buffer.from([claim.target.kind === 'EXISTING_ROW' ? 1 : 2]), txt(claim.target.targetKey),
      txt(claim.stableKey), txt(claim.target.commandId)]);
    return this.seal('tqs1', 'blob-selection-v1-encryption', claim.target.scope.purpose, payload, 256000, key);
  }
  consumeBlobSelection(principal: TrustedReferencePrincipal, documentToken: string,
    token: string, expectedTarget: BlobSelectionTarget): VerifiedDocument<BlobSelectionClaim> {
    const document = this.consumeBoundDocumentSnapshot(principal, documentToken,
      expectedTarget.scope.aggregateType, expectedTarget.scope.purpose);
    targetAllowed(document.document, expectedTarget);
    const opened = this.open('tqs1', 'blob-selection-v1-encryption', expectedTarget.scope.purpose, token, 256000);
    const reader = new Reader(opened.plaintext);
    if (reader.byte() !== 1) fail();
    const actor = reader.bytes(32), issued = reader.i64(), expires = reader.i64();
    const scope = readScope(reader), targetEntity = reader.text(), canonicalField = reader.text();
    const kindByte = reader.byte();
    if (kindByte !== 1 && kindByte !== 2) fail();
    const targetKey = reader.text(), stableKey = reader.text(), commandId = reader.text(); reader.end();
    validBlobKey(stableKey);
    const target: BlobSelectionTarget = { scope, targetEntity, canonicalField,
      kind: kindByte === 1 ? 'EXISTING_ROW' : 'NEW_CLIENT_KEY', targetKey, commandId };
    if (!sameScope(scope, expectedTarget.scope) || targetEntity !== expectedTarget.targetEntity ||
        canonicalField !== expectedTarget.canonicalField || kindByte !==
        (expectedTarget.kind === 'EXISTING_ROW' ? 1 : 2) || targetKey !== expectedTarget.targetKey ||
        commandId !== expectedTarget.commandId) fail('ROUND_TRIP_REFERENCE_SCOPE_MISMATCH');
    if (expires > BigInt(document.expiresAt.getTime() / 1000)) fail();
    return this.verify(principal, actor, opened.key, issued, expires, scope,
      expectedTarget.scope.aggregateType, expectedTarget.scope.purpose, { target, stableKey });
  }
}
