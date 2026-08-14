import { SelectQuery } from './ast';
export declare class UserContext {
    private readonly resources;
    private readonly continuousPageCursors;
    private readonly continuousPageRuntime;
    userIdentifier: string;
    continuousPagePlan: string;
    continuousPageCursorId?: string;
    insertResource<T>(name: string, resource: T): this;
    getResource<T>(name: string): T | undefined;
    requireResource<T>(name: string): T;
    /**
     * Bind local optimization state without copying trusted runtime resources
     * into the query or federation JSON payload.
     */
    prepareQuery(query: SelectQuery): SelectQuery;
    private getContinuousPageCursor;
    private putContinuousPageCursor;
}
//# sourceMappingURL=context.d.ts.map