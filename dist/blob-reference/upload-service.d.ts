import { BlobFieldSpec, BlobRef } from '../core/blob-ref';
import type { UserContext } from '../core/context';
import { ObjectByteStream } from '../core/object-storage';
import { SqlBlobCatalog } from './sql-catalog';
export type BlobUploadTarget = Readonly<{
    entity: string;
    entityId: string | null;
    field: string;
}>;
export type BlobUploadInput = Readonly<{
    fileName: string;
    declaredSize: number;
    declaredContentType?: string;
}>;
export type BlobVerifiedContent = Readonly<{
    sizeBytes: number;
    sha256: string;
    contentType: string;
}>;
/** The host must resolve the current model and make independent field/action decisions. */
export interface BlobUploadAuthorization {
    scope(context: UserContext): string;
    field(context: UserContext, target: BlobUploadTarget): BlobFieldSpec;
    authorize(context: UserContext, target: BlobUploadTarget, action: 'Begin' | 'Write' | 'Confirm', input: BlobUploadInput): Promise<boolean>;
}
/** A mandatory trusted byte parser. Client MIME and object metadata cannot implement this SPI. */
export interface BlobContentVerifier {
    verify(content: ObjectByteStream, extension: string, maximumBytes: number): Promise<BlobVerifiedContent>;
}
export type BlobUploadSession = Readonly<{
    uploadId: string;
    reference: BlobRef;
    expiresAt: Date;
}>;
/** SQLite server-stream upload path. Installation is explicit through SqlBlobCatalog.ensureSchema. */
export declare class SqliteBlobUploadService {
    private readonly catalog;
    private readonly authorization;
    private readonly verifier;
    private readonly maximumBytes;
    private readonly leaseSeconds;
    private readonly now;
    constructor(catalog: SqlBlobCatalog, authorization: BlobUploadAuthorization, verifier: BlobContentVerifier, maximumBytes: number, leaseSeconds?: number, now?: () => number);
    private current;
    private normalize;
    private digest;
    begin(context: UserContext, target: BlobUploadTarget, input: BlobUploadInput, replayKey: string): Promise<BlobUploadSession>;
    private row;
    private objectKey;
    write(context: UserContext, uploadId: string, source: ObjectByteStream): Promise<number>;
    complete(context: UserContext, uploadId: string): Promise<BlobRef>;
}
//# sourceMappingURL=upload-service.d.ts.map