import type { SQLExecutionMetadata } from '../sql/core';
export declare const PLAINTEXT_LOG_ENV = "TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS";
export declare const PLAINTEXT_LOG_ACK = "I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK";
export declare function plaintextLogsEnabled(): boolean;
export declare function credentialName(name: string): boolean;
export declare function logValueStrings(value: unknown): string[];
export declare function scrubLogText(text: string | undefined, values: readonly string[]): string | undefined;
export declare function projectSQLLog(metadata: SQLExecutionMetadata): SQLExecutionMetadata;
//# sourceMappingURL=log-privacy.d.ts.map