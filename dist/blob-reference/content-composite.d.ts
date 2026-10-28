import type { ObjectByteStream } from '../core/object-storage';
import type { BlobContentVerifier, BlobVerifiedContent } from './upload-service';
/** A passive host-selected routing table for independently optional parsers. */
export declare class CompositeBlobContentVerifier implements BlobContentVerifier {
    private readonly routes;
    constructor(routes: Readonly<Record<string, BlobContentVerifier>>);
    get supportedExtensions(): readonly string[];
    validateReady(): Promise<void>;
    verify(content: ObjectByteStream, extension: string, maximumBytes: number): Promise<BlobVerifiedContent>;
}
//# sourceMappingURL=content-composite.d.ts.map