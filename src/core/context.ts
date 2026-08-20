import { SelectQuery } from './ast';
import { CheckResult, I18nCatalog, Locale, parseLocale } from './i18n';

type Cursor = { cursorId: string; boundary: any; expiresAt: number };

export class UserContext {
  private readonly resources = new Map<string, unknown>();
  private readonly continuousPageCursors = new Map<string, Cursor>();
  private readonly continuousPageRuntime = {
    owner: '',
    get: (key: string, offset: number) => this.getContinuousPageCursor(key, offset),
    put: (key: string, offset: number, cursor: Cursor) => this.putContinuousPageCursor(key, offset, cursor),
    observe: (plan: string, cursorId?: string) => { this.continuousPagePlan = plan; this.continuousPageCursorId = cursorId; },
  };
  public userIdentifier = '';
  public continuousPagePlan = 'DISABLED';
  public continuousPageCursorId?: string;
  public locale: Locale = 'en';
  public i18nCatalog: I18nCatalog = I18nCatalog.builtin;

  setLocaleCode(code: string): this { const locale = parseLocale(code); this.locale = locale; return this; }
  setLanguageCode(code: string): this { return this.setLocaleCode(code); }
  installI18nCatalog(catalog: I18nCatalog): this { if(!catalog) throw new Error('catalog is required'); this.i18nCatalog=catalog; return this; }
  translateCheckResults(results: CheckResult[]): CheckResult[] { return results.map(result=>this.i18nCatalog.translate(result,this.locale)); }

  insertResource<T>(name: string, resource: T): this {
    this.resources.set(name, resource);
    return this;
  }

  getResource<T>(name: string): T | undefined {
    return this.resources.get(name) as T | undefined;
  }

  requireResource<T>(name: string): T {
    const resource = this.getResource<T>(name);
    if (resource === undefined) {
      throw new Error(`Required UserContext resource is missing: ${name}`);
    }
    return resource;
  }

  /**
   * Bind local optimization state without copying trusted runtime resources
   * into the query or federation JSON payload.
   */
  prepareQuery(query: SelectQuery): SelectQuery {
    this.continuousPageRuntime.owner = this.userIdentifier;
    return query.bindContinuousPageRuntime(this.continuousPageRuntime);
  }

  private getContinuousPageCursor(key: string, offset: number): Cursor | undefined {
    const storeKey = `${key}:${offset}`;
    const cursor = this.continuousPageCursors.get(storeKey);
    if (cursor && cursor.expiresAt <= Date.now()) { this.continuousPageCursors.delete(storeKey); return undefined; }
    return cursor;
  }

  private putContinuousPageCursor(key: string, offset: number, cursor: Cursor): void {
    if (this.continuousPageCursors.size >= 4096) {
      const oldest = [...this.continuousPageCursors.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
      if (oldest) this.continuousPageCursors.delete(oldest[0]);
    }
    this.continuousPageCursors.set(`${key}:${offset}`, cursor);
  }
}
