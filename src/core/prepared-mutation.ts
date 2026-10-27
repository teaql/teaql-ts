import {CheckException} from './checker';
import {EntityKey, EntityRoot} from './entity-root';
import {LoadedScalarSnapshot} from './loaded-scalar-snapshot';
import {ObjectLocation} from './object-location';
import {snapshotQuery} from './query-snapshot';
import type {MutationRequest} from './request-intent';
import {entityVersion} from './mutation-version';

const refField = '__teaql_prepared_reference';
const keyOf = (key: EntityKey) => `${key.entity}\0${typeof key.id}:${String(key.id)}`;
export class PreparedMutationError extends CheckException {
  readonly code = 'MUTATION_CHANGED_AFTER_PREPARATION';
  constructor(field = '') {
    super([{ruleId: 'mutation_changed_after_preparation', location: field ? ObjectLocation.property(field) : ObjectLocation.root(),
      message: 'Mutation differs from its prepared and reviewed state; prepare and review it again'}]);
    this.name = 'PreparedMutationError';
  }
}
type References = Readonly<Record<string, string>>;
type RootState = {values: LoadedScalarSnapshot; version: unknown; fresh: boolean; deleted: boolean; trace: LoadedScalarSnapshot};
type Source = {object: object; token: symbol; root: EntityRoot; key: EntityKey; origin: EntityKey; references: References;
  read: () => Record<string, unknown>; native?: LoadedScalarSnapshot; state?: RootState};
type Entry = {request: MutationRequest<any>; root?: EntityRoot; key: EntityKey; mutation: any; references: References;
  values: LoadedScalarSnapshot; input: LoadedScalarSnapshot; loaded: LoadedScalarSnapshot; state?: RootState; status: 'prepared' | 'executed' | 'applied' | 'committed';
  result?: {id: unknown; version: unknown}};

/** Invocation-owned detached state. Never a Context ledger or a wire payload. */
export class PreparedGraphState {
  private sources: Source[] = [];
  private objects = new WeakMap<object, Source>();
  private tokens = new Map<symbol, Source>();
  private entries: Entry[] = [];
  private aliases = new Map<string, EntityKey>();
  private bindings: Array<{read: () => unknown; value: unknown}> = [];
  private metadata: Array<{read: () => Record<string, unknown>; value: LoadedScalarSnapshot}> = [];
  sealed = false;
  get rootEntity(): string | undefined {return this.sources[0]?.key.entity ?? this.entries[0]?.key.entity;}
  get size(): number {return this.entries.length;}

  register(object: object, root: EntityRoot, key: EntityKey, references: References, read: () => Record<string, unknown>): void {
    if (this.sealed) throw new PreparedMutationError();
    if (this.objects.has(object)) return;
    const source: Source = {object, token: Symbol('prepared entity'), root, key: {...key}, origin: {...key}, references, read};
    this.objects.set(object, source); this.tokens.set(source.token, source); this.sources.push(source);
  }
  members(objects: readonly object[]): readonly symbol[] {
    return objects.map(object => {const source = this.objects.get(object); if (!source) throw new PreparedMutationError(); return source.token;});
  }
  bind(read: () => unknown): void {this.bindings.push({read, value: read()});}
  bindMetadata(read: () => Record<string, unknown>): void {this.metadata.push({read, value: new LoadedScalarSnapshot(read())});}
  captureInput(): void {
    for (const source of this.sources) source.native = new LoadedScalarSnapshot(this.canonical(source.read(), source.references));
  }
  private resolved(key: EntityKey): EntityKey {return this.aliases.get(keyOf(key)) ?? key;}
  private canonical(values: Readonly<Record<string, unknown>>, references: References): Record<string, unknown> {
    const result: Record<string, unknown> = {...values};
    for (const [field, target] of Object.entries(references)) {
      const value = result[field]; if (!value || typeof value !== 'object') continue;
      const source = this.objects.get(value);
      if (source) {
        if (source.key.entity !== target) throw new PreparedMutationError(field);
        result[field] = {[refField]: source.token};
      } else if ((value as any).id !== undefined && (value as any).id !== null) result[field] = (value as any).id;
      else throw new PreparedMutationError(field);
    }
    return result;
  }
  private materialize(values: Readonly<Record<string, unknown>>, logical = false): Record<string, unknown> {
    return Object.fromEntries(Object.entries(values).map(([field, value]) => {
      const token = value && typeof value === 'object' ? (value as any)[refField] : undefined;
      if (typeof token !== 'symbol') return [field, value];
      const source = this.tokens.get(token); if (!source) throw new PreparedMutationError(field);
      const target = this.resolved(source.origin);
      if (!logical && !this.aliases.has(keyOf(source.origin)) && source.root.isNew(source.key)) throw new PreparedMutationError(field);
      return [field, target.id];
    }));
  }
  private difference(expected: LoadedScalarSnapshot, actual: Record<string, unknown>): string | undefined {
    // Logical IDs make references comparable before assignment; assigned IDs
    // then permit only the exact typed parent that was already reviewed.
    return new LoadedScalarSnapshot(this.materialize(expected.values(), true)).changedField(this.materialize(actual, true));
  }
  private rootState(root: EntityRoot, key: EntityKey, references: References): RootState {
    return {values: new LoadedScalarSnapshot(this.canonical(root.change(key), references)), version: root.originalVersion(key),
      fresh: root.isNew(key), deleted: root.isDeleted(key), trace: new LoadedScalarSnapshot({trace: root.traceChain(key)})};
  }
  private assertRoot(root: EntityRoot, key: EntityKey, references: References, expected: RootState): void {
    if (root.originalVersion(key) !== expected.version) throw new PreparedMutationError('version');
    if (root.isNew(key) !== expected.fresh || root.isDeleted(key) !== expected.deleted) throw new PreparedMutationError();
    const field = this.difference(expected.values, this.canonical(root.change(key), references));
    if (field !== undefined) throw new PreparedMutationError(field);
    if (expected.trace.changedField({trace: root.traceChain(key)}) !== undefined) throw new PreparedMutationError('comment');
  }
  private assertNative(source: Source): void {
    if (!source.native) throw new PreparedMutationError();
    const field = this.difference(source.native, this.canonical(source.read(), source.references));
    if (field !== undefined) throw new PreparedMutationError(field === '__teaql_comment' ? 'comment'
      : field === '__teaql_key' ? 'id' : field.startsWith('__teaql_') ? '' : field);
  }
  remember(request: MutationRequest<any>, mutation: any, references: References): any {
    if (this.sealed) throw new PreparedMutationError();
    const root = mutation.ledgerRoot as EntityRoot | undefined;
    const key: EntityKey = mutation.ledgerKey ?? {entity: String(mutation.entity), id: mutation.id ?? Symbol('unassigned') as any};
    if (this.entries.some(entry => root && entry.root === root && keyOf(entry.key) === keyOf(key))) throw new PreparedMutationError('id');
    const values = new LoadedScalarSnapshot(this.canonical(mutation.payload ?? {}, references));
    const entry: Entry = {request, root, key: {...key}, mutation: {...mutation, payload: undefined}, references, values,
      input: new LoadedScalarSnapshot(this.canonical(request.mutation.payload ?? {}, references)),
      loaded: new LoadedScalarSnapshot(this.canonical(request.loadedValues(), references)),
      state: root ? this.rootState(root, key, references) : undefined, status: 'prepared'};
    this.entries.push(entry);
    return {...mutation, id: mutation.id ?? mutation.ledgerKey?.id, payload: this.materialize(values.values(), true)};
  }
  seal(): void {
    if (this.sealed) return;
    for (const source of this.sources) this.assertNative(source);
    for (const entry of this.entries) if (entry.root && entry.state) this.assertRoot(entry.root, entry.key, entry.references, entry.state);
    for (const source of this.sources) source.state = this.rootState(source.root, source.key, source.references);
    this.sealed = true; this.validate();
  }
  validate(): void {
    for (const binding of this.bindings) if (binding.read() !== binding.value) throw new PreparedMutationError('context');
    for (const metadata of this.metadata) if (metadata.value.changedField(metadata.read()) !== undefined) throw new PreparedMutationError('metadata');
    for (const source of this.sources) {
      this.assertNative(source);
      if (source.state) this.assertRoot(source.root, source.key, source.references, source.state);
    }
    for (const entry of this.entries) if (entry.root && entry.state) this.assertRoot(entry.root, this.resolved(entry.key), entry.references, entry.state);
  }
  private entry(request: MutationRequest<any>): Entry {
    const mutation = request.mutation;
    const entry = this.entries.find(entry => entry.request === request || (mutation.ledgerRoot && entry.root === mutation.ledgerRoot
      && mutation.ledgerKey && keyOf(this.resolved(entry.key)) === keyOf(mutation.ledgerKey)))
      ?? this.entries.find(entry => !entry.root && entry.status === 'prepared' && entry.mutation.entity === mutation.entity
        && entry.mutation.action === mutation.action && entry.mutation.id === mutation.id
        && this.difference(entry.root && mutation.action === 'Update' ? entry.values : entry.input,
          this.canonical(mutation.payload ?? {}, entry.references)) === undefined);
    if (!entry) throw new PreparedMutationError(); return entry;
  }
  replay(request: MutationRequest<any>): any | undefined {
    if (!this.sealed) return undefined;
    this.validate(); const entry = this.entry(request), actual = request.mutation, expected = entry.mutation;
    if (entry.status !== 'prepared') throw new PreparedMutationError();
    if (actual.entity !== expected.entity || actual.action !== expected.action) throw new PreparedMutationError();
    if (actual.id !== expected.id) throw new PreparedMutationError('id');
    if (actual.action !== 'Create' && entityVersion(actual.version !== undefined ? actual.version : actual.expectedVersion)
      !== (expected.version ?? expected.expectedVersion)) throw new PreparedMutationError('version');
    if (request.comment !== expected.comment) throw new PreparedMutationError('comment');
    // Create/Delete requests are built from unchanged native input. Fix-derived
    // fields live in the private ledger and prepared values, not in that input.
    let field = this.difference(entry.root && actual.action === 'Update' ? entry.values : entry.input,
      this.canonical(actual.payload ?? {}, entry.references));
    if (field !== undefined) throw new PreparedMutationError(field);
    field = this.difference(entry.loaded, this.canonical(request.loadedValues(), entry.references));
    if (field !== undefined) throw new PreparedMutationError(field);
    return {...expected, ledgerKey: actual.ledgerKey, ledgerRoot: actual.ledgerRoot,
      payload: snapshotQuery(this.materialize(entry.values.values()))};
  }
  providerResult(request: MutationRequest<any>, result: any): void {
    if (!this.sealed) return;
    this.validate(); const entry = this.entry(request);
    if (entry.status !== 'prepared') throw new PreparedMutationError();
    entry.result = {id: result.id, version: result.version}; entry.status = 'executed';
    if (!this.sources.some(source => source.root === entry.root && keyOf(source.key) === keyOf(entry.key))) entry.status = 'applied';
  }
  applied(root: EntityRoot, oldKey: EntityKey, newKey: EntityKey): void {
    if (!this.sealed) return;
    const entry = this.entries.find(entry => entry.root === root && keyOf(this.resolved(entry.key)) === keyOf(oldKey));
    if (!entry || entry.status !== 'executed' || entry.result?.id !== newKey.id || oldKey.entity !== newKey.entity) throw new PreparedMutationError('id');
    if (keyOf(oldKey) !== keyOf(newKey)) {
      if (entry.mutation.action !== 'Create' || this.aliases.has(keyOf(entry.key))) throw new PreparedMutationError('id');
      this.aliases.set(keyOf(entry.key), {...newKey});
    }
    entry.status = 'applied'; entry.state = this.rootState(root, newKey, entry.references);
    for (const source of this.sources) if (source.root === root && keyOf(source.key) === keyOf(oldKey)) {
      source.key = {...newKey}; source.native = new LoadedScalarSnapshot(this.canonical(source.read(), source.references));
      source.state = this.rootState(root, newKey, source.references);
    }
  }
  committed(root: EntityRoot, key: EntityKey): void {
    for (const entry of this.entries) if (entry.root === root && keyOf(this.resolved(entry.key)) === keyOf(key)) {
      entry.status = 'committed'; entry.state = this.rootState(root, key, entry.references);
    }
    for (const source of this.sources) if (source.root === root && keyOf(source.key) === keyOf(key)) source.state = this.rootState(root, key, source.references);
  }
  complete(): void {
    if (!this.sealed) return;
    this.validate(); if (this.entries.some(entry => entry.status !== 'applied' && entry.status !== 'committed')) throw new PreparedMutationError();
  }
}
