import { ObjectByteStream, ObjectContent, ObjectKey, ObjectMetadata, ObjectPutOptions, ObjectConditionalDeleteResult, ObjectReadUrl, ObjectReadUrlOptions, ObjectStorageProvider, StorageInvocation } from '../core/object-storage';
type Manifest = {
    version: string;
    size: number;
    contentType: string;
    etag: string;
    lastModified: string;
    metadata: Record<string, string>;
};
export declare class FileObjectStorage implements ObjectStorageProvider {
    protected readonly root: string;
    private readonly secret;
    private server?;
    private publicBaseUrl?;
    constructor(root: string, signingKey: Uint8Array);
    protected directory(hash: string): string;
    protected manifest(hash: string): Promise<Manifest | undefined>;
    protected metadata(key: ObjectKey, manifest: Manifest): ObjectMetadata;
    protected withManifestLock<T>(_hash: string, work: () => Promise<T>): Promise<T>;
    protected withWriterLock<T>(_hash: string, work: () => Promise<T>): Promise<T>;
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
/** Opt-in File provider for hosts with better-sqlite3. Use a dedicated private
 * root, shared only by fenced instances. Its separate lock database supplies
 * crash-released, cross-process exclusion for manifest mutations. */
export declare class SqliteFencedFileObjectStorage extends FileObjectStorage {
    private withSqliteLock;
    protected withManifestLock<T>(_hash: string, work: () => Promise<T>): Promise<T>;
    protected withWriterLock<T>(hash: string, work: () => Promise<T>): Promise<T>;
    /** Host-scheduled cleanup for one known key after all processes sharing this
     * private root have upgraded to the writer-lock-capable provider. */
    sweepOldGenerations(key: ObjectKey): Promise<number>;
    deleteIfVersion(_invocation: StorageInvocation, key: ObjectKey, contentVersion: string): Promise<ObjectConditionalDeleteResult>;
}
export {};
//# sourceMappingURL=file.d.ts.map