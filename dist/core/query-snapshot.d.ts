export declare function queryDiagnosticOrigin(query: object): object | undefined;
export declare function retainQueryDiagnosticOrigin(source: object, target: object): void;
/** Capture request-owned AST values while retaining opaque local capabilities.
 * Date/binary values keep their native types. Non-enumerable runtime policy and
 * Context handles are intentionally not traversed or serialized. */
export declare function snapshotQuery<T>(value: T, seen?: Map<object, unknown>): T;
//# sourceMappingURL=query-snapshot.d.ts.map