import type { UserContext } from './context';
/** A trusted host installs a validated concrete service after passive module assembly. */
export interface RuntimeCapabilityResource {
    readonly name: string;
    assertReady(context: UserContext): void;
}
export declare function installRuntimeCapability(context: UserContext, resource: RuntimeCapabilityResource): void;
export declare function requireRuntimeCapabilities(context: UserContext, required: Iterable<string>): void;
//# sourceMappingURL=runtime-capability.d.ts.map