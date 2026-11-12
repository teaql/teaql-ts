import { SelectQuery } from './ast';
import { BusinessClock, SystemBusinessClock } from './business-clock';
import { ObjectStorage, ObjectStorageProvider, ObjectStorageObserver } from './object-storage';
import { CheckResult, I18nCatalog, Locale, parseLocale } from './i18n';
import { CheckerPrivacyPolicy, prepareCheckerResults, translateCheckerResults } from './checker-privacy';
import {CheckerMessageCatalog, CheckerMessageConfiguration, CheckerMessageRenderer, CheckerMessageWarning,
  CheckerPresentationModel, CheckerValidationOrigin, bindCheckerOrigin, renderNaturalCheckerResult,
  standardCheckerMessageRenderer} from './natural-messages';
import { internalId, InternalIdGenerator, InternalIdReservationService } from './internal-id';
import {
  contextSchemaCapability,
  InternalContextSchemaExecutor,
} from './schema-capability';
import {
  MutationGovernanceSink,
  MutationGovernanceSnapshot,
  MutationPlan,
  MutationPolicyApprovalProvider,
  MutationPolicyRegistry,
  MutationPolicyRuntimeState,
} from './mutation-policy';

type Cursor = { cursorId: string; boundary: any; expiresAt: number };
/** Trusted adapter inputs for one synchronous Checker invocation, never retained by Context. */
export type CheckerMessageInput = Readonly<{
  defaultModel?: CheckerPresentationModel;
  privacyPolicy?: CheckerPrivacyPolicy;
  checkedValues?: readonly Readonly<Record<string, unknown>>[];
}>;
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
    public readonly reason: 'missing' | 'type_mismatch' | 'invalid_id',
    public readonly expectedType: string,
    public readonly activeRoot?: ContextEntityRef,
  ) {
    super(`context root ${reason}: expected ${expectedType}`);
    this.name = 'ContextRootError';
  }
}

export class UserContext {
  withInternalIdGenerator(generator: InternalIdGenerator): this {
    if (!generator || typeof generator.generateId !== 'function') {
      throw new TypeError('Internal ID generator must provide generateId(entity, context)');
    }
    return this.insertResource('idGenerator', generator);
  }

  /** Reserve before constructing an entity. Failure must never choose another allocator. */
  async generateInternalId(entity: string): Promise<string> {
    if (typeof entity !== 'string' || !entity.trim() || entity !== entity.trim()) {
      throw new TypeError('Internal ID entity type is required');
    }
    if (this.resources.has('idGenerator')) {
      const generator = this.getResource<InternalIdGenerator>('idGenerator');
      if (!generator || typeof generator.generateId !== 'function') {
        throw new TypeError('Configured internal ID generator must provide generateId(entity, context)');
      }
      return internalId(await generator.generateId(entity, this));
    }
    const service = this.requireResource<InternalIdReservationService>('dataService');
    if (typeof service.reserveInternalId !== 'function') {
      throw new TypeError('Configured data service must provide reserveInternalId(entity, context)');
    }
    return internalId(await service.reserveInternalId(entity, this));
  }

  private businessClock: BusinessClock = new SystemBusinessClock();
  withBusinessClock(clock: BusinessClock): this {
    if (!clock || typeof clock.now !== 'function') throw new TypeError('Business clock must provide now()');
    this.businessClock = clock;
    return this;
  }
  businessTime(): Date {
    const value = this.businessClock.now();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError('Business clock returned an invalid Date');
    return new Date(value.getTime());
  }
  /** UTC calendar date derived from the same business-clock provider. */
  businessDate(): string { return this.businessTime().toISOString().slice(0, 10); }

  withObjectStorage(provider: ObjectStorageProvider): this { return this.insertResource('objectStorageProvider', provider); }
  withObjectStorageObserver(observer: ObjectStorageObserver): this { return this.insertResource('objectStorageObserver', observer); }
  objectStorage(comment: string): ObjectStorage { return new ObjectStorage(this, comment); }
  /** Runtime-owned outer boundary used by generated Q execution, never SDK code. */
  async withQueryRequest<T>(query: SelectQuery, work: () => Promise<T>): Promise<T> {
    const service = this.requireResource<{
      withQueryRequest?<R>(query: SelectQuery, work: () => Promise<R>): Promise<R>;
    }>('dataService');
    return service.withQueryRequest ? service.withQueryRequest(query, work) : work();
  }

  private readonly mutationPolicy = new MutationPolicyRuntimeState();
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
  private naturalCatalog=CheckerMessageCatalog.builtin;
  private naturalModel=CheckerPresentationModel.empty;
  private naturalRenderer:CheckerMessageRenderer=standardCheckerMessageRenderer;
  private naturalWarning:(code:CheckerMessageWarning)=>void=code=>console.warn(code);

  get checkerPresentationModel():CheckerPresentationModel{return this.naturalModel;}
  installCheckerPresentationModel(model:CheckerPresentationModel):this {
    if(!(model instanceof CheckerPresentationModel))throw new TypeError('Checker presentation model required');
    this.naturalModel=model;return this;
  }
  installCheckerMessageCatalog(source:string):this {
    const catalog=CheckerMessageCatalog.fromJson(source);this.naturalCatalog=catalog;return this;
  }
  installCheckerMessageRenderer(renderer:CheckerMessageRenderer):this {
    if(typeof renderer!=='function')throw new TypeError('Checker renderer required');this.naturalRenderer=renderer;return this;
  }
  installCheckerMessageWarning(sink:(code:CheckerMessageWarning)=>void):this {
    if(typeof sink!=='function')throw new TypeError('Checker warning sink required');this.naturalWarning=sink;return this;
  }
  /** Immutable configuration, not a closure capturing this Context. */
  captureCheckerMessages(defaultModel=CheckerPresentationModel.empty):CheckerMessageConfiguration {
    return Object.freeze({model:this.naturalModel===CheckerPresentationModel.empty?defaultModel:this.naturalModel,
      catalog:this.naturalCatalog,legacy:this.i18nCatalog,locale:parseLocale(this.locale),renderer:this.naturalRenderer,warning:this.naturalWarning});
  }
  translateCheckResultsFrom(origin:string,results:CheckResult[],input:CheckerMessageInput={}):CheckResult[] {
    const model=this.captureCheckerMessages(input.defaultModel).model;
    const bound=bindCheckerOrigin(results,Object.freeze({model,entity:origin}));
    results.splice(0,results.length,...bound);
    translateCheckerResults(this,results,origin,input.privacyPolicy??(()=>undefined),input.checkedValues??[]);
    return results;
  }
  /** Runtime graph boundary supplies an already-captured immutable origin. */
  renderCheckerGraphResults(results:readonly CheckResult[],config:CheckerMessageConfiguration,origin:CheckerValidationOrigin):CheckResult[] {
    if(config.legacy.translate!==I18nCatalog.prototype.translate||this.translateCheckResults!==UserContext.prototype.translateCheckResults)return [...results];
    const scope=prepareCheckerResults(results),warnings=new Set<CheckerMessageWarning>();
    try{return scope.finish(scope.values.map(result=>renderNaturalCheckerResult(config,result,warnings,origin)));}
    finally{scope.close();}
  }

  setLocaleCode(code: string): this { const locale = parseLocale(code); this.locale = locale; return this; }
  setLanguageCode(code: string): this { return this.setLocaleCode(code); }
  installI18nCatalog(catalog: I18nCatalog): this { if(!catalog) throw new Error('catalog is required'); this.i18nCatalog=catalog; return this; }
  installIdSetPaginationStore(store: IdSetPaginationStore): this {
    if (!store) throw new Error('ID set pagination store is required');
    return this.insertResource('idSetPaginationStore', store);
  }
  translateCheckResults(results: CheckResult[], declaringEntityType?: string): CheckResult[] {
    if (!results.length) return results;
    const scope = prepareCheckerResults(results, declaringEntityType);
    try {
      // Existing subclass/duck-typed catalog hooks remain authoritative. Their
      // results still pass the same final privacy projection.
      const custom=this.i18nCatalog.translate!==I18nCatalog.prototype.translate;
      const config=this.captureCheckerMessages(),warnings=new Set<CheckerMessageWarning>();
      const translated = scope.values.map(result => custom?this.i18nCatalog.translate(result,this.locale):renderNaturalCheckerResult(config,result,warnings));
      results.splice(0, results.length, ...scope.finish(translated));
      return results;
    } finally { scope.close(); }
  }

  withMutationPolicyRegistry(registry: MutationPolicyRegistry): this {
    if (!registry || typeof registry.resolve !== 'function') {
      throw new TypeError('mutation policy registry must expose resolve(requestKey)');
    }
    this.mutationPolicy.setRegistry(registry);
    return this;
  }

  withMutationPolicyApprovalProvider(provider: MutationPolicyApprovalProvider): this {
    if (!provider || typeof provider.findApproval !== 'function') {
      throw new TypeError('mutation policy approval provider must expose findApproval(identity)');
    }
    this.mutationPolicy.setApprovalProvider(provider);
    return this;
  }

  withMutationGovernanceSink(sink: MutationGovernanceSink): this {
    if (!sink || typeof sink.onWarning !== 'function') {
      throw new TypeError('mutation governance sink must expose onWarning(context, warning)');
    }
    this.mutationPolicy.setWarningSink(sink);
    return this;
  }

  reviewMutationPlan(plan: MutationPlan): MutationGovernanceSnapshot {
    return this.mutationPolicy.review(this, plan);
  }

  /** @internal Used by governed data-service graph orchestration. */
  beginMutationPolicyGraph(): void { this.mutationPolicy.beginGraph(); }
  /** @internal Generated post-Fix snapshots are reviewed before provider work. */
  prepareMutationPolicyGraph(rootEntity?: string): void {this.mutationPolicy.prepareGraphReview(this, rootEntity);}
  /** @internal Used by generated preflight after Checker/Fix. */
  recordMutationPolicyPreflight(mutation: unknown): void {
    this.mutationPolicy.recordPreflight(mutation);
  }
  /** @internal Called at the provider mutation boundary. */
  enterMutationPolicy(mutation: unknown): MutationGovernanceSnapshot {
    return this.mutationPolicy.enterMutation(this, mutation).snapshot;
  }
  /** @internal Must run before the surrounding graph transaction commits. */
  ensureMutationPolicyGraphComplete(): void { this.mutationPolicy.ensureGraphComplete(); }
  /** @internal Always runs when the graph operation leaves its transaction. */
  endMutationPolicyGraph(): void { this.mutationPolicy.endGraph(); }

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
    // A request root must identify a persisted object, never an unset/temporary
    // key or a rounded JS number. Exact wide strings/bigints keep their type;
    // the provider remains responsible for its supported numeric range.
    const id = root.id;
    const valid = typeof id === 'number' ? Number.isSafeInteger(id) && id > 0
      : typeof id === 'bigint' ? id > 0n : typeof id === 'string' && /^[1-9][0-9]*$/.test(id);
    if (!valid) throw new ContextRootError('invalid_id', expectedType, root);
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
