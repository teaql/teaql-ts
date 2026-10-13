export type TelemetrySignal = 'traces' | 'logs' | 'metrics';
export type TelemetryLossReason = 'queue_overflow' | 'export_failure' | 'shutdown' | 'handoff_failure';
export type QueueHealth = Readonly<{
    offered: number;
    admitted: number;
    completed: number;
    outstanding: number;
    exporting: number;
    overflow: number;
    postShutdown: number;
    handoffFailed: number;
    retired: number;
}>;
/** Bounded admission counts in-flight records too, never only the visible SDK queue. */
export declare class ExportHealth {
    private readonly signal;
    private readonly capacity;
    private readonly onLoss;
    private readonly pending;
    private readonly records;
    private readonly changed;
    private offered;
    private admitted;
    private completed;
    private overflow;
    private postShutdown;
    private handoffFailed;
    private retired;
    private failures;
    private closed;
    private aborted;
    private readonly announced;
    constructor(signal: TelemetrySignal, capacity: number, onLoss: (amount: number, signal: TelemetrySignal, reason: TelemetryLossReason) => void);
    admit(amount?: number): boolean;
    complete(amount: number, failed: boolean): void;
    private reserve;
    /** SDK object identity carries admission; never infer tickets from equal data or completion order. */
    handoff(record: object, submit: () => void): void;
    beginExport(records: readonly object[]): {
        complete(failed: boolean): void;
    } | undefined;
    private settle;
    abortQueued(): void;
    /** Captured prefix excludes later submissions and cannot be satisfied by their completion. */
    waitForPrefix(timeoutMillis?: number): Promise<void>;
    waitForIdle(timeoutMillis?: number): Promise<void>;
    private wait;
    private notify;
    private lost;
    get pendingRecords(): number;
    get failedRecords(): number;
    close(): void;
    rejectLate(): void;
    snapshot(): QueueHealth;
}
export declare function lifecycleDeadline<T>(work: Promise<T>, timeoutMillis?: number): Promise<T>;
//# sourceMappingURL=export-health.d.ts.map