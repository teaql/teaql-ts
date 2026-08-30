import { TeaQLDataService, UserContext } from '../../teaql-ts';

export class OrderLine {
        id?: string;
        customerOrder?: any;
        product?: any;
        productName?: string;
        sku?: string;
        quantity?: any;
        commercePlatform?: any;
        createTime?: string;
        version?: number;

    constructor(init?: Partial<OrderLine>) {
        Object.defineProperty(this, "_action", { value: init && init.id ? "Update" : "Create", writable: true, enumerable: false });
        Object.defineProperty(this, "_comment", { value: undefined, writable: true, enumerable: false });
        if (init) Object.assign(this, init);
    }

    static refer(id: string | number): OrderLine {
        return new OrderLine({ id: String(id) } as Partial<OrderLine>);
    }

    markForDeletion(): this {
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
            entity: "OrderLine",
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
        }
        return result;
    }

    updateId(value: string): this {
        this.id = value;
        return this;
    }

    updateProductName(value: string): this {
        this.productName = value;
        return this;
    }

    updateSku(value: string): this {
        this.sku = value;
        return this;
    }

    updateQuantity(value: any): this {
        this.quantity = value;
        return this;
    }

    updateCreateTime(value: string): this {
        this.createTime = value;
        return this;
    }

    updateVersion(value: number): this {
        this.version = value;
        return this;
    }
    updateCustomerOrder(value: any): this {
        this.customerOrder = value?.id ?? value;
        return this;
    }


    updateProduct(value: any): this {
        this.product = value?.id ?? value;
        return this;
    }


    updateCommercePlatform(value: any): this {
        this.commercePlatform = value?.id ?? value;
        return this;
    }

}