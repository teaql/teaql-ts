import { createHash } from 'node:crypto';
import type { ObjectByteStream } from '../core/object-storage';
import type { BlobContentVerifier, BlobVerifiedContent } from './upload-service';

export type PdfjsVerifierLimits = Readonly<{
  maximumInputBytes: number;
  maximumPages: number;
  maximumOperatorsPerPage: number;
  maximumImagePixels: number;
  concurrentVerifications: number;
}>;

const DEFAULT_LIMITS: PdfjsVerifierLimits = Object.freeze({
  maximumInputBytes: 32 * 1024 * 1024,
  maximumPages: 1000,
  maximumOperatorsPerPage: 100000,
  maximumImagePixels: 16 * 1024 * 1024,
  concurrentVerifications: 2,
});

function pdfEnvelopeComplete(bytes: Buffer): boolean {
  if (bytes.length < 16 || bytes.toString('ascii', 0, 5) !== '%PDF-') return false;
  let end = bytes.length;
  while (end > 0 && [9, 10, 12, 13, 32].includes(bytes[end - 1])) end -= 1;
  return end >= 5 && bytes.toString('ascii', end - 5, end) === '%%EOF';
}

/** Optional PDF parser. Construction never loads PDF.js or touches storage. */
export class PdfjsBlobContentVerifier implements BlobContentVerifier {
  private readonly limits: PdfjsVerifierLimits;
  private active = 0;

  constructor(limits: PdfjsVerifierLimits = DEFAULT_LIMITS) {
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

  get supportedExtensions(): readonly string[] { return ['pdf']; }

  async validateReady(): Promise<void> { await this.decoder(); }

  private async decoder(): Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> {
    try { return await import('pdfjs-dist/legacy/build/pdf.mjs'); }
    catch { throw new Error('BLOB_CAPABILITY_MISSING'); }
  }

  async verify(content: ObjectByteStream, extension: string,
               maximumBytes: number): Promise<BlobVerifiedContent> {
    if (extension !== 'pdf') throw new Error('BLOB_FORMAT_NOT_ALLOWED');
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
      throw new Error('BLOB_POLICY_INVALID');
    }
    if (this.active >= this.limits.concurrentVerifications) {
      throw new Error('BLOB_VERIFICATION_BUSY');
    }
    this.active += 1;
    try {
      const chunks: Buffer[] = [];
      const digest = createHash('sha256');
      let size = 0;
      const bound = Math.min(maximumBytes, this.limits.maximumInputBytes);
      try {
        for await (const chunk of content) {
          if (!(chunk instanceof Uint8Array)) throw new Error('BLOB_STORE_FAILED');
          if (chunk.byteLength > bound - size) throw new Error('BLOB_SIZE_EXCEEDED');
          const owned = Buffer.from(chunk);
          chunks.push(owned);
          digest.update(owned);
          size += owned.byteLength;
        }
      } catch (error) {
        if (error instanceof Error && ['BLOB_SIZE_EXCEEDED', 'BLOB_STORE_FAILED'].includes(error.message)) {
          throw error;
        }
        throw new Error('BLOB_STORE_FAILED');
      }
      const bytes = Buffer.concat(chunks, size);
      if (!pdfEnvelopeComplete(bytes)) throw new Error('BLOB_FORMAT_NOT_ALLOWED');
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
            document.isPureXfa) throw new Error('invalid PDF page set');
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
      } catch { throw new Error('BLOB_FORMAT_NOT_ALLOWED'); }
      finally { await task.destroy(); }
      return Object.freeze({ sizeBytes: size, sha256: digest.digest('hex'),
        contentType: 'application/pdf' });
    } finally {
      this.active -= 1;
    }
  }
}
