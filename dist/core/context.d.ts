import { SelectQuery } from './ast';
import { CheckResult, I18nCatalog, Locale } from './i18n';
import { EntityRoot } from './entity-root';
export type ContextEntityRef = Readonly<{
    entity: string;
    id: string | number | bigint;
}>;
/** Application-level schema capability. Physical SQL drivers are deliberately not exposed here. */
export interface ContextSchemaExecutor {
    ensureSchema(context: UserContext): Promise<void>;
}
export declare class ContextRootError extends Error {
    readonly reason: 'missing' | 'type_mismatch';
    readonly expectedType: string;
    readonly activeRoot?: Readonly<{
        entity: string;
        id: string | number | bigint;
    }> | undefined;
    constructor(reason: 'missing' | 'type_mismatch', expectedType: string, activeRoot?: Readonly<{
        entity: string;
        id: string | number | bigint;
    }> | undefined);
}
export declare class UserContext {
    readonly entityRoot: EntityRoot;
    private readonly resources;
    private readonly continuousPageCursors;
    private readonly continuousPageRuntime;
    userIdentifier: string;
    continuousPagePlan: string;
    continuousPageCursorId?: string;
    locale: Locale;
    i18nCatalog: I18nCatalog;
    setLocaleCode(code: string): this;
    setLanguageCode(code: string): this;
    installI18nCatalog(catalog: I18nCatalog): this;
    translateCheckResults(results: CheckResult[]): CheckResult[];
    insertResource<T>(name: string, resource: T): this;
    getResource<T>(name: string): T | undefined;
    removeResource(name: string): this;
    requireResource<T>(name: string): T;
    /**
     * Explicitly reconcile the installed Runtime Module with this context's data service.
     * Installing a module never performs schema changes.
     */
    ensureSchema(): Promise<void>;
    withActiveRoot(root: ContextEntityRef): this;
    requireActiveRoot(expectedType: string): ContextEntityRef;
    /**
     * Bind local optimization state without copying trusted runtime resources
     * into the query or federation JSON payload.
     */
    prepareQuery(query: SelectQuery): SelectQuery;
    private getContinuousPageCursor;
    private putContinuousPageCursor;
}
//# sourceMappingURL=context.d.ts.map