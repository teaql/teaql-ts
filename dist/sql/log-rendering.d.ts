/** Render provider placeholders as SQL literals so the statement can be copied into a SQL client. */
export type SQLDatabaseKind = 'postgresql' | 'mysql' | 'sqlite';
export type SQLParameterLogPolicy = 'plain' | 'masked' | 'credential' | 'unknown';
export declare function debugSQL(parameterizedSQL: string, parameters: readonly unknown[], databaseKind?: SQLDatabaseKind): string;
/** Shared scanner for diagnostics. A callback enables strict bind accounting. */
export declare function renderSQL(parameterizedSQL: string, parameters: readonly unknown[], databaseKind: SQLDatabaseKind, parameterLiteral?: (index: number) => string): string;
export declare function sqlLiteral(value: unknown, databaseKind: SQLDatabaseKind): string;
//# sourceMappingURL=log-rendering.d.ts.map