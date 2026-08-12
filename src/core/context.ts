export class UserContext {
  private readonly resources = new Map<string, unknown>();

  insertResource<T>(name: string, resource: T): this {
    this.resources.set(name, resource);
    return this;
  }

  getResource<T>(name: string): T | undefined {
    return this.resources.get(name) as T | undefined;
  }

  requireResource<T>(name: string): T {
    const resource = this.getResource<T>(name);
    if (resource === undefined) {
      throw new Error(`Required UserContext resource is missing: ${name}`);
    }
    return resource;
  }
}
