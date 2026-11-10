import { CheckException } from './checker';
import { EntityKey, EntityRoot } from './entity-root';
import type { MutationRequest } from './request-intent';
export declare class PreparedMutationError extends CheckException {
    readonly code = "MUTATION_CHANGED_AFTER_PREPARATION";
    constructor(field?: string);
}
type References = Readonly<Record<string, string>>;
/** Invocation-owned detached state. Never a Context ledger or a wire payload. */
export declare class PreparedGraphState {
    private sources;
    private objects;
    private tokens;
    private entries;
    private aliases;
    private bindings;
    private metadata;
    sealed: boolean;
    get rootEntity(): string | undefined;
    get size(): number;
    register(object: object, root: EntityRoot, key: EntityKey, references: References, read: () => Record<string, unknown>): void;
    members(objects: readonly object[]): readonly symbol[];
    bind(read: () => unknown): void;
    bindMetadata(read: () => Record<string, unknown>): void;
    captureInput(): void;
    private resolved;
    private canonical;
    private materialize;
    private difference;
    private rootState;
    private assertRoot;
    private assertNative;
    remember(request: MutationRequest<any>, mutation: any, references: References): any;
    seal(): void;
    validate(): void;
    private entry;
    replay(request: MutationRequest<any>): any | undefined;
    providerResult(request: MutationRequest<any>, result: any): void;
    applied(root: EntityRoot, oldKey: EntityKey, newKey: EntityKey): void;
    committed(root: EntityRoot, key: EntityKey): void;
    complete(): void;
}
export {};
//# sourceMappingURL=prepared-mutation.d.ts.map