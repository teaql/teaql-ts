import type { SQLExecutionMetadata } from '../sql/core';
export { PLAINTEXT_LOG_ENV, PLAINTEXT_LOG_ACK, maskAuditValue, credentialName, hasCredentials, logValueStrings, plaintextLogsEnabled, scrubLogText } from './value-privacy';
/** @internal Keep result reprojection safe without serializing raw provenance. */
export declare function retainSQLLogProvenance(metadata: SQLExecutionMetadata, bindings?: SQLLogBindingSource, intentValues?: readonly unknown[]): void;
/** Internal SQL compiler/runtime plumbing, never a request or wire option. */
export type SQLLogBindingSource = Pick<SQLExecutionMetadata, 'parameterizedSQL' | 'parameters' | 'parameterLogPolicies' | 'sqlOrigin'>;
/** Audit is always safe-mode; explicitly public loaded scalars are not secrets. */
export declare function privateLogValueStrings(source?: SQLLogBindingSource): string[];
/** Internal compiler plumbing: snapshot and flatten ancestor binding policies.
 * Never attach this raw provenance to a query payload or projected log record. */
export declare function inheritSQLLogBindings(source: SQLLogBindingSource, inherited?: SQLLogBindingSource): SQLLogBindingSource;
export declare function projectSQLLog(metadata: SQLExecutionMetadata, inherited?: SQLLogBindingSource, intentValues?: readonly unknown[]): SQLExecutionMetadata;
/** Telemetry always uses safe mode even when local plaintext debugging is enabled. */
export declare function projectSafeSQLLog(metadata: SQLExecutionMetadata): SQLExecutionMetadata;
//# sourceMappingURL=log-privacy.d.ts.map