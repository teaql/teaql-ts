export type EntityId = string | number | bigint;

export type EntityKey = Readonly<{ entity: string; id: EntityId }>;
export type EntityChange = Readonly<{ key: EntityKey; values: Readonly<Record<string, unknown>> }>;

const identity = (key: EntityKey): string => `${key.entity}\u0000${typeof key.id}:${String(key.id)}`;

/** Pending mutation ledger shared by one generated object graph. */
export class EntityRoot {
  private readonly changes = new Map<string, { key: EntityKey; values: Record<string, unknown> }>();
  private readonly originalVersions = new Map<string, { key: EntityKey; version: number }>();
  private readonly newKeys = new Map<string, EntityKey>();
  private readonly deletedKeys = new Map<string, EntityKey>();

  set(key: EntityKey, field: string, value: unknown): void {
    if (!field.trim()) throw new TypeError('field is required');
    const id = identity(key);
    const entry = this.changes.get(id) ?? { key: Object.freeze({ ...key }), values: {} };
    entry.values[field] = value;
    this.changes.set(id, entry);
  }

  snapshot(): EntityChange[] {
    return [...this.changes.values()].map(entry => ({
      key: Object.freeze({ ...entry.key }),
      values: Object.freeze({ ...entry.values }),
    }));
  }

  change(key: EntityKey): Readonly<Record<string, unknown>> {
    return Object.freeze({ ...(this.changes.get(identity(key))?.values ?? {}) });
  }

  mergeFrom(other: EntityRoot): void {
    if (other === this) return;
    for (const entry of other.snapshot()) for (const [field, value] of Object.entries(entry.values)) this.set(entry.key, field, value);
    for (const key of other.newKeys.values()) this.markAsNew(key);
    for (const key of other.deletedKeys.values()) this.markAsDeleted(key);
    for (const entry of other.snapshotVersions()) this.setOriginalVersion(entry.key, entry.version);
  }

  private snapshotVersions(): Array<{ key: EntityKey; version: number }> { return [...this.originalVersions.values()]; }

  rekey(oldKey: EntityKey, newKey: EntityKey): void {
    const oldId = identity(oldKey); const newId = identity(newKey); if (oldId === newId) return;
    const entry = this.changes.get(oldId); if (entry) { this.changes.delete(oldId); for (const [field, value] of Object.entries(entry.values)) this.set(newKey, field, value); }
    const version = this.originalVersions.get(oldId); if (version !== undefined) { this.originalVersions.delete(oldId); this.originalVersions.set(newId, { key: Object.freeze({ ...newKey }), version: version.version }); }
    if (this.newKeys.delete(oldId)) this.newKeys.set(newId, Object.freeze({ ...newKey }));
    if (this.deletedKeys.delete(oldId)) this.deletedKeys.set(newId, Object.freeze({ ...newKey }));
  }

  clearEntity(key: EntityKey): void {
    const id = identity(key); this.changes.delete(id); this.newKeys.delete(id); this.deletedKeys.delete(id);
  }

  setOriginalVersion(key: EntityKey, version: number): void { this.originalVersions.set(identity(key), { key: Object.freeze({ ...key }), version }); }
  originalVersion(key: EntityKey): number | undefined { return this.originalVersions.get(identity(key))?.version; }
  markAsNew(key: EntityKey): void { this.newKeys.set(identity(key), Object.freeze({ ...key })); }
  isNew(key: EntityKey): boolean { return this.newKeys.has(identity(key)); }
  markAsDeleted(key: EntityKey): void { const id = identity(key); this.changes.delete(id); this.deletedKeys.set(id, Object.freeze({ ...key })); }
  isDeleted(key: EntityKey): boolean { return this.deletedKeys.has(identity(key)); }

  clearCommitted(): void {
    this.changes.clear();
    this.newKeys.clear();
    this.deletedKeys.clear();
  }
}
