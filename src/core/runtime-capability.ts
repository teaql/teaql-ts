import type { UserContext } from './context';

/** A trusted host installs a validated concrete service after passive module assembly. */
export interface RuntimeCapabilityResource {
  readonly name: string;
  assertReady(context: UserContext): void;
}

const slot = (name: string): string => `teaql.runtime.capability:${name}`;

export function installRuntimeCapability(context: UserContext,
                                         resource: RuntimeCapabilityResource): void {
  if (!resource || !resource.name?.trim() || typeof resource.assertReady !== 'function') {
    throw new TypeError('Invalid runtime capability resource');
  }
  if (context.getResource(slot(resource.name))) throw new Error('Duplicate runtime capability');
  context.insertResource(slot(resource.name), resource);
}

export function requireRuntimeCapabilities(context: UserContext,
                                           required: Iterable<string>): void {
  for (const name of required) {
    const resource = context.getResource<RuntimeCapabilityResource>(slot(name));
    if (!resource || resource.name !== name) {
      throw new Error(name === 'blob.v1' ? 'BLOB_CAPABILITY_MISSING'
        : name === 'secure_document.v1' ? 'DOCUMENT_CONFIGURATION' : 'RUNTIME_CAPABILITY_MISSING');
    }
    resource.assertReady(context);
  }
}
