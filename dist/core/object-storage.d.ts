import type { UserContext } from './context';
export type StorageErrorCode = 'InvalidInput' | 'NotConfigured' | 'NotFound' | 'AccessDenied' | 'Conflict' | 'Timeout' | 'Unavailable' | 'Unsupported' | 'TooLarge' | 'Io';
export declare class StorageError extends Error {
    readonly code: StorageErrorCode;
    constructor(code: StorageErrorCode);
}
declare const inspect: unique symbol;
export declare const MAX_OBJECT_PUT_SIZE: number;
export declare class ObjectKey {
    #private;
    constructor(value: string);
    get value(): string;
    toString(): string;
    [inspect](): string;
}
export type ObjectWriteMode = 'create_only' | 'replace';
export declare class ObjectPutOptions {
    #private;
    constructor(size: number, mode: ObjectWriteMode, contentType?: string, metadata?: Record<string, string>);
    get size(): number;
    get mode(): ObjectWriteMode;
    get contentType(): string;
    get metadata(): Readonly<Record<string, string>>;
    toString(): string;
    [inspect](): string;
}
export declare class ObjectMetadata {
    #private;
    constructor(key: ObjectKey, size: number, contentType?: string, etag?: string, lastModified?: Date, metadata?: Record<string, string>);
    get key(): ObjectKey;
    get size(): number;
    get contentType(): string | undefined;
    get etag(): string | undefined;
    get lastModified(): Date | undefined;
    get customMetadata(): Readonly<Record<string, string>>;
    toString(): string;
    [inspect](): string;
}
export declare class ObjectReadUrlOptions {
    #private;
    constructor(seconds?: number, disposition?: 'inline' | 'attachment', filename?: string);
    get seconds(): number;
    get contentDisposition(): string | undefined;
    toString(): string;
    [inspect](): string;
}
export declare class ObjectReadUrl {
    #private;
    constructor(url: string, expiresAt: Date);
    get url(): string;
    get expiresAt(): Date;
    toString(): string;
    [inspect](): string;
}
export type ObjectByteStream = AsyncIterable<Uint8Array>;
export type StorageInvocation = Readonly<{
    context: UserContext;
    comment: string;
}>;
export interface ObjectStorageProvider {
    put(invocation: StorageInvocation, key: ObjectKey, content: ObjectByteStream, options: ObjectPutOptions): Promise<ObjectMetadata>;
    get(invocation: StorageInvocation, key: ObjectKey): Promise<ObjectContent>;
    head(invocation: StorageInvocation, key: ObjectKey): Promise<ObjectMetadata | undefined>;
    delete(invocation: StorageInvocation, key: ObjectKey): Promise<void>;
    getReadUrl(invocation: StorageInvocation, key: ObjectKey, options: ObjectReadUrlOptions): Promise<ObjectReadUrl>;
}
export type ObjectStorageEvent = Readonly<{
    operation: string;
    comment: string;
    traceId: string;
    outcome: string;
    elapsedMs: number;
}>;
export type ObjectStorageObserver = (event: ObjectStorageEvent) => void;
export declare class ObjectContent {
    #private;
    constructor(metadata: ObjectMetadata, stream: ObjectByteStream, close: () => Promise<void>);
    get metadata(): ObjectMetadata;
    get stream(): ObjectByteStream;
    close(): Promise<void>;
    toString(): string;
    [inspect](): string;
}
export declare class ObjectStorage {
    #private;
    constructor(context: UserContext, comment: string);
    put(key: ObjectKey, content: ObjectByteStream, options: ObjectPutOptions): Promise<ObjectMetadata>;
    putBytes(key: ObjectKey, bytes: Uint8Array, options: ObjectPutOptions): Promise<ObjectMetadata>;
    get(key: ObjectKey): Promise<ObjectContent>;
    getBytes(key: ObjectKey, maximumBytes: number): Promise<Uint8Array>;
    head(key: ObjectKey): Promise<ObjectMetadata | undefined>;
    exists(key: ObjectKey): Promise<boolean>;
    delete(key: ObjectKey): Promise<void>;
    getReadUrl(key: ObjectKey, options?: ObjectReadUrlOptions): Promise<ObjectReadUrl>;
}
export {};
//# sourceMappingURL=object-storage.d.ts.map