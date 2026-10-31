import {CheckException} from './checker';
import type {CheckResult} from './i18n';
import {ObjectLocation} from './object-location';

/** @internal Structural model input; no SQL/provider/Context dependency. */
export type Integer32Schema = Readonly<{
  columns: Readonly<Record<string, Readonly<{
    columnName: string; modelName?: string; logicalType: string; decode: string; integer32?: boolean;
  }>>>;
  relations?: Readonly<Record<string, Readonly<{localKey: string; many: boolean}>>>;
}>;

/** Value-free, canonical failure shared by generated native/JSON/E paths. */
export function integer32Error(value: unknown, entityType: string, field: string): CheckException | undefined {
  if (value === null || value === undefined || typeof value === 'number' && Number.isInteger(value)
    && value >= -2147483648 && value <= 2147483647) return undefined;
  return new CheckException([{ruleId: 'invalid_type', entityType, location: ObjectLocation.property(field),
    message: `Invalid field ${field}: expected an exact signed 32-bit Integer`}]);
}

/** @internal Capture trusted width metadata before custom Fix can mutate it. */
export class ModeledInteger32Layout {
  private readonly fields: ReadonlyArray<Readonly<{native: string; canonical: string; column: string}>>;
  constructor(private readonly entityType: string, schema?: Integer32Schema) {
    const fields: Array<{native: string; canonical: string; column: string}> = [];
    for (const [native, column] of Object.entries(schema?.columns ?? {})) {
      if (column.integer32 !== undefined && typeof column.integer32 !== 'boolean') throw new TypeError('INVALID_INTEGER32_METADATA');
      if (!column.integer32) continue;
      const canonical = column.modelName ?? native;
      if (column.logicalType !== 'integer' || column.decode !== 'number' || ['id','version'].includes(native)
        || ['id','version'].includes(canonical) || Object.values(schema?.relations ?? {}).some(r=>!r.many && r.localKey===native)) {
        throw new TypeError(`INVALID_INTEGER32_METADATA: ${entityType}.${canonical}`);
      }
      fields.push(Object.freeze({native,canonical,column:column.columnName}));
    }
    this.fields = Object.freeze(fields);Object.freeze(this);
  }

  /** Validates canonical mutation values without coercion or modifying intent. */
  checkMutation(payload: Readonly<Record<string, unknown>>, results: CheckResult[] = []): CheckResult[] {
    for (const field of this.fields) {
      const error = integer32Error(payload[field.canonical], this.entityType, field.canonical);
      if (error && !results.some(r=>r.ruleId==='invalid_type' && r.location.modelPath()===field.canonical)) results.push(...error.violations);
    }
    return results;
  }

  /** SQL may return an exact bigint for INTEGER; normalize before Number(...).
   * Native/text/bool coercion is deliberately not an Integer conversion. */
  read(fieldName: string, value: unknown): unknown {
    const field = this.fields.find(f=>f.native===fieldName);if (!field || value == null) return value;
    if (typeof value === 'bigint' && value >= -2147483648n && value <= 2147483647n) return Number(value);
    const error = integer32Error(value, this.entityType, field.canonical);if (error) throw error;return value;
  }
}

/** @internal Runtime modules validate all widths before any installation. */
export function validateInteger32Schemas(schemas: Readonly<Record<string,Integer32Schema>>): void {
  for (const [name,schema] of Object.entries(schemas)) new ModeledInteger32Layout(name,schema);
}
