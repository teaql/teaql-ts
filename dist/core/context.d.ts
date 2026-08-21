import { SelectQuery } from './ast';
import { CheckResult, I18nCatalog, Locale } from './i18n';
export declare class UserContext {
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
     * Bind local optimization state without copying trusted runtime resources
     * into the query or federation JSON payload.
     */
    prepareQuery(query: SelectQuery): SelectQuery;
    private getContinuousPageCursor;
    private putContinuousPageCursor;
}
//# sourceMappingURL=context.d.ts.map