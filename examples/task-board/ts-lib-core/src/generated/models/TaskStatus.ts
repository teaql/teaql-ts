export class TaskStatus {
        id?: any;
        name?: string;
        code?: string;
        color?: string;
        displayOrder?: number;
        progress?: number;
        platform?: any;
        version?: any;

    constructor(init?: Partial<TaskStatus>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        if (init) Object.assign(this, init);
    }

    markForDeletion(): this {
        (this as any)._action = "Delete";
        return this;
    }

    auditAs(comment: string): this {
        (this as any)._comment = comment;
        return this;
    }

    async save(ctx: any): Promise<any> {
        const mutation = {
            entity: "TaskStatus",
            action: (this as any)._action,
            payload: this,
            id: this.id,
            comment: (this as any)._comment
        };
        return ctx.client.executeMutation(mutation);
    }
}