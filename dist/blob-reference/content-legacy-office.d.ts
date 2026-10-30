import type { ObjectByteStream } from '../core/object-storage';
import type { BlobContentVerifier, BlobVerifiedContent } from './upload-service';
export type LegacyOfficeVerifierLimits = Readonly<{
    maximumInputBytes: number;
    maximumConvertedBytes: number;
    concurrentVerifications: number;
}>;
/** Optional Linux DOC/XLS conversion adapter; the host provisions trusted tools and scratch. */
export declare class LegacyOfficeBlobContentVerifier implements BlobContentVerifier {
    readonly sofficePath: string;
    readonly bwrapPath: string;
    readonly prlimitPath: string;
    readonly scratchRoot: string;
    private active;
    private readonly limits;
    private readonly packageVerifier;
    constructor(sofficePath: string, bwrapPath: string, prlimitPath: string, scratchRoot: string, limits?: LegacyOfficeVerifierLimits);
    get supportedExtensions(): readonly string[];
    validateReady(): Promise<void>;
    private run;
    private convert;
    verify(content: ObjectByteStream, extension: string, maximumBytes: number): Promise<BlobVerifiedContent>;
}
//# sourceMappingURL=content-legacy-office.d.ts.map