"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextBoundReferenceRuntime = exports.StaticReferenceKeyProvider = exports.RoundTripReferenceError = void 0;
const node_crypto_1 = require("node:crypto");
const SALT = Buffer.from('teaql.round-trip-reference.v1');
const KEY_ID = /^[A-Za-z0-9_-]{1,64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const MAX_U64 = (1n << 64n) - 1n;
const MAX_I64 = (1n << 63n) - 1n;
const MIN_I64 = -(1n << 63n);
class RoundTripReferenceError extends Error {
    constructor(code) {
        super(code);
        this.code = code;
        this.name = 'RoundTripReferenceError';
    }
}
exports.RoundTripReferenceError = RoundTripReferenceError;
function invalid() { throw new RoundTripReferenceError('ROUND_TRIP_REFERENCE_INVALID'); }
function configuration() { throw new RoundTripReferenceError('ROUND_TRIP_REFERENCE_CONFIGURATION_INVALID'); }
function text(value) {
    if (typeof value !== 'string' || !value.length || value.trim() !== value)
        invalid();
    const bytes = Buffer.from(value, 'utf8');
    if (bytes.length > 4096 || new TextDecoder('utf-8', { fatal: true }).decode(bytes) !== value)
        invalid();
    return bytes;
}
function number(value, signed = false) {
    if (typeof value === 'number' && (!Number.isSafeInteger(value)))
        invalid();
    if (typeof value !== 'number' && typeof value !== 'bigint')
        invalid();
    const result = BigInt(value);
    if (signed ? result < MIN_I64 || result > MAX_I64 : result < 0n || result > MAX_U64)
        invalid();
    return result;
}
function positive(value) {
    const result = number(value);
    if (result === 0n)
        invalid();
    return result;
}
function nonnegative(value) {
    const result = number(value, true);
    if (result < 0n)
        invalid();
    return result;
}
function sized(bytes) {
    if (bytes.length > 65535)
        invalid();
    const size = Buffer.alloc(2);
    size.writeUInt16BE(bytes.length);
    return Buffer.concat([size, bytes]);
}
function encText(value) { return sized(text(value)); }
function u64(value) {
    const out = Buffer.alloc(8);
    out.writeBigUInt64BE(number(value));
    return out;
}
function i64(value) {
    const out = Buffer.alloc(8);
    out.writeBigInt64BE(number(value, true));
    return out;
}
function principalBytes(principal) {
    return Buffer.concat([encText(principal.authenticationRealm), encText(principal.subject),
        encText(principal.domainRootType), u64(positive(principal.domainRootId))]);
}
function validateScope(scope) {
    text(scope.documentId);
    text(scope.purpose);
    text(scope.aggregateType);
    positive(scope.aggregateId);
    nonnegative(scope.aggregateRevision);
}
function validateIdentity(identity) {
    text(identity.entityType);
    positive(identity.id);
    nonnegative(identity.version);
}
class Reader {
    constructor(bytes) {
        this.bytes = bytes;
        this.position = 0;
    }
    take(length) {
        if (length < 0 || this.position + length > this.bytes.length)
            invalid();
        const result = this.bytes.subarray(this.position, this.position + length);
        this.position += length;
        return result;
    }
    readText() {
        const length = this.take(2).readUInt16BE();
        const bytes = this.take(length);
        let decoded;
        try {
            decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        }
        catch {
            return invalid();
        }
        if (!bytes.equals(text(decoded)))
            invalid();
        return decoded;
    }
    readU64() { return this.take(8).readBigUInt64BE(); }
    readI64() { return this.take(8).readBigInt64BE(); }
    end() { if (this.position !== this.bytes.length)
        invalid(); }
}
class StaticReferenceKeyProvider {
    constructor(currentKeyId, keys) {
        this.currentKeyId = currentKeyId;
        this.retained = new Map();
        if (!KEY_ID.test(currentKeyId))
            configuration();
        for (const key of keys) {
            if (!KEY_ID.test(key.keyId) || key.masterKey.length !== 32 || this.retained.has(key.keyId))
                configuration();
            this.retained.set(key.keyId, Buffer.from(key.masterKey));
        }
        if (!this.retained.has(currentKeyId))
            configuration();
    }
    currentKey() { return this.keyById(this.currentKeyId); }
    keyById(keyId) {
        const bytes = this.retained.get(keyId);
        return bytes ? { keyId, masterKey: Buffer.from(bytes) } : undefined;
    }
}
exports.StaticReferenceKeyProvider = StaticReferenceKeyProvider;
class ContextBoundReferenceRuntime {
    constructor(service, environment, keys, authorize, now = () => new Date(), nonce = () => (0, node_crypto_1.randomBytes)(12)) {
        this.service = service;
        this.environment = environment;
        this.keys = keys;
        this.authorize = authorize;
        this.now = now;
        this.nonce = nonce;
        text(service);
        text(environment);
        if (!keys || !authorize || !now || !nonce)
            configuration();
        this.key(keys.currentKey());
    }
    key(key) {
        if (!key || !KEY_ID.test(key.keyId) || key.masterKey.length !== 32)
            configuration();
        return key;
    }
    derive(key, label) {
        const info = Buffer.concat([sized(Buffer.from(label)), encText(this.service),
            encText(this.environment), encText(key.keyId)]);
        return Buffer.from((0, node_crypto_1.hkdfSync)('sha256', key.masterKey, SALT, info, 32));
    }
    actor(key, principal) {
        return (0, node_crypto_1.createHmac)('sha256', this.derive(key, 'actor-fingerprint'))
            .update(principalBytes(principal)).digest();
    }
    aad(key, purpose) {
        return Buffer.concat(['tqr1', key.keyId, this.service, this.environment, purpose].map(encText));
    }
    timestamp() {
        const date = this.now();
        if (!(date instanceof Date) || !Number.isFinite(date.getTime()))
            configuration();
        return BigInt(Math.floor(date.getTime() / 1000));
    }
    checkAuthorization(principal, scope, identity) {
        try {
            this.authorize(principal, scope, identity);
        }
        catch {
            throw new RoundTripReferenceError('ROUND_TRIP_REFERENCE_AUTHORIZATION_REQUIRED');
        }
    }
    seal(prefix, label, purpose, plaintext, maximumLength, sealingKey) {
        const key = this.key(sealingKey ?? this.keys.currentKey());
        const nonce = Buffer.from(this.nonce());
        if (nonce.length !== 12)
            configuration();
        const aad = Buffer.concat([prefix, key.keyId, this.service, this.environment, purpose]
            .map(value => {
            const bytes = Buffer.from(value, 'utf8');
            if (!bytes.length || bytes.length > 16384)
                invalid();
            const size = Buffer.alloc(4);
            size.writeUInt32BE(bytes.length);
            return Buffer.concat([size, bytes]);
        }));
        const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', this.derive(key, label), nonce);
        cipher.setAAD(aad);
        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
        const token = `${prefix}.${key.keyId}.${Buffer.concat([nonce, encrypted]).toString('base64url')}`;
        if (token.length > maximumLength)
            invalid();
        return token;
    }
    open(prefix, label, purpose, token, maximumLength) {
        if (typeof token !== 'string' || token.length > maximumLength)
            invalid();
        const parts = token.split('.');
        if (parts.length !== 3 || parts[0] !== prefix || !KEY_ID.test(parts[1]) ||
            !BASE64URL.test(parts[2]))
            invalid();
        const key = this.keys.keyById(parts[1]);
        if (!key)
            invalid();
        this.key(key);
        const envelope = Buffer.from(parts[2], 'base64url');
        if (envelope.length < 28 || envelope.toString('base64url') !== parts[2])
            invalid();
        const aad = Buffer.concat([prefix, key.keyId, this.service, this.environment, purpose]
            .map(value => {
            const bytes = Buffer.from(value, 'utf8');
            if (!bytes.length || bytes.length > 16384)
                invalid();
            const size = Buffer.alloc(4);
            size.writeUInt32BE(bytes.length);
            return Buffer.concat([size, bytes]);
        }));
        try {
            const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', this.derive(key, label), envelope.subarray(0, 12));
            decipher.setAAD(aad);
            decipher.setAuthTag(envelope.subarray(envelope.length - 16));
            return { key, plaintext: Buffer.concat([decipher.update(envelope.subarray(12, -16)), decipher.final()]) };
        }
        catch {
            return invalid();
        }
    }
    issue(principal, scope, identity, lifetimeSeconds) {
        principalBytes(principal);
        validateScope(scope);
        validateIdentity(identity);
        if (!Number.isSafeInteger(lifetimeSeconds) || lifetimeSeconds <= 0)
            invalid();
        this.checkAuthorization(principal, scope, identity);
        const key = this.key(this.keys.currentKey());
        const issued = this.timestamp();
        const expires = issued + BigInt(lifetimeSeconds);
        if (expires > MAX_I64)
            invalid();
        const plaintext = Buffer.concat([
            this.actor(key, principal), encText(identity.entityType), u64(identity.id), i64(identity.version),
            encText(scope.documentId), encText(scope.aggregateType), u64(scope.aggregateId),
            i64(scope.aggregateRevision), i64(issued), i64(expires),
        ]);
        const nonce = Buffer.from(this.nonce());
        if (nonce.length !== 12)
            configuration();
        const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', this.derive(key, 'entity-reference-encryption'), nonce);
        cipher.setAAD(this.aad(key, scope.purpose));
        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
        const token = `tqr1.${key.keyId}.${Buffer.concat([nonce, encrypted]).toString('base64url')}`;
        if (token.length > 24000)
            invalid();
        return token;
    }
    consume(principal, scope, token, expectedEntityType) {
        principalBytes(principal);
        validateScope(scope);
        text(expectedEntityType);
        if (typeof token !== 'string' || token.length > 24000)
            invalid();
        const parts = token.split('.');
        if (parts.length !== 3 || parts[0] !== 'tqr1' || !KEY_ID.test(parts[1]) ||
            !BASE64URL.test(parts[2]))
            invalid();
        const key = this.keys.keyById(parts[1]);
        if (!key)
            invalid();
        this.key(key);
        const envelope = Buffer.from(parts[2], 'base64url');
        if (envelope.length < 28 || envelope.toString('base64url') !== parts[2])
            invalid();
        let plaintext;
        try {
            const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', this.derive(key, 'entity-reference-encryption'), envelope.subarray(0, 12));
            decipher.setAAD(this.aad(key, scope.purpose));
            decipher.setAuthTag(envelope.subarray(envelope.length - 16));
            plaintext = Buffer.concat([decipher.update(envelope.subarray(12, -16)), decipher.final()]);
        }
        catch {
            return invalid();
        }
        const reader = new Reader(plaintext);
        const actor = reader.take(32);
        const identity = { entityType: reader.readText(), id: reader.readU64(), version: reader.readI64() };
        const documentId = reader.readText();
        const aggregateType = reader.readText();
        const aggregateId = reader.readU64();
        const aggregateRevision = reader.readI64();
        const issued = reader.readI64();
        const expires = reader.readI64();
        reader.end();
        validateIdentity(identity);
        const now = this.timestamp();
        if (expires <= now)
            throw new RoundTripReferenceError('ROUND_TRIP_REFERENCE_EXPIRED');
        if (issued > now + 60n)
            invalid();
        const expectedActor = this.actor(key, principal);
        if (!(0, node_crypto_1.timingSafeEqual)(actor, expectedActor) || documentId !== scope.documentId ||
            aggregateType !== scope.aggregateType || aggregateId !== number(scope.aggregateId) ||
            aggregateRevision !== number(scope.aggregateRevision, true) ||
            identity.entityType !== expectedEntityType) {
            throw new RoundTripReferenceError('ROUND_TRIP_REFERENCE_SCOPE_MISMATCH');
        }
        this.checkAuthorization(principal, scope, identity);
        const issuedAt = new Date(Number(issued) * 1000);
        const expiresAt = new Date(Number(expires) * 1000);
        if (!Number.isFinite(issuedAt.getTime()) || !Number.isFinite(expiresAt.getTime()))
            invalid();
        return { identity, keyId: key.keyId, issuedAt, expiresAt };
    }
}
exports.ContextBoundReferenceRuntime = ContextBoundReferenceRuntime;
//# sourceMappingURL=round-trip-reference.js.map