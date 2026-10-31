import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { Tenant } from './models/Tenant';
import { PurchaseOrder } from './models/PurchaseOrder';
import { OrderItem } from './models/OrderItem';
import { CheckException, integer32Error, ExpressionPath, TeaQLNotLoadedError } from '../teaql-ts';
export { TeaQLNotLoadedError } from '../teaql-ts';

export class ValueExpression<T> {
    constructor(
        private readonly value: T | null | undefined,
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
        private readonly invalidValue?: CheckException,
    ) {}

    static missing<T>(): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false);
    }

    static notLoaded<T>(error: TeaQLNotLoadedError): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false, error);
    }

    static invalid<T>(error: CheckException): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false, undefined, error);
    }

    eval(): T | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        if (this.invalidValue) throw this.invalidValue;
        return this.present ? this.value : undefined;
    }

    isPresent(): boolean {
        if (this.notLoaded) throw this.notLoaded.terminal('isPresent()');
        if (this.invalidValue) throw this.invalidValue;
        return this.present;
    }

    orElse(fallback: T): T {
        if (this.notLoaded) throw this.notLoaded.terminal('orElse(<fallback>)');
        if (this.invalidValue) throw this.invalidValue;
        const value = this.value;
        return this.present && value != null ? value : fallback;
    }
}

export class TenantExpression {
    constructor(
        private readonly value: Tenant | null | undefined,
        private readonly root = 'Tenant(null)',
        private readonly path = ExpressionPath.root('E.tenant(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Tenant | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        return this.value;
    }

    id(): ValueExpression<string> {
        const path = this.path.member('id', 'id');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        const path = this.path.member('name', 'name');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    version(): ValueExpression<EntityVersion> {
        const path = this.path.member('version', 'version');
        if (this.notLoaded) return ValueExpression.notLoaded<EntityVersion>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<EntityVersion>();
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<EntityVersion>(
                new TeaQLNotLoadedError(path.markMissing(), 'version'),
            );
        }
        return new ValueExpression<EntityVersion>(this.value.version);
    }



    purchaseOrderList(): PurchaseOrderListExpression {
        const path = this.path.member('purchase_order_list', 'purchaseOrderList');
        if (this.notLoaded) {
            return new PurchaseOrderListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return PurchaseOrderListExpression.missing(this.root, path);
        if (!this.value.isLoaded('purchaseOrderList')) {
            return new PurchaseOrderListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'purchase_order_list'));
        }
        return new PurchaseOrderListExpression(
            this.value.purchaseOrderList(), this.root, path,
        );
    }

    orderItemList(): OrderItemListExpression {
        const path = this.path.member('order_item_list', 'orderItemList');
        if (this.notLoaded) {
            return new OrderItemListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return OrderItemListExpression.missing(this.root, path);
        if (!this.value.isLoaded('orderItemList')) {
            return new OrderItemListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'order_item_list'));
        }
        return new OrderItemListExpression(
            this.value.orderItemList(), this.root, path,
        );
    }
}

export class PurchaseOrderExpression {
    constructor(
        private readonly value: PurchaseOrder | null | undefined,
        private readonly root = 'PurchaseOrder(null)',
        private readonly path = ExpressionPath.root('E.purchaseOrder(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): PurchaseOrder | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        return this.value;
    }

    id(): ValueExpression<string> {
        const path = this.path.member('id', 'id');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    contactPhone(): ValueExpression<string> {
        const path = this.path.member('contact_phone', 'contactPhone');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('contactPhone')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'contact_phone'),
            );
        }
        return new ValueExpression<string>(this.value.contactPhone);
    }

    internalNote(): ValueExpression<string | null> {
        const path = this.path.member('internal_note', 'internalNote');
        if (this.notLoaded) return ValueExpression.notLoaded<string | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | null>();
        if (!this.value.isLoaded('internalNote')) {
            return ValueExpression.notLoaded<string | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'internal_note'),
            );
        }
        return new ValueExpression<string | null>(this.value.internalNote);
    }

    createTime(): ValueExpression<string> {
        const path = this.path.member('create_time', 'createTime');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('createTime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'create_time'),
            );
        }
        return new ValueExpression<string>(this.value.createTime);
    }

    updateTime(): ValueExpression<string> {
        const path = this.path.member('update_time', 'updateTime');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('updateTime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'update_time'),
            );
        }
        return new ValueExpression<string>(this.value.updateTime);
    }

    version(): ValueExpression<EntityVersion> {
        const path = this.path.member('version', 'version');
        if (this.notLoaded) return ValueExpression.notLoaded<EntityVersion>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<EntityVersion>();
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<EntityVersion>(
                new TeaQLNotLoadedError(path.markMissing(), 'version'),
            );
        }
        return new ValueExpression<EntityVersion>(this.value.version);
    }

    tenantId(): ValueExpression<string | number> {
        const path = this.path.member('tenant', 'tenantId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('tenant')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'tenant'),
            );
        }
        const reference = this.value.tenant;
        return new ValueExpression<string | number>(
            reference instanceof Tenant
                ? reference.id : reference as string | number | undefined,
        );
    }

    tenant(): TenantExpression {
        const path = this.path.member('tenant', 'tenant');
        if (this.notLoaded) {
            return new TenantExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new TenantExpression(undefined, this.root, path);
        if (!this.value.isLoaded('tenant')) {
            return new TenantExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'tenant'));
        }
        const relation = this.value.tenant;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Tenant)) {
            return new TenantExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'tenant'));
        }
        const target = relation instanceof Tenant ? relation : undefined;
        return new TenantExpression(target, this.root, path);
    }

    orderItemList(): OrderItemListExpression {
        const path = this.path.member('order_item_list', 'orderItemList');
        if (this.notLoaded) {
            return new OrderItemListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return OrderItemListExpression.missing(this.root, path);
        if (!this.value.isLoaded('orderItemList')) {
            return new OrderItemListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'order_item_list'));
        }
        return new OrderItemListExpression(
            this.value.orderItemList(), this.root, path,
        );
    }
}

export class OrderItemExpression {
    constructor(
        private readonly value: OrderItem | null | undefined,
        private readonly root = 'OrderItem(null)',
        private readonly path = ExpressionPath.root('E.orderItem(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): OrderItem | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        return this.value;
    }

    id(): ValueExpression<string> {
        const path = this.path.member('id', 'id');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    productName(): ValueExpression<string> {
        const path = this.path.member('product_name', 'productName');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('productName')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'product_name'),
            );
        }
        return new ValueExpression<string>(this.value.productName);
    }

    unitPrice(): ValueExpression<Decimal> {
        const path = this.path.member('unit_price', 'unitPrice');
        if (this.notLoaded) return ValueExpression.notLoaded<Decimal>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Decimal>();
        if (!this.value.isLoaded('unitPrice')) {
            return ValueExpression.notLoaded<Decimal>(
                new TeaQLNotLoadedError(path.markMissing(), 'unit_price'),
            );
        }
        return new ValueExpression<Decimal>(this.value.unitPrice);
    }

    createTime(): ValueExpression<string> {
        const path = this.path.member('create_time', 'createTime');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('createTime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'create_time'),
            );
        }
        return new ValueExpression<string>(this.value.createTime);
    }

    updateTime(): ValueExpression<string> {
        const path = this.path.member('update_time', 'updateTime');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('updateTime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'update_time'),
            );
        }
        return new ValueExpression<string>(this.value.updateTime);
    }

    version(): ValueExpression<EntityVersion> {
        const path = this.path.member('version', 'version');
        if (this.notLoaded) return ValueExpression.notLoaded<EntityVersion>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<EntityVersion>();
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<EntityVersion>(
                new TeaQLNotLoadedError(path.markMissing(), 'version'),
            );
        }
        return new ValueExpression<EntityVersion>(this.value.version);
    }

    purchaseOrderId(): ValueExpression<string | number> {
        const path = this.path.member('purchase_order', 'purchaseOrderId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('purchaseOrder')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'purchase_order'),
            );
        }
        const reference = this.value.purchaseOrder;
        return new ValueExpression<string | number>(
            reference instanceof PurchaseOrder
                ? reference.id : reference as string | number | undefined,
        );
    }

    tenantId(): ValueExpression<string | number> {
        const path = this.path.member('tenant', 'tenantId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('tenant')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'tenant'),
            );
        }
        const reference = this.value.tenant;
        return new ValueExpression<string | number>(
            reference instanceof Tenant
                ? reference.id : reference as string | number | undefined,
        );
    }

    purchaseOrder(): PurchaseOrderExpression {
        const path = this.path.member('purchase_order', 'purchaseOrder');
        if (this.notLoaded) {
            return new PurchaseOrderExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new PurchaseOrderExpression(undefined, this.root, path);
        if (!this.value.isLoaded('purchaseOrder')) {
            return new PurchaseOrderExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'purchase_order'));
        }
        const relation = this.value.purchaseOrder;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof PurchaseOrder)) {
            return new PurchaseOrderExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'purchase_order'));
        }
        const target = relation instanceof PurchaseOrder ? relation : undefined;
        return new PurchaseOrderExpression(target, this.root, path);
    }

    tenant(): TenantExpression {
        const path = this.path.member('tenant', 'tenant');
        if (this.notLoaded) {
            return new TenantExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new TenantExpression(undefined, this.root, path);
        if (!this.value.isLoaded('tenant')) {
            return new TenantExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'tenant'));
        }
        const relation = this.value.tenant;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Tenant)) {
            return new TenantExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'tenant'));
        }
        const target = relation instanceof Tenant ? relation : undefined;
        return new TenantExpression(target, this.root, path);
    }

}

export class TenantListExpression {
    constructor(
        private readonly items: readonly Tenant[],
        private readonly root = 'Tenant(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): TenantListExpression {
        return new TenantListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): TenantExpression {
        return this.item(0, true);
    }

    get(index: number): TenantExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): TenantExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new TenantExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new TenantExpression(undefined, this.root, itemPath)
            : new TenantExpression(this.items[index], this.root, itemPath);
    }
}

export class PurchaseOrderListExpression {
    constructor(
        private readonly items: readonly PurchaseOrder[],
        private readonly root = 'PurchaseOrder(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): PurchaseOrderListExpression {
        return new PurchaseOrderListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): PurchaseOrderExpression {
        return this.item(0, true);
    }

    get(index: number): PurchaseOrderExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): PurchaseOrderExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new PurchaseOrderExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new PurchaseOrderExpression(undefined, this.root, itemPath)
            : new PurchaseOrderExpression(this.items[index], this.root, itemPath);
    }
}

export class OrderItemListExpression {
    constructor(
        private readonly items: readonly OrderItem[],
        private readonly root = 'OrderItem(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): OrderItemListExpression {
        return new OrderItemListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): OrderItemExpression {
        return this.item(0, true);
    }

    get(index: number): OrderItemExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): OrderItemExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new OrderItemExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new OrderItemExpression(undefined, this.root, itemPath)
            : new OrderItemExpression(this.items[index], this.root, itemPath);
    }
}

export class E {
    static tenant(
        value: Tenant | null | undefined,
    ): TenantExpression {
        return new TenantExpression(
            value, 'Tenant', ExpressionPath.root('E.tenant(<root>)', 'camelCase'),
        );
    }

    static purchaseOrder(
        value: PurchaseOrder | null | undefined,
    ): PurchaseOrderExpression {
        return new PurchaseOrderExpression(
            value, 'PurchaseOrder', ExpressionPath.root('E.purchaseOrder(<root>)', 'camelCase'),
        );
    }

    static orderItem(
        value: OrderItem | null | undefined,
    ): OrderItemExpression {
        return new OrderItemExpression(
            value, 'OrderItem', ExpressionPath.root('E.orderItem(<root>)', 'camelCase'),
        );
    }
}