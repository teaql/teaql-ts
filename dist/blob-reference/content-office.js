"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficeBlobContentVerifier = void 0;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const node_zlib_1 = require("node:zlib");
const PACKAGE = 'http://schemas.openxmlformats.org/package/2006/';
const DOCUMENT = 'http://schemas.openxmlformats.org/officeDocument/2006/';
const WORD = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const SPREADSHEET = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const MIME = Object.freeze({
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});
const SIGNATURE_LOCAL = Buffer.from([0x50, 0x4b, 3, 4]);
const SIGNATURE_CENTRAL = Buffer.from([0x50, 0x4b, 1, 2]);
const SIGNATURE_END = Buffer.from([0x50, 0x4b, 5, 6]);
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1;
    }
    return value >>> 0;
});
const DEFAULT_LIMITS = Object.freeze({
    maximumInputBytes: 32 * 1024 * 1024,
    maximumDecodedBytes: 100 * 1024 * 1024,
    maximumParts: 1000,
    maximumElements: 200000,
    concurrentVerifications: 2,
});
function fail() { throw new Error('BLOB_FORMAT_NOT_ALLOWED'); }
function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes)
        crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ crc >>> 8;
    return (crc ^ 0xffffffff) >>> 0;
}
function partName(name) {
    return name.length > 0 && Buffer.byteLength(name, 'utf8') <= 1024 &&
        !name.startsWith('/') && !name.includes('\\') && !/[\x00-\x1f\x7f]/.test(name) &&
        name.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}
function unpackOffice(data, limits) {
    if (data.length < 22 || !data.subarray(0, 4).equals(SIGNATURE_LOCAL))
        fail();
    let end = -1;
    for (let index = data.length - 22; index >= Math.max(0, data.length - 22 - 65535); index -= 1) {
        if (data.subarray(index, index + 4).equals(SIGNATURE_END) &&
            index + 22 + data.readUInt16LE(index + 20) === data.length) {
            end = index;
            break;
        }
    }
    if (end < 0 || data.readUInt16LE(end + 4) !== 0 || data.readUInt16LE(end + 6) !== 0)
        fail();
    const count = data.readUInt16LE(end + 10);
    const centralSize = data.readUInt32LE(end + 12);
    const centralOffset = data.readUInt32LE(end + 16);
    if (!count || count === 65535 || count > limits.maximumParts ||
        data.readUInt16LE(end + 8) !== count ||
        centralSize === 0xffffffff || centralOffset === 0xffffffff ||
        centralOffset + centralSize !== end)
        fail();
    const result = new Map();
    const seen = new Set();
    const utf8 = new node_util_1.TextDecoder('utf-8', { fatal: true });
    let offset = centralOffset;
    let decoded = 0;
    let firstLocal = centralOffset;
    for (let index = 0; index < count; index += 1) {
        if (offset + 46 > end || !data.subarray(offset, offset + 4).equals(SIGNATURE_CENTRAL))
            fail();
        const flags = data.readUInt16LE(offset + 8);
        const method = data.readUInt16LE(offset + 10);
        const expectedCrc = data.readUInt32LE(offset + 16);
        const compressed = data.readUInt32LE(offset + 20);
        const expanded = data.readUInt32LE(offset + 24);
        const nameLength = data.readUInt16LE(offset + 28);
        const extraLength = data.readUInt16LE(offset + 30);
        const commentLength = data.readUInt16LE(offset + 32);
        const disk = data.readUInt16LE(offset + 34);
        const local = data.readUInt32LE(offset + 42);
        const next = offset + 46 + nameLength + extraLength + commentLength;
        if (next > end || !nameLength || disk !== 0 || flags & 1 ||
            method !== 0 && method !== 8 || compressed === 0xffffffff ||
            expanded === 0xffffffff || local === 0xffffffff || local >= centralOffset ||
            expanded > limits.maximumDecodedBytes - decoded)
            fail();
        const name = utf8.decode(data.subarray(offset + 46, offset + 46 + nameLength));
        if (!partName(name) || seen.has(name.toLowerCase()))
            fail();
        seen.add(name.toLowerCase());
        if (local + 30 + nameLength > centralOffset ||
            !data.subarray(local, local + 4).equals(SIGNATURE_LOCAL) ||
            data.readUInt16LE(local + 6) !== flags ||
            data.readUInt16LE(local + 8) !== method ||
            data.readUInt16LE(local + 26) !== nameLength ||
            !data.subarray(local + 30, local + 30 + nameLength)
                .equals(data.subarray(offset + 46, offset + 46 + nameLength)))
            fail();
        const payload = local + 30 + nameLength + data.readUInt16LE(local + 28);
        if (payload + compressed > centralOffset)
            fail();
        let bytes;
        try {
            const source = data.subarray(payload, payload + compressed);
            bytes = method === 0 ? Buffer.from(source) : (0, node_zlib_1.inflateRawSync)(source, { maxOutputLength: limits.maximumDecodedBytes - decoded + 1 });
        }
        catch {
            fail();
        }
        if (bytes.length !== expanded || crc32(bytes) !== expectedCrc)
            fail();
        result.set(name, bytes);
        decoded += bytes.length;
        firstLocal = Math.min(firstLocal, local);
        offset = next;
    }
    if (offset !== end || firstLocal !== 0)
        fail();
    return result;
}
function attribute(tag, local, uri = '') {
    return Object.values(tag.attributes).find(value => value.local === local && value.uri === uri)?.value;
}
function scanXml(bytes, Parser, total, maximum, visit) {
    const encoding = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe
        ? 'utf-16le' : bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff
        ? 'utf-16be' : 'utf-8';
    const text = new node_util_1.TextDecoder(encoding, { fatal: true }).decode(bytes);
    const parser = new Parser({ xmlns: true });
    let depth = 0;
    let root = '';
    parser.on('xmldecl', declaration => {
        const declared = declaration.encoding?.toLowerCase();
        if (declared && declared !== encoding &&
            !(encoding.startsWith('utf-16') && declared === 'utf-16'))
            fail();
    });
    parser.on('doctype', () => fail());
    parser.on('processinginstruction', () => fail());
    parser.on('opentag', tag => {
        depth += 1;
        total.elements += 1;
        if (depth > 128 || total.elements > maximum)
            fail();
        if (depth === 1)
            root = `${tag.uri}|${tag.local}`;
        visit?.(tag, depth);
    });
    parser.on('closetag', () => { depth -= 1; });
    parser.write(text).close();
    if (depth !== 0 || !root)
        fail();
    return root;
}
function checkOffice(parts, extension, Parser, limits) {
    const all = { elements: 0 };
    for (const [name, bytes] of parts) {
        if (name.toLowerCase().endsWith('.xml') || name.toLowerCase().endsWith('.rels')) {
            scanXml(bytes, Parser, all, limits.maximumElements);
        }
    }
    const main = extension === 'docx' ? 'word/document.xml' : 'xl/workbook.xml';
    const mainType = extension === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
    const types = parts.get('[Content_Types].xml');
    const relationships = parts.get('_rels/.rels');
    const document = parts.get(main);
    if (!types || !relationships || !document)
        fail();
    let typesMatch = false;
    let root = scanXml(types, Parser, { elements: 0 }, limits.maximumElements, (tag, depth) => {
        if (depth === 2 && tag.uri === PACKAGE + 'content-types' && tag.local === 'Override' &&
            attribute(tag, 'PartName') === '/' + main && attribute(tag, 'ContentType') === mainType) {
            typesMatch = true;
        }
    });
    if (root !== PACKAGE + 'content-types|Types' || !typesMatch)
        fail();
    let relationshipMatch = false;
    root = scanXml(relationships, Parser, { elements: 0 }, limits.maximumElements, (tag, depth) => {
        if (depth === 2 && tag.uri === PACKAGE + 'relationships' && tag.local === 'Relationship' &&
            attribute(tag, 'Type') === DOCUMENT + 'relationships/officeDocument' &&
            attribute(tag, 'Target') === main && attribute(tag, 'TargetMode') !== 'External') {
            relationshipMatch = true;
        }
    });
    if (root !== PACKAGE + 'relationships|Relationships' || !relationshipMatch)
        fail();
    if (extension === 'docx') {
        let body = false;
        root = scanXml(document, Parser, { elements: 0 }, limits.maximumElements, (tag, depth) => {
            if (depth === 2 && tag.uri === WORD && tag.local === 'body')
                body = true;
        });
        if (root !== WORD + '|document' || !body)
            fail();
        return;
    }
    const sheets = new Set();
    root = scanXml(document, Parser, { elements: 0 }, limits.maximumElements, (tag, depth) => {
        if (depth === 3 && tag.uri === SPREADSHEET && tag.local === 'sheet') {
            const id = attribute(tag, 'id', DOCUMENT + 'relationships');
            if (id)
                sheets.add(id);
        }
    });
    if (root !== SPREADSHEET + '|workbook' || !sheets.size)
        fail();
    const workbookRels = parts.get('xl/_rels/workbook.xml.rels');
    if (!workbookRels)
        fail();
    const matched = new Set();
    root = scanXml(workbookRels, Parser, { elements: 0 }, limits.maximumElements, (tag, depth) => {
        if (depth !== 2 || tag.uri !== PACKAGE + 'relationships' || tag.local !== 'Relationship' ||
            attribute(tag, 'Type') !== DOCUMENT + 'relationships/worksheet' ||
            attribute(tag, 'TargetMode') === 'External')
            return;
        const id = attribute(tag, 'Id');
        const target = attribute(tag, 'Target');
        if (!id || !target || !sheets.has(id) || !partName(target))
            return;
        const resolved = 'xl/' + target;
        const worksheet = parts.get(resolved);
        if (!resolved.startsWith('xl/worksheets/') || !worksheet)
            return;
        if (scanXml(worksheet, Parser, { elements: 0 }, limits.maximumElements) ===
            SPREADSHEET + '|worksheet')
            matched.add(id);
    });
    if (root !== PACKAGE + 'relationships|Relationships' || matched.size !== sheets.size)
        fail();
}
/** Optional ZIP/XML Office parser; saxes is loaded only for an installed host route. */
class OfficeBlobContentVerifier {
    constructor(limits = DEFAULT_LIMITS) {
        this.active = 0;
        if (!limits || !Number.isSafeInteger(limits.maximumInputBytes) ||
            limits.maximumInputBytes < 1 || limits.maximumInputBytes > 100 * 1024 * 1024 ||
            !Number.isSafeInteger(limits.maximumDecodedBytes) ||
            limits.maximumDecodedBytes < 1 || limits.maximumDecodedBytes > 100 * 1024 * 1024 ||
            !Number.isSafeInteger(limits.maximumParts) || limits.maximumParts < 1 || limits.maximumParts > 10000 ||
            !Number.isSafeInteger(limits.maximumElements) || limits.maximumElements < 1 ||
            limits.maximumElements > 2000000 || !Number.isSafeInteger(limits.concurrentVerifications) ||
            limits.concurrentVerifications < 1 || limits.concurrentVerifications > 32) {
            throw new Error('BLOB_POLICY_INVALID');
        }
        this.limits = Object.freeze({ ...limits });
    }
    get supportedExtensions() { return Object.keys(MIME); }
    async parser() {
        try {
            return (await Promise.resolve().then(() => __importStar(require('saxes')))).SaxesParser;
        }
        catch {
            throw new Error('BLOB_CAPABILITY_MISSING');
        }
    }
    async validateReady() { await this.parser(); }
    async verify(content, extension, maximumBytes) {
        if (!Object.prototype.hasOwnProperty.call(MIME, extension))
            fail();
        if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
            throw new Error('BLOB_POLICY_INVALID');
        }
        if (this.active >= this.limits.concurrentVerifications) {
            throw new Error('BLOB_VERIFICATION_BUSY');
        }
        this.active += 1;
        try {
            const chunks = [];
            const digest = (0, node_crypto_1.createHash)('sha256');
            let size = 0;
            const bound = Math.min(maximumBytes, this.limits.maximumInputBytes);
            try {
                for await (const chunk of content) {
                    if (!(chunk instanceof Uint8Array))
                        throw new Error('BLOB_STORE_FAILED');
                    if (chunk.byteLength > bound - size)
                        throw new Error('BLOB_SIZE_EXCEEDED');
                    const owned = Buffer.from(chunk);
                    chunks.push(owned);
                    digest.update(owned);
                    size += owned.byteLength;
                }
            }
            catch (error) {
                if (error instanceof Error && ['BLOB_SIZE_EXCEEDED', 'BLOB_STORE_FAILED'].includes(error.message)) {
                    throw error;
                }
                throw new Error('BLOB_STORE_FAILED');
            }
            const bytes = Buffer.concat(chunks, size);
            try {
                const parts = unpackOffice(bytes, this.limits);
                checkOffice(parts, extension, await this.parser(), this.limits);
            }
            catch (error) {
                if (error instanceof Error && error.message === 'BLOB_CAPABILITY_MISSING')
                    throw error;
                fail();
            }
            return Object.freeze({ sizeBytes: size, sha256: digest.digest('hex'),
                contentType: MIME[extension] });
        }
        finally {
            this.active -= 1;
        }
    }
}
exports.OfficeBlobContentVerifier = OfficeBlobContentVerifier;
//# sourceMappingURL=content-office.js.map