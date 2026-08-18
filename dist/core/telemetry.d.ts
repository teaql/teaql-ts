export type RuntimeOperationFamily = 'query' | 'mutation' | 'relation_load' | 'provider' | 'cache' | 'tfp' | 'audit';
export type RuntimeAttributeValue = string | number | boolean;
export interface RuntimeOperation {
    readonly family: RuntimeOperationFamily;
    readonly name: string;
    readonly attributes?: Readonly<Record<string, RuntimeAttributeValue>>;
}
export interface RuntimeOperationCompletion {
    readonly attributes?: Readonly<Record<string, RuntimeAttributeValue>>;
}
export interface RuntimeTelemetryScope {
    success(completion?: RuntimeOperationCompletion): void;
    failure(error: unknown): void;
    run?<T>(work: () => Promise<T>): Promise<T>;
}
/** Provider-neutral TeaQL lifecycle contract. Implementations must be fail open. */
export interface RuntimeTelemetry {
    start(operation: RuntimeOperation): RuntimeTelemetryScope;
    inject?(carrier: Record<string, string>): void;
    flush?(): void | Promise<void>;
    shutdown?(): void | Promise<void>;
}
/** Inject the active runtime trace into transport metadata without affecting business work. */
export declare function injectRuntimeContext(telemetry: RuntimeTelemetry | undefined, carrier: Record<string, string>): Record<string, string>;
export declare const NOOP_RUNTIME_TELEMETRY: RuntimeTelemetry;
export declare function safeRuntimeOperation(operation: RuntimeOperation): RuntimeOperation;
export declare function startRuntimeOperation(telemetry: RuntimeTelemetry | undefined, operation: RuntimeOperation): RuntimeTelemetryScope;
export declare function observeRuntimeOperation<T>(telemetry: RuntimeTelemetry | undefined, operation: RuntimeOperation, work: () => Promise<T>, completion?: (result: T) => RuntimeOperationCompletion): Promise<T>;
//# sourceMappingURL=telemetry.d.ts.map