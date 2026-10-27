import { ObjectByteStream, ObjectContent, ObjectKey, ObjectMetadata, ObjectPutOptions, ObjectReadUrl, ObjectReadUrlOptions, ObjectStorageProvider, StorageInvocation } from '../core/object-storage';
export declare class FileObjectStorage implements ObjectStorageProvider {
    private readonly root;
    private readonly secret;
    private server?;
    private publicBaseUrl?;
    constructor(root: string, signingKey: Uint8Array);
    private directory;
    private manifest;
    private metadata;
    put(_invocation: StorageInvocation, key: ObjectKey, content: ObjectByteStream, options: ObjectPutOptions): Promise<ObjectMetadata>;
    get(_invocation: StorageInvocation, key: ObjectKey): Promise<ObjectContent>;
    head(_invocation: StorageInvocation, key: ObjectKey): Promise<ObjectMetadata | undefined>;
    delete(_invocation: StorageInvocation, key: ObjectKey): Promise<void>;
    private ticket;
    private unticket;
    getReadUrl(_invocation: StorageInvocation, key: ObjectKey, options: ObjectReadUrlOptions): Promise<ObjectReadUrl>;
    /** Explicit host action. The returned URL can be advertised through a trusted reverse proxy. */
    start(host?: string, port?: number, advertisedBaseUrl?: string): Promise<string>;
    close(): Promise<void>;
    private serve;
    toString(): string;
}
//# sourceMappingURL=file.d.ts.map