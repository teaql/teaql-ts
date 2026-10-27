import type { ObjectByteStream } from '../core/object-storage';
import type { BlobContentVerifier, BlobVerifiedContent } from './upload-service';
export type FfmpegVerifierLimits = Readonly<{
    maximumInputBytes: number;
    maximumFrames: number;
    maximumVideoPixels: number;
    concurrentVerifications: number;
}>;
/** Optional Linux adapter; all binaries are trusted host configuration. */
export declare class FfmpegBlobContentVerifier implements BlobContentVerifier {
    readonly ffprobePath: string;
    readonly ffmpegPath: string;
    readonly prlimitPath: string;
    private readonly limits;
    private active;
    constructor(ffprobePath: string, ffmpegPath: string, prlimitPath: string, limits?: FfmpegVerifierLimits);
    get supportedExtensions(): readonly string[];
    private execute;
    validateReady(): Promise<void>;
    verify(content: ObjectByteStream, extension: string, maximumBytes: number): Promise<BlobVerifiedContent>;
}
//# sourceMappingURL=content-ffmpeg.d.ts.map