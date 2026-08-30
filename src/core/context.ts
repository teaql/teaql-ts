import { SelectQuery } from './ast';
import { CheckResult, I18nCatalog, Locale, parseLocale } from './i18n';
import {
  contextSchemaCapability,
  InternalContextSchemaExecutor,
} from './schema-capability';

type Cursor = { cursorId: string; boundary: any; expiresAt: number };
export type RetainedIdSet = { ids: BigUint64Array; expiresAt: number };
export interface IdSetPaginationStore {
  get(key: string): RetainedIdSet | undefined;
  put(key: string, value: RetainedIdSet): void;
  invalidate?(key: string): void;
}
const resourceIdentities = new WeakMap<object, number>();
let nextResourceIdentity = 1;

function resourceIdentity(value: unknown): string {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return String(value);
  const object = value as object;
  let identity = resourceIdentities.get(object);
  if (!identity) { identity = nextResourceIdentity++; resourceIdentities.set(object, identity); }
  return String(identity);
}

export type ContextEntityRef = Readonly<{ entity: string; id: string | number | bigint }>;
export type FixEvidence = Readonly<{
  entityType: string;
  modelPath: string;
  source: 'clock' | 'context';
  sourceLabel: string;
}>;

export class ContextRootError extends Error {
  constructor(
    public readonly reason: 'missing' | 'type_mismatch',
    public readonly expectedType: string,
    public readonly activeRoot?: ContextEntityRef,
  ) {
    super(`context root ${reason}: expected ${expectedType}`);
    this.name = 'ContextRootError';
  }
}

export class UserContext {
  private readonly resources = new Map<string, unknown>();
  private readonly continuousPageCursors = new Map<string, Cursor>();
  private readonly retainedIdSets = new Map<string, RetainedIdSet>();
  private readonly idSetBuilds = new Map<string, Promise<RetainedIdSet | undefined>>();
  private readonly continuousPageRuntime = {
    owner: '',
    get: (key: string, offset: number) => this.getContinuousPageCursor(key, offset),
    put: (key: string, offset: number, cursor: Cursor) => this.putContinuousPageCursor(key, offset, cursor),
    observe: (plan: string, cursorId?: string) => { this.continuousPagePlan = plan; this.continuousPageCursorId = cursorId; },
  };
  private readonly idSetPaginationRuntime = {
    owner: '',
    scope: '',
    get: (key: string) => this.idSetStore().get(key),
    put: (key: string, value: RetainedIdSet) => this.idSetStore().put(key, value),
    build: (key: string, builder: () => Promise<RetainedIdSet | undefined>) =>
      this.singleFlightIdSetBuild(key, builder),
    observe: (plan: string, count?: number) => {
      this.idSetPaginationPlan = plan;
      this.idSetPaginationCount = count;
      this.idSetPaginationCountAccuracy = plan === 'ID_SET_BUILD' || plan === 'ID_SET_HIT'
        ? 'EXACT'
        : plan === 'ID_SET_FALLBACK_LIMIT_EXCEEDED' ? 'LOWER_BOUND' : 'UNKNOWN';
    },
  };
  public userIdentifier = '';
  public continuousPagePlan = 'DISABLED';
  public continuousPageCursorId?: string;
  public idSetPaginationPlan = 'ID_SET_DISABLED';
  public idSetPaginationCount?: number;
  public idSetPaginationCountAccuracy: 'EXACT' | 'LOWER_BOUND' | 'UNKNOWN' = 'UNKNOWN';
  public locale: Locale = 'en';
  public i18nCatalog: I18nCatalog = I18nCatalog.builtin;

  setLocaleCode(code: string): this { const locale = parseLocale(code); this.locale = locale; return this; }
  setLanguageCode(code: string): this { return this.setLocaleCode(code); }
  installI18nCatalog(catalog: I18nCatalog): this { if(!catalog) throw new Error('catalog is required'); this.i18nCatalog=catalog; return this; }
  installIdSetPaginationStore(store: IdSetPaginationStore): this {
    if (!store) throw new Error('ID set pagination store is required');
    return this.insertResource('idSetPaginationStore', store);
  }
  translateCheckResults(results: CheckResult[]): CheckResult[] { return results.map(result=>this.i18nCatalog.translate(result,this.locale)); }

  beginFixEvidence(): this { return this.insertResource('fixEvidenceCurrent', [] as FixEvidence[]); }
  recordFixEvidence(evidence: FixEvidence): this {
    const label = String(evidence.sourceLabel || '');
    const normalized = label.toLowerCase();
    if (!evidence.entityType || !evidence.modelPath || !label
        || normalized.includes('authorization') || normalized.includes('cookie') || normalized.includes('token=')) {
      throw new TypeError('Fix evidence must contain only safe framework provenance labels');
    }
    const current = this.getResource<FixEvidence[]>('fixEvidenceCurrent') ?? [];
    if (!this.getResource<FixEvidence[]>('fixEvidenceCurrent')) this.insertResource('fixEvidenceCurrent', current);
    current.push(Object.freeze({ ...evidence }));
    return this;
  }
  finishFixEvidence(): this {
    const current = this.getResource<FixEvidence[]>('fixEvidenceCurrent') ?? [];
    this.insertResource('fixEvidenceLast', Object.freeze([...current]));
    return this.removeResource('fixEvidenceCurrent');
  }
  lastFixEvidence(): readonly FixEvidence[] {
    return this.getResource<readonly FixEvidence[]>('fixEvidenceLast') ?? [];
  }

  insertResource<T>(name: string, resource: T): this {
    this.resources.set(name, resource);
    return this;
  }

  getResource<T>(name: string): T | undefined {
    return this.resources.get(name) as T | undefined;
  }

  removeResource(name: string): this { this.resources.delete(name); return this; }

  requireResource<T>(name: string): T {
    const resource = this.getResource<T>(name);
    if (resource === undefined) {
      throw new Error(`Required UserContext resource is missing: ${name}`);
    }
    return resource;
  }

  /**
   * Explicitly reconcile the installed Runtime Module with this context's data service.
   * Installing a module never performs schema changes.
   */
  ensureSchema(): Promise<void> {
    const service = this.requireResource<Partial<InternalContextSchemaExecutor>>('dataService');
    const ensure = service[contextSchemaCapability];
    if (!ensure) {
      throw new Error('Configured dataService is not a schema-aware TeaQL provider');
    }
    return ensure.call(service, this);
  }

  withActiveRoot(root: ContextEntityRef): this {
    if (!root || !root.entity || root.id === undefined || root.id === null) {
      throw new TypeError('active root must be a typed entity reference');
    }
    return this.insertResource('activeRoot', Object.freeze({ ...root }));
  }

  requireActiveRoot(expectedType: string): ContextEntityRef {
    const root = this.getResource<ContextEntityRef>('activeRoot');
    if (!root) throw new ContextRootError('missing', expectedType);
    if (root.entity !== expectedType) throw new ContextRootError('type_mismatch', expectedType, root);
    return root;
  }

  /**
   * Bind local optimization state without copying trusted runtime resources
   * into the query or federation JSON payload.
   */
  prepareQuery(query: SelectQuery): SelectQuery {
    this.continuousPageRuntime.owner = this.userIdentifier;
    this.idSetPaginationRuntime.owner = this.userIdentifier;
    const activeRoot = this.getResource<ContextEntityRef>('activeRoot');
    this.idSetPaginationRuntime.scope = [
      this.userIdentifier,
      activeRoot ? `${activeRoot.entity}:${String(activeRoot.id)}` : '-',
      resourceIdentity(this.getResource('dataService')),
    ].join('|');
    return query
      .bindContinuousPageRuntime(this.continuousPageRuntime)
      .bindIdSetPaginationRuntime(this.idSetPaginationRuntime);
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

  private getRetainedIdSet(key: string): RetainedIdSet | undefined {
    const value = this.retainedIdSets.get(key);
    if (value && value.expiresAt <= Date.now()) {
      this.retainedIdSets.delete(key);
      return undefined;
    }
    return value;
  }

  private idSetStore(): IdSetPaginationStore {
    return this.getResource<IdSetPaginationStore>('idSetPaginationStore') ?? {
      get: key => this.getRetainedIdSet(key),
      put: (key, value) => this.putRetainedIdSet(key, value),
      invalidate: key => { this.retainedIdSets.delete(key); },
    };
  }

  private putRetainedIdSet(key: string, value: RetainedIdSet): void {
    const memoryCeiling = 256 * 1024 * 1024;
    if (value.ids.byteLength > memoryCeiling) {
      throw new Error('ID set exceeds the process-local store memory ceiling');
    }
    const retainedBytes = () => [...this.retainedIdSets.values()]
      .reduce((sum, retained) => sum + retained.ids.byteLength, 0);
    while (this.retainedIdSets.size >= 64
      || retainedBytes() + value.ids.byteLength > memoryCeiling) {
      const oldest = [...this.retainedIdSets.entries()]
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
      if (!oldest) break;
      this.retainedIdSets.delete(oldest[0]);
    }
    this.retainedIdSets.set(key, value);
  }

  private async singleFlightIdSetBuild(
    key: string,
    builder: () => Promise<RetainedIdSet | undefined>,
  ): Promise<{ value: RetainedIdSet | undefined; built: boolean }> {
    const existing = this.idSetBuilds.get(key);
    if (existing) return { value: await existing, built: false };
    const pending = builder();
    this.idSetBuilds.set(key, pending);
    try { return { value: await pending, built: true }; }
    finally { this.idSetBuilds.delete(key); }
  }
}
