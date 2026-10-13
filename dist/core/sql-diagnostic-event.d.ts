import type { RuntimeDiagnosticEvent, RuntimeExecutionCorrelation } from './telemetry';
import type { SQLExecutionMetadata } from '../sql/core';
/** Does not spread metadata, parameters, rows, audit payloads or entity IDs. */
export declare function sqlDiagnosticEvent(metadata: SQLExecutionMetadata, correlation?: RuntimeExecutionCorrelation): RuntimeDiagnosticEvent;
//# sourceMappingURL=sql-diagnostic-event.d.ts.map