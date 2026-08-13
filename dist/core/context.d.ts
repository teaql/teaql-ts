export declare class UserContext {
    private readonly resources;
    insertResource<T>(name: string, resource: T): this;
    getResource<T>(name: string): T | undefined;
    requireResource<T>(name: string): T;
}
//# sourceMappingURL=context.d.ts.map