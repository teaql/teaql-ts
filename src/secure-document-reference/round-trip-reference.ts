import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

const SALT = Buffer.from('teaql.round-trip-reference.v1');
const KEY_ID = /^[A-Za-z0-9_-]{1,64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const MAX_U64 = (1n << 64n) - 1n;
const MAX_I64 = (1n << 63n) - 1n;
const MIN_I64 = -(1n << 63n);

export type TrustedReferencePrincipal = Readonly<{
  authenticationRealm: string; subject: string; domainRootType: string; domainRootId: bigint | number;
}>;
export type ReferenceDocumentScope = Readonly<{
  documentId: string; purpose: string; aggregateType: string;
  aggregateId: bigint | number; aggregateRevision: bigint | number;
}>;
export type ReferenceIdentity = Readonly<{
  entityType: string; id: bigint | number; version: bigint | number;
}>;
export type VerifiedEntityReference = Readonly<{
  identity: Readonly<{ entityType: string; id: bigint; version: bigint }>;
  keyId: string; issuedAt: Date; expiresAt: Date;
}>;

export class RoundTripReferenceError extends Error {
  constructor(readonly code: 'ROUND_TRIP_REFERENCE_INVALID' |
    'ROUND_TRIP_REFERENCE_EXPIRED' | 'ROUND_TRIP_REFERENCE_SCOPE_MISMATCH' |
    'ROUND_TRIP_REFERENCE_AUTHORIZATION_REQUIRED' | 'ROUND_TRIP_REFERENCE_CONFIGURATION_INVALID') {
    super(code);
    this.name = 'RoundTripReferenceError';
  }
}

function invalid(): never { throw new RoundTripReferenceError('ROUND_TRIP_REFERENCE_INVALID'); }
function configuration(): never { throw new RoundTripReferenceError('ROUND_TRIP_REFERENCE_CONFIGURATION_INVALID'); }
function text(value: string): Buffer {
  if (typeof value !== 'string' || !value.length || value.trim() !== value) invalid();
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length > 4096 || new TextDecoder('utf-8', { fatal: true }).decode(bytes) !== value) invalid();
  return bytes;
}
function number(value: bigint | number, signed = false): bigint {
  if (typeof value === 'number' && (!Number.isSafeInteger(value))) invalid();
  if (typeof value !== 'number' && typeof value !== 'bigint') invalid();
  const result = BigInt(value);
  if (signed ? result < MIN_I64 || result > MAX_I64 : result < 0n || result > MAX_U64) invalid();
  return result;
}
function positive(value: bigint | number): bigint {
  const result = number(value);
  if (result === 0n) invalid();
  return result;
}
function nonnegative(value: bigint | number): bigint {
  const result = number(value, true);
  if (result < 0n) invalid();
  return result;
}
function sized(bytes: Buffer): Buffer {
  if (bytes.length > 65535) invalid();
  const size = Buffer.alloc(2);
  size.writeUInt16BE(bytes.length);
  return Buffer.concat([size, bytes]);
}
function encText(value: string): Buffer { return sized(text(value)); }
function u64(value: bigint | number): Buffer {
  const out = Buffer.alloc(8);
  out.writeBigUInt64BE(number(value));
  return out;
}
function i64(value: bigint | number): Buffer {
  const out = Buffer.alloc(8);
  out.writeBigInt64BE(number(value, true));
  return out;
}
function principalBytes(principal: TrustedReferencePrincipal): Buffer {
  return Buffer.concat([encText(principal.authenticationRealm), encText(principal.subject),
    encText(principal.domainRootType), u64(positive(principal.domainRootId))]);
}
function validateScope(scope: ReferenceDocumentScope): void {
  text(scope.documentId); text(scope.purpose); text(scope.aggregateType);
  positive(scope.aggregateId); nonnegative(scope.aggregateRevision);
}
function validateIdentity(identity: ReferenceIdentity): void {
  text(identity.entityType); positive(identity.id); nonnegative(identity.version);
}

class Reader {
  private position = 0;
  constructor(private readonly bytes: Buffer) {}
  take(length: number): Buffer {
    if (length < 0 || this.position + length > this.bytes.length) invalid();
    const result = this.bytes.subarray(this.position, this.position + length);
    this.position += length;
    return result;
  }
  readText(): string {
    const length = this.take(2).readUInt16BE();
    const bytes = this.take(length);
    let decoded: string;
    try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { return invalid(); }
    if (!bytes.equals(text(decoded))) invalid();
    return decoded;
  }
  readU64(): bigint { return this.take(8).readBigUInt64BE(); }
  readI64(): bigint { return this.take(8).readBigInt64BE(); }
  end(): void { if (this.position !== this.bytes.length) invalid(); }
}

export type ReferenceKey = Readonly<{ keyId: string; masterKey: Uint8Array }>;
export interface ReferenceKeyProvider {
  currentKey(): ReferenceKey;
  keyById(keyId: string): ReferenceKey | undefined;
}

export class StaticReferenceKeyProvider implements ReferenceKeyProvider {
  private readonly retained = new Map<string, Buffer>();
  constructor(private readonly currentKeyId: string, keys: readonly ReferenceKey[]) {
    if (!KEY_ID.test(currentKeyId)) configuration();
    for (const key of keys) {
      if (!KEY_ID.test(key.keyId) || key.masterKey.length !== 32 || this.retained.has(key.keyId)) configuration();
      this.retained.set(key.keyId, Buffer.from(key.masterKey));
    }
    if (!this.retained.has(currentKeyId)) configuration();
  }
  currentKey(): ReferenceKey { return this.keyById(this.currentKeyId)!; }
  keyById(keyId: string): ReferenceKey | undefined {
    const bytes = this.retained.get(keyId);
    return bytes ? { keyId, masterKey: Buffer.from(bytes) } : undefined;
  }
}

export type ReferenceAuthorizationPolicy = (
  principal: TrustedReferencePrincipal, scope: ReferenceDocumentScope,
  identity: ReferenceIdentity,
) => void;

export class ContextBoundReferenceRuntime {
  constructor(
    protected readonly service: string,
    protected readonly environment: string,
    protected readonly keys: ReferenceKeyProvider,
    protected readonly authorize: ReferenceAuthorizationPolicy,
    protected readonly now: () => Date = () => new Date(),
    protected readonly nonce: () => Uint8Array = () => randomBytes(12),
  ) {
    text(service); text(environment);
    if (!keys || !authorize || !now || !nonce) configuration();
    this.key(keys.currentKey());
  }

  protected key(key: ReferenceKey): ReferenceKey {
    if (!key || !KEY_ID.test(key.keyId) || key.masterKey.length !== 32) configuration();
    return key;
  }
  protected derive(key: ReferenceKey, label: string): Buffer {
    const info = Buffer.concat([sized(Buffer.from(label)), encText(this.service),
      encText(this.environment), encText(key.keyId)]);
    return Buffer.from(hkdfSync('sha256', key.masterKey, SALT, info, 32));
  }
  protected actor(key: ReferenceKey, principal: TrustedReferencePrincipal): Buffer {
    return createHmac('sha256', this.derive(key, 'actor-fingerprint'))
      .update(principalBytes(principal)).digest();
  }
  private aad(key: ReferenceKey, purpose: string): Buffer {
    return Buffer.concat(['tqr1', key.keyId, this.service, this.environment, purpose].map(encText));
  }
  protected timestamp(): bigint {
    const date = this.now();
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) configuration();
    return BigInt(Math.floor(date.getTime() / 1000));
  }
  protected checkAuthorization(principal: TrustedReferencePrincipal, scope: ReferenceDocumentScope,
    identity: ReferenceIdentity): void {
    try { this.authorize(principal, scope, identity); }
    catch { throw new RoundTripReferenceError('ROUND_TRIP_REFERENCE_AUTHORIZATION_REQUIRED'); }
  }

  protected seal(prefix: string, label: string, purpose: string,
    plaintext: Buffer, maximumLength: number, sealingKey?: ReferenceKey): string {
    const key = this.key(sealingKey ?? this.keys.currentKey());
    const nonce = Buffer.from(this.nonce());
    if (nonce.length !== 12) configuration();
    const aad = Buffer.concat([prefix, key.keyId, this.service, this.environment, purpose]
      .map(value => {
        const bytes = Buffer.from(value, 'utf8');
        if (!bytes.length || bytes.length > 16384) invalid();
        const size = Buffer.alloc(4); size.writeUInt32BE(bytes.length);
        return Buffer.concat([size, bytes]);
      }));
    const cipher = createCipheriv('aes-256-gcm', this.derive(key, label), nonce);
    cipher.setAAD(aad);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
    const token = `${prefix}.${key.keyId}.${Buffer.concat([nonce, encrypted]).toString('base64url')}`;
    if (token.length > maximumLength) invalid();
    return token;
  }

  protected open(prefix: string, label: string, purpose: string,
    token: string, maximumLength: number): { key: ReferenceKey; plaintext: Buffer } {
    if (typeof token !== 'string' || token.length > maximumLength) invalid();
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== prefix || !KEY_ID.test(parts[1]) ||
        !BASE64URL.test(parts[2])) invalid();
    const key = this.keys.keyById(parts[1]);
    if (!key) invalid();
    this.key(key);
    const envelope = Buffer.from(parts[2], 'base64url');
    if (envelope.length < 28 || envelope.toString('base64url') !== parts[2]) invalid();
    const aad = Buffer.concat([prefix, key.keyId, this.service, this.environment, purpose]
      .map(value => {
        const bytes = Buffer.from(value, 'utf8');
        if (!bytes.length || bytes.length > 16384) invalid();
        const size = Buffer.alloc(4); size.writeUInt32BE(bytes.length);
        return Buffer.concat([size, bytes]);
      }));
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.derive(key, label), envelope.subarray(0, 12));
      decipher.setAAD(aad);
      decipher.setAuthTag(envelope.subarray(envelope.length - 16));
      return { key, plaintext: Buffer.concat([decipher.update(envelope.subarray(12, -16)), decipher.final()]) };
    } catch { return invalid(); }
  }

  issue(principal: TrustedReferencePrincipal, scope: ReferenceDocumentScope,
    identity: ReferenceIdentity, lifetimeSeconds: number): string {
    principalBytes(principal); validateScope(scope); validateIdentity(identity);
    if (!Number.isSafeInteger(lifetimeSeconds) || lifetimeSeconds <= 0) invalid();
    this.checkAuthorization(principal, scope, identity);
    const key = this.key(this.keys.currentKey());
    const issued = this.timestamp();
    const expires = issued + BigInt(lifetimeSeconds);
    if (expires > MAX_I64) invalid();
    const plaintext = Buffer.concat([
      this.actor(key, principal), encText(identity.entityType), u64(identity.id), i64(identity.version),
      encText(scope.documentId), encText(scope.aggregateType), u64(scope.aggregateId),
      i64(scope.aggregateRevision), i64(issued), i64(expires),
    ]);
    const nonce = Buffer.from(this.nonce());
    if (nonce.length !== 12) configuration();
    const cipher = createCipheriv('aes-256-gcm', this.derive(key, 'entity-reference-encryption'), nonce);
    cipher.setAAD(this.aad(key, scope.purpose));
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
    const token = `tqr1.${key.keyId}.${Buffer.concat([nonce, encrypted]).toString('base64url')}`;
    if (token.length > 24_000) invalid();
    return token;
  }

  consume(principal: TrustedReferencePrincipal, scope: ReferenceDocumentScope,
    token: string, expectedEntityType: string): VerifiedEntityReference {
    principalBytes(principal); validateScope(scope); text(expectedEntityType);
    if (typeof token !== 'string' || token.length > 24_000) invalid();
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'tqr1' || !KEY_ID.test(parts[1]) ||
        !BASE64URL.test(parts[2])) invalid();
    const key = this.keys.keyById(parts[1]);
    if (!key) invalid();
    this.key(key);
    const envelope = Buffer.from(parts[2], 'base64url');
    if (envelope.length < 28 || envelope.toString('base64url') !== parts[2]) invalid();
    let plaintext: Buffer;
    try {
      const decipher = createDecipheriv('aes-256-gcm',
        this.derive(key, 'entity-reference-encryption'), envelope.subarray(0, 12));
      decipher.setAAD(this.aad(key, scope.purpose));
      decipher.setAuthTag(envelope.subarray(envelope.length - 16));
      plaintext = Buffer.concat([decipher.update(envelope.subarray(12, -16)), decipher.final()]);
    } catch { return invalid(); }
    const reader = new Reader(plaintext);
    const actor = reader.take(32);
    const identity = { entityType: reader.readText(), id: reader.readU64(), version: reader.readI64() };
    const documentId = reader.readText();
    const aggregateType = reader.readText();
    const aggregateId = reader.readU64();
    const aggregateRevision = reader.readI64();
    const issued = reader.readI64();
    const expires = reader.readI64();
    reader.end(); validateIdentity(identity);
    const now = this.timestamp();
    if (expires <= now) throw new RoundTripReferenceError('ROUND_TRIP_REFERENCE_EXPIRED');
    if (issued > now + 60n) invalid();
    const expectedActor = this.actor(key, principal);
    if (!timingSafeEqual(actor, expectedActor) || documentId !== scope.documentId ||
        aggregateType !== scope.aggregateType || aggregateId !== number(scope.aggregateId) ||
        aggregateRevision !== number(scope.aggregateRevision, true) ||
        identity.entityType !== expectedEntityType) {
      throw new RoundTripReferenceError('ROUND_TRIP_REFERENCE_SCOPE_MISMATCH');
    }
    this.checkAuthorization(principal, scope, identity);
    const issuedAt = new Date(Number(issued) * 1000);
    const expiresAt = new Date(Number(expires) * 1000);
    if (!Number.isFinite(issuedAt.getTime()) || !Number.isFinite(expiresAt.getTime())) invalid();
    return { identity, keyId: key.keyId, issuedAt, expiresAt };
  }
}
