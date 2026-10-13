"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlDiagnosticEvent = void 0;
/** Does not spread metadata, parameters, rows, audit payloads or entity IDs. */
function sqlDiagnosticEvent(metadata, correlation) {
    if (metadata.logMode !== 'masked')
        throw new Error('Telemetry requires safe SQL projection');
    const nodes = (frames = []) => JSON.stringify(frames.map(frame => ({ kind: frame.kind, name: frame.name, detail: frame.detail ?? '' })));
    return Object.freeze({ body: 'TeaQL SQL execution', correlation,
        attributes: Object.freeze({
            'teaql.trace_chain': nodes(metadata.traceChain),
            'teaql.trace_path': nodes(metadata.tracePath),
            'teaql.mutation_lineage': nodes(metadata.mutationLineage),
            'teaql.intent.comment': metadata.comment ?? metadata.auditReason ?? '',
            'teaql.intent.purpose': metadata.purpose ?? '',
            'teaql.sql.debug': metadata.debugSQL,
            'teaql.sql.log_mode': metadata.logMode,
            'teaql.sql.operation': metadata.operation,
            'teaql.sql.outcome': metadata.executionOutcome ?? 'unknown',
            'teaql.sql.elapsed_us': metadata.elapsedMicros,
            ...(metadata.resultCount === undefined ? {} : { 'teaql.sql.result_count': metadata.resultCount }),
            ...(metadata.affectedRows === undefined ? {} : { 'teaql.sql.affected_rows': metadata.affectedRows }),
        }) });
}
exports.sqlDiagnosticEvent = sqlDiagnosticEvent;
//# sourceMappingURL=sql-diagnostic-event.js.map