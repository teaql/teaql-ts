import type { ObjectByteStream } from '../core/object-storage';
import type { BlobContentVerifier, BlobVerifiedContent } from './upload-service';
export type OfficeVerifierLimits = Readonly<{
    maximumInputBytes: number;
    maximumDecodedBytes: number;
    maximumParts: number;
    maximumElements: number;
    concurrentVerifications: number;
}>;
/** Optional ZIP/XML Office parser; saxes is loaded only for an installed host route. */
export declare class OfficeBlobContentVerifier implements BlobContentVerifier {
    private readonly limits;
    private active;
    constructor(limits?: OfficeVerifierLimits);
    get supportedExtensions(): readonly string[];
    private parser;
    validateReady(): Promise<void>;
    verify(content: ObjectByteStream, extension: string, maximumBytes: number): Promise<BlobVerifiedContent>;
}
//# sourceMappingURL=content-office.d.ts.map