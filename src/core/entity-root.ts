export type EntityId = string | number | bigint;

export type EntityKey = Readonly<{ entity: string; id: EntityId }>;
export type EntityChange = Readonly<{ key: EntityKey; values: Readonly<Record<string, unknown>> }>;

const identity = (key: EntityKey): string => `${key.entity}\u0000${typeof key.id}:${String(key.id)}`;

/** Pending mutation ledger shared by one generated object graph. */
export class EntityRoot {
  private readonly changes = new Map<string, { key: EntityKey; values: Record<string, unknown> }>();
  private readonly originalVersions = new Map<string, number>();
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

  setOriginalVersion(key: EntityKey, version: number): void { this.originalVersions.set(identity(key), version); }
  originalVersion(key: EntityKey): number | undefined { return this.originalVersions.get(identity(key)); }
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
