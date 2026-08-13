import { TeaQLDataService, UserContext } from '../../teaql-ts';

export class OrderStatus {
        id?: string;
        name?: string;
        code?: string;
        color?: string;
        displayOrder?: number;
        commercePlatform?: any;
        version?: number;

    constructor(init?: Partial<OrderStatus>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        Object.defineProperty(this, "_customerOrderList", { value: [], writable: true, enumerable: false });
        if (init) Object.assign(this, init);
    }

    static refer(id: string | number): OrderStatus {
        return new OrderStatus({ id: String(id) } as Partial<OrderStatus>);
    }

    markAsDeleted(): this {
        (this as any)._action = "Delete";
        return this;
    }

    auditAs(comment: string): this {
        (this as any)._comment = comment;
        return this;
    }

    async save(ctx: UserContext): Promise<any> {
        if (!(this as any)._comment) {
            throw new Error("Security audit failure: auditAs() must be called before save()");
        }
        const mutation = {
            entity: "OrderStatus",
            action: (this as any)._action,
            payload: this,
            id: (this as any).id,
            version: (this as any).version,
            comment: (this as any)._comment
        };
        const service = ctx.requireResource<TeaQLDataService>("dataService");
        const result = await service.executeMutation(mutation);
        if ((this as any)._action === "Create") {
            (this as any).id = result.id;
            (this as any)._action = "Update";
        }
        if (result.version !== undefined) (this as any).version = result.version;
        if (mutation.action !== "Delete") {
            for (const child of (this as any)._customerOrderList) {
                child.updateStatus(this);
                child.auditAs((this as any)._comment);
                await child.save(ctx);
            }
        }
        return result;
    }

    updateId(value: string): this {
        this.id = value;
        return this;
    }

    updateName(value: string): this {
        this.name = value;
        return this;
    }

    updateCode(value: string): this {
        this.code = value;
        return this;
    }

    updateColor(value: string): this {
        this.color = value;
        return this;
    }

    updateDisplayOrder(value: number): this {
        this.displayOrder = value;
        return this;
    }

    updateVersion(value: number): this {
        this.version = value;
        return this;
    }
    updateCommercePlatform(value: any): this {
        this.commercePlatform = value?.id ?? value;
        return this;
    }

    customerOrderList(): any[] {
        return (this as any)._customerOrderList;
    }
}