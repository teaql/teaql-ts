import type { SQLExecutionMetadata } from '../sql/core';
export declare const PLAINTEXT_LOG_ENV = "TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS";
export declare const PLAINTEXT_LOG_ACK = "I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK";
/** Business-field masking; credentials always need complete redaction instead. */
export declare function maskAuditValue(value: string): string;
export declare function plaintextLogsEnabled(): boolean;
export declare function credentialName(name: string): boolean;
export declare function hasCredentials(value: unknown): boolean;
export declare function logValueStrings(value: unknown): string[];
export declare function scrubLogText(text: string | undefined, values: readonly string[]): string | undefined;
/** Internal SQL compiler/runtime plumbing, never a request or wire option. */
export type SQLLogBindingSource = Pick<SQLExecutionMetadata, 'parameterizedSQL' | 'parameters' | 'parameterLogPolicies' | 'sqlOrigin'>;
/** Internal compiler plumbing: snapshot and flatten ancestor binding policies.
 * Never attach this raw provenance to a query payload or projected log record. */
export declare function inheritSQLLogBindings(source: SQLLogBindingSource, inherited?: SQLLogBindingSource): SQLLogBindingSource;
export declare function projectSQLLog(metadata: SQLExecutionMetadata, inherited?: SQLLogBindingSource): SQLExecutionMetadata;
//# sourceMappingURL=log-privacy.d.ts.map