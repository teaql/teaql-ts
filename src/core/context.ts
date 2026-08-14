import { SelectQuery } from './ast';

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
