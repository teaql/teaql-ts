import type { ObjectByteStream } from '../core/object-storage';
import type { BlobContentVerifier, BlobVerifiedContent } from './upload-service';
export type SharpVerifierLimits = Readonly<{
    maximumInputBytes: number;
    maximumDecodedBytes: number;
    concurrentVerifications: number;
}>;
/** Optional, bounded image parser. Construction does not load sharp or touch storage. */
export declare class SharpBlobContentVerifier implements BlobContentVerifier {
    private readonly limits;
    private active;
    constructor(limits?: SharpVerifierLimits);
    get supportedExtensions(): readonly string[];
    /** Host-controlled readiness check; optional sharp is loaded only here or during verify. */
    validateReady(): Promise<void>;
    private decoder;
    verify(content: ObjectByteStream, extension: string, maximumBytes: number): Promise<BlobVerifiedContent>;
}
//# sourceMappingURL=content-sharp.d.ts.map