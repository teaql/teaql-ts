/** Server-only adapter. SDK types and filesystem dependencies stay outside core. */
import { S3Client } from '@aws-sdk/client-s3';
import { ObjectStorageProvider, StorageInvocation, ObjectKey, ObjectByteStream, ObjectPutOptions, ObjectMetadata, ObjectContent, ObjectReadUrlOptions, ObjectReadUrl } from '../core/object-storage';
export declare class S3ObjectStorage implements ObjectStorageProvider {
    #private;
    constructor(client: S3Client, bucket: string);
    put(_: StorageInvocation, key: ObjectKey, content: ObjectByteStream, options: ObjectPutOptions): Promise<ObjectMetadata>;
    get(_: StorageInvocation, key: ObjectKey): Promise<ObjectContent>;
    head(_: StorageInvocation, key: ObjectKey): Promise<ObjectMetadata | undefined>;
    delete(_: StorageInvocation, key: ObjectKey): Promise<void>;
    getReadUrl(_: StorageInvocation, key: ObjectKey, options: ObjectReadUrlOptions): Promise<ObjectReadUrl>;
    close(): void;
    toString(): string;
}
//# sourceMappingURL=s3.d.ts.map