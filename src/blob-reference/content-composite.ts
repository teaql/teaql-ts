import type { ObjectByteStream } from '../core/object-storage';
import type { BlobContentVerifier, BlobVerifiedContent } from './upload-service';

/** A passive host-selected routing table for independently optional parsers. */
export class CompositeBlobContentVerifier implements BlobContentVerifier {
  private readonly routes: ReadonlyMap<string, BlobContentVerifier>;

  constructor(routes: Readonly<Record<string, BlobContentVerifier>>) {
    if (!routes || typeof routes !== 'object') throw new Error('BLOB_POLICY_INVALID');
    const entries = Object.entries(routes);
    if (entries.length === 0 || entries.length > 32 || entries.some(([extension, verifier]) =>
      !/^[a-z0-9]{1,16}$/.test(extension) || !verifier ||
      typeof verifier.verify !== 'function')) {
      throw new Error('BLOB_POLICY_INVALID');
    }
    this.routes = new Map(entries);
  }

  get supportedExtensions(): readonly string[] {
    return Object.freeze([...this.routes.keys()].sort());
  }

  async validateReady(): Promise<void> {
    for (const verifier of new Set(this.routes.values())) {
      await verifier.validateReady?.();
    }
  }

  async verify(content: ObjectByteStream, extension: string,
               maximumBytes: number): Promise<BlobVerifiedContent> {
    const verifier = this.routes.get(extension);
    if (!verifier) throw new Error('BLOB_FORMAT_NOT_ALLOWED');
    return verifier.verify(content, extension, maximumBytes);
  }
}
