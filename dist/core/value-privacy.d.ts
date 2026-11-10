/** Shared value privacy primitives; independent of SQL, contexts and providers. */
export declare const PLAINTEXT_LOG_ENV = "TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS";
export declare const PLAINTEXT_LOG_ACK = "I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK";
export declare function maskAuditValue(value: string): string;
export declare function plaintextLogsEnabled(): boolean;
export declare function credentialName(name: string): boolean;
export declare function hasCredentials(value: unknown): boolean;
export declare function logValueStrings(value: unknown): string[];
export declare function scrubLogText(text: string | undefined, values: readonly string[]): string | undefined;
/** Internal shared structured-value implementation, not a public barrel API. */
export declare function businessMask(value: unknown, seen?: WeakSet<object>): unknown;
//# sourceMappingURL=value-privacy.d.ts.map