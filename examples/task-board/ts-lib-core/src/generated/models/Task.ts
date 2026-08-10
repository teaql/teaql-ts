export class Task {
        id?: any;
        name?: string;
        status?: any;
        platform?: any;
        version?: any;

    constructor(init?: Partial<Task>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        if (init) Object.assign(this, init);
    }

    markAsDeleted(): this {
        (this as any)._action = "Delete";
        return this;
    }

    auditAs(comment: string): this {
        (this as any)._comment = comment;
        return this;
    }

    async save(ctx: any): Promise<any> {
        const mutation = {
            entity: "Task",
            action: (this as any)._action,
            payload: this,
            id: this.id,
            comment: (this as any)._comment
        };
        return ctx.client.executeMutation(mutation);
    }
}