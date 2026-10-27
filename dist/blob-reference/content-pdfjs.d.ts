import type { ObjectByteStream } from '../core/object-storage';
import type { BlobContentVerifier, BlobVerifiedContent } from './upload-service';
export type PdfjsVerifierLimits = Readonly<{
    maximumInputBytes: number;
    maximumPages: number;
    maximumOperatorsPerPage: number;
    maximumImagePixels: number;
    concurrentVerifications: number;
}>;
/** Optional PDF parser. Construction never loads PDF.js or touches storage. */
export declare class PdfjsBlobContentVerifier implements BlobContentVerifier {
    private readonly limits;
    private active;
    constructor(limits?: PdfjsVerifierLimits);
    get supportedExtensions(): readonly string[];
    validateReady(): Promise<void>;
    private decoder;
    verify(content: ObjectByteStream, extension: string, maximumBytes: number): Promise<BlobVerifiedContent>;
}
//# sourceMappingURL=content-pdfjs.d.ts.map