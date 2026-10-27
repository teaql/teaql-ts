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
exports.PdfjsBlobContentVerifier = void 0;
const node_crypto_1 = require("node:crypto");
const DEFAULT_LIMITS = Object.freeze({
    maximumInputBytes: 32 * 1024 * 1024,
    maximumPages: 1000,
    maximumOperatorsPerPage: 100000,
    maximumImagePixels: 16 * 1024 * 1024,
    concurrentVerifications: 2,
});
function pdfEnvelopeComplete(bytes) {
    if (bytes.length < 16 || bytes.toString('ascii', 0, 5) !== '%PDF-')
        return false;
    let end = bytes.length;
    while (end > 0 && [9, 10, 12, 13, 32].includes(bytes[end - 1]))
        end -= 1;
    return end >= 5 && bytes.toString('ascii', end - 5, end) === '%%EOF';
}
/** Optional PDF parser. Construction never loads PDF.js or touches storage. */
class PdfjsBlobContentVerifier {
    constructor(limits = DEFAULT_LIMITS) {
        this.active = 0;
        if (!limits || !Number.isSafeInteger(limits.maximumInputBytes) ||
            limits.maximumInputBytes < 1 || limits.maximumInputBytes > 100 * 1024 * 1024 ||
            !Number.isSafeInteger(limits.maximumPages) ||
            limits.maximumPages < 1 || limits.maximumPages > 1000 ||
            !Number.isSafeInteger(limits.maximumOperatorsPerPage) ||
            limits.maximumOperatorsPerPage < 1 || limits.maximumOperatorsPerPage > 1000000 ||
            !Number.isSafeInteger(limits.maximumImagePixels) ||
            limits.maximumImagePixels < 1 || limits.maximumImagePixels > 64 * 1024 * 1024 ||
            !Number.isSafeInteger(limits.concurrentVerifications) ||
            limits.concurrentVerifications < 1 || limits.concurrentVerifications > 32) {
            throw new Error('BLOB_POLICY_INVALID');
        }
        this.limits = Object.freeze({ ...limits });
    }
    get supportedExtensions() { return ['pdf']; }
    async validateReady() { await this.decoder(); }
    async decoder() {
        try {
            return await Promise.resolve().then(() => __importStar(require('pdfjs-dist/legacy/build/pdf.mjs')));
        }
        catch {
            throw new Error('BLOB_CAPABILITY_MISSING');
        }
    }
    async verify(content, extension, maximumBytes) {
        if (extension !== 'pdf')
            throw new Error('BLOB_FORMAT_NOT_ALLOWED');
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
            if (!pdfEnvelopeComplete(bytes))
                throw new Error('BLOB_FORMAT_NOT_ALLOWED');
            const decoder = await this.decoder();
            // PDF.js owns the transferred buffer, so keep the digest and size first.
            const task = decoder.getDocument({
                data: new Uint8Array(bytes), stopAtErrors: true, maxImageSize: this.limits.maximumImagePixels,
                useSystemFonts: false, useWasm: false, enableXfa: false, isOffscreenCanvasSupported: false,
                isImageDecoderSupported: false, verbosity: decoder.VerbosityLevel.ERRORS,
            });
            try {
                const document = await task.promise;
                if (document.numPages < 1 || document.numPages > this.limits.maximumPages ||
                    document.isPureXfa)
                    throw new Error('invalid PDF page set');
                for (let index = 1; index <= document.numPages; index += 1) {
                    const page = await document.getPage(index);
                    const [, , width, height] = page.view;
                    if (!Number.isFinite(width) || !Number.isFinite(height) ||
                        width <= 0 || height <= 0 || width > 14400 || height > 14400) {
                        throw new Error('invalid PDF media box');
                    }
                    // Parsing the operator list checks page content streams, not only headers.
                    const operations = await page.getOperatorList();
                    if (operations.fnArray.length > this.limits.maximumOperatorsPerPage ||
                        operations.argsArray.length !== operations.fnArray.length) {
                        throw new Error('PDF operator limit');
                    }
                    page.cleanup();
                }
            }
            catch {
                throw new Error('BLOB_FORMAT_NOT_ALLOWED');
            }
            finally {
                await task.destroy();
            }
            return Object.freeze({ sizeBytes: size, sha256: digest.digest('hex'),
                contentType: 'application/pdf' });
        }
        finally {
            this.active -= 1;
        }
    }
}
exports.PdfjsBlobContentVerifier = PdfjsBlobContentVerifier;
//# sourceMappingURL=content-pdfjs.js.map