import { CheckException } from './checker';
import type { CheckResult } from './i18n';
/** @internal Structural model input; no SQL/provider/Context dependency. */
export type Integer32Schema = Readonly<{
    columns: Readonly<Record<string, Readonly<{
        columnName: string;
        modelName?: string;
        logicalType: string;
        decode: string;
        integer32?: boolean;
    }>>>;
    relations?: Readonly<Record<string, Readonly<{
        localKey: string;
        many: boolean;
    }>>>;
}>;
/** Value-free, canonical failure shared by generated native/JSON/E paths. */
export declare function integer32Error(value: unknown, entityType: string, field: string): CheckException | undefined;
/** @internal Capture trusted width metadata before custom Fix can mutate it. */
export declare class ModeledInteger32Layout {
    private readonly entityType;
    private readonly fields;
    constructor(entityType: string, schema?: Integer32Schema);
    /** Validates canonical mutation values without coercion or modifying intent. */
    checkMutation(payload: Readonly<Record<string, unknown>>, results?: CheckResult[]): CheckResult[];
    /** SQL may return an exact bigint for INTEGER; normalize before Number(...).
     * Native/text/bool coercion is deliberately not an Integer conversion. */
    read(fieldName: string, value: unknown): unknown;
}
/** @internal Runtime modules validate all widths before any installation. */
export declare function validateInteger32Schemas(schemas: Readonly<Record<string, Integer32Schema>>): void;
//# sourceMappingURL=modeled-integer32.d.ts.map