import { Platform } from './models/Platform';
import { OrderStatus } from './models/OrderStatus';
import { Customer } from './models/Customer';
import { CustomerOrder } from './models/CustomerOrder';
import { OrderItem } from './models/OrderItem';

export class TeaQLNotLoadedError extends Error {
    readonly details: Record<string, unknown>;

    constructor(
        readonly root: string,
        readonly accessPath: string,
        readonly breakPoint: string,
    ) {
        const suggestedFix = `select${breakPoint.charAt(0).toUpperCase()}${breakPoint.slice(1)}(...)`;
        const details = {
            error: 'TeaQLNotLoadedError',
            root,
            accessPath: accessPath.split('.'),
            breakPoint,
            missingPreload: [breakPoint],
            suggestedFix,
            severity: 'error',
            humanMessage: `访问 ${root}.${accessPath} 时缺少预加载。请在查询中加入 ${suggestedFix}`,
        };
        super(JSON.stringify(details));
        this.name = 'TeaQLNotLoadedError';
        this.details = details;
    }
}

function expressionPath(prefix: string, field: string): string {
    return prefix ? `${prefix}.${field}` : field;
}

export class ValueExpression<T> {
    constructor(
        private readonly value: T | null | undefined,
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing<T>(): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false);
    }

    static notLoaded<T>(error: TeaQLNotLoadedError): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false, error);
    }

    eval(): T | null | undefined {
        if (this.notLoaded) throw this.notLoaded;
        return this.present ? this.value : undefined;
    }

    isPresent(): boolean {
        if (this.notLoaded) throw this.notLoaded;
        return this.present;
    }

    orElse(fallback: T): T {
        const value = this.eval();
        return this.present && value != null ? value : fallback;
    }
}

export class PlatformExpression {
    constructor(
        private readonly value: Platform | null | undefined,
        private readonly root = 'Platform(null)',
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Platform | null | undefined {
        if (this.notLoaded) throw this.notLoaded;
        return this.value;
    }

    id(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'name');
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    version(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'version'),
            );
        }
        return new ValueExpression<number>(this.value.version);
    }



    orderStatusList(): OrderStatusListExpression {
        const path = expressionPath(this.path, 'orderStatusList');
        if (this.notLoaded) {
            return new OrderStatusListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return OrderStatusListExpression.missing(this.root, path);
        if (!this.value.isLoaded('orderStatusList')) {
            return new OrderStatusListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'orderStatusList'));
        }
        return new OrderStatusListExpression(
            this.value.orderStatusList(), this.root, path,
        );
    }

    customerList(): CustomerListExpression {
        const path = expressionPath(this.path, 'customerList');
        if (this.notLoaded) {
            return new CustomerListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return CustomerListExpression.missing(this.root, path);
        if (!this.value.isLoaded('customerList')) {
            return new CustomerListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'customerList'));
        }
        return new CustomerListExpression(
            this.value.customerList(), this.root, path,
        );
    }
}

export class OrderStatusExpression {
    constructor(
        private readonly value: OrderStatus | null | undefined,
        private readonly root = 'OrderStatus(null)',
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): OrderStatus | null | undefined {
        if (this.notLoaded) throw this.notLoaded;
        return this.value;
    }

    id(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'name');
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    code(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'code');
        if (!this.value.isLoaded('code')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'code'),
            );
        }
        return new ValueExpression<string>(this.value.code);
    }

    color(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'color');
        if (!this.value.isLoaded('color')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'color'),
            );
        }
        return new ValueExpression<string>(this.value.color);
    }

    displayOrder(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'displayOrder');
        if (!this.value.isLoaded('displayOrder')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'displayOrder'),
            );
        }
        return new ValueExpression<number>(this.value.displayOrder);
    }

    version(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'version'),
            );
        }
        return new ValueExpression<number>(this.value.version);
    }

    platformId(): ValueExpression<string | number> {
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string | number>();
        const path = expressionPath(this.path, 'platform');
        if (!this.value.isLoaded('platform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(this.root, path, 'platform'),
            );
        }
        const reference = this.value.platform;
        return new ValueExpression<string | number>(
            reference instanceof Platform
                ? reference.id : reference as string | number | undefined,
        );
    }

    platform(): PlatformExpression {
        const path = expressionPath(this.path, 'platform');
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value) return new PlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('platform')) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(this.root, path, 'platform'));
        }
        const relation = this.value.platform;
        const target = relation == null
            ? undefined
            : relation instanceof Platform
                ? relation
                : Platform.fromRecord({ id: relation });
        return new PlatformExpression(target, this.root, path);
    }

    customerOrderList(): CustomerOrderListExpression {
        const path = expressionPath(this.path, 'customerOrderList');
        if (this.notLoaded) {
            return new CustomerOrderListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return CustomerOrderListExpression.missing(this.root, path);
        if (!this.value.isLoaded('customerOrderList')) {
            return new CustomerOrderListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'customerOrderList'));
        }
        return new CustomerOrderListExpression(
            this.value.customerOrderList(), this.root, path,
        );
    }
}

export class CustomerExpression {
    constructor(
        private readonly value: Customer | null | undefined,
        private readonly root = 'Customer(null)',
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Customer | null | undefined {
        if (this.notLoaded) throw this.notLoaded;
        return this.value;
    }

    id(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'name');
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    version(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'version'),
            );
        }
        return new ValueExpression<number>(this.value.version);
    }

    platformId(): ValueExpression<string | number> {
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string | number>();
        const path = expressionPath(this.path, 'platform');
        if (!this.value.isLoaded('platform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(this.root, path, 'platform'),
            );
        }
        const reference = this.value.platform;
        return new ValueExpression<string | number>(
            reference instanceof Platform
                ? reference.id : reference as string | number | undefined,
        );
    }

    platform(): PlatformExpression {
        const path = expressionPath(this.path, 'platform');
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value) return new PlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('platform')) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(this.root, path, 'platform'));
        }
        const relation = this.value.platform;
        const target = relation == null
            ? undefined
            : relation instanceof Platform
                ? relation
                : Platform.fromRecord({ id: relation });
        return new PlatformExpression(target, this.root, path);
    }

    customerOrderList(): CustomerOrderListExpression {
        const path = expressionPath(this.path, 'customerOrderList');
        if (this.notLoaded) {
            return new CustomerOrderListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return CustomerOrderListExpression.missing(this.root, path);
        if (!this.value.isLoaded('customerOrderList')) {
            return new CustomerOrderListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'customerOrderList'));
        }
        return new CustomerOrderListExpression(
            this.value.customerOrderList(), this.root, path,
        );
    }
}

export class CustomerOrderExpression {
    constructor(
        private readonly value: CustomerOrder | null | undefined,
        private readonly root = 'CustomerOrder(null)',
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): CustomerOrder | null | undefined {
        if (this.notLoaded) throw this.notLoaded;
        return this.value;
    }

    id(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    orderNumber(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'orderNumber');
        if (!this.value.isLoaded('orderNumber')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'orderNumber'),
            );
        }
        return new ValueExpression<string>(this.value.orderNumber);
    }

    orderDate(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'orderDate');
        if (!this.value.isLoaded('orderDate')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'orderDate'),
            );
        }
        return new ValueExpression<string>(this.value.orderDate);
    }

    totalAmount(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'totalAmount');
        if (!this.value.isLoaded('totalAmount')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'totalAmount'),
            );
        }
        return new ValueExpression<number>(this.value.totalAmount);
    }

    version(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'version'),
            );
        }
        return new ValueExpression<number>(this.value.version);
    }

    customerId(): ValueExpression<string | number> {
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string | number>();
        const path = expressionPath(this.path, 'customer');
        if (!this.value.isLoaded('customer')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(this.root, path, 'customer'),
            );
        }
        const reference = this.value.customer;
        return new ValueExpression<string | number>(
            reference instanceof Customer
                ? reference.id : reference as string | number | undefined,
        );
    }

    statusId(): ValueExpression<string | number> {
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string | number>();
        const path = expressionPath(this.path, 'status');
        if (!this.value.isLoaded('status')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(this.root, path, 'status'),
            );
        }
        const reference = this.value.status;
        return new ValueExpression<string | number>(
            reference instanceof OrderStatus
                ? reference.id : reference as string | number | undefined,
        );
    }

    customer(): CustomerExpression {
        const path = expressionPath(this.path, 'customer');
        if (this.notLoaded) {
            return new CustomerExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value) return new CustomerExpression(undefined, this.root, path);
        if (!this.value.isLoaded('customer')) {
            return new CustomerExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(this.root, path, 'customer'));
        }
        const relation = this.value.customer;
        const target = relation == null
            ? undefined
            : relation instanceof Customer
                ? relation
                : Customer.fromRecord({ id: relation });
        return new CustomerExpression(target, this.root, path);
    }

    status(): OrderStatusExpression {
        const path = expressionPath(this.path, 'status');
        if (this.notLoaded) {
            return new OrderStatusExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value) return new OrderStatusExpression(undefined, this.root, path);
        if (!this.value.isLoaded('status')) {
            return new OrderStatusExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(this.root, path, 'status'));
        }
        const relation = this.value.status;
        const target = relation == null
            ? undefined
            : relation instanceof OrderStatus
                ? relation
                : OrderStatus.fromRecord({ id: relation });
        return new OrderStatusExpression(target, this.root, path);
    }

    orderItemList(): OrderItemListExpression {
        const path = expressionPath(this.path, 'orderItemList');
        if (this.notLoaded) {
            return new OrderItemListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return OrderItemListExpression.missing(this.root, path);
        if (!this.value.isLoaded('orderItemList')) {
            return new OrderItemListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'orderItemList'));
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
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): OrderItem | null | undefined {
        if (this.notLoaded) throw this.notLoaded;
        return this.value;
    }

    id(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    productName(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'productName');
        if (!this.value.isLoaded('productName')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'productName'),
            );
        }
        return new ValueExpression<string>(this.value.productName);
    }

    quantity(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'quantity');
        if (!this.value.isLoaded('quantity')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'quantity'),
            );
        }
        return new ValueExpression<number>(this.value.quantity);
    }

    unitPrice(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'unitPrice');
        if (!this.value.isLoaded('unitPrice')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'unitPrice'),
            );
        }
        return new ValueExpression<number>(this.value.unitPrice);
    }

    version(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'version'),
            );
        }
        return new ValueExpression<number>(this.value.version);
    }

    customerOrderId(): ValueExpression<string | number> {
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string | number>();
        const path = expressionPath(this.path, 'customerOrder');
        if (!this.value.isLoaded('customerOrder')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(this.root, path, 'customerOrder'),
            );
        }
        const reference = this.value.customerOrder;
        return new ValueExpression<string | number>(
            reference instanceof CustomerOrder
                ? reference.id : reference as string | number | undefined,
        );
    }

    customerOrder(): CustomerOrderExpression {
        const path = expressionPath(this.path, 'customerOrder');
        if (this.notLoaded) {
            return new CustomerOrderExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value) return new CustomerOrderExpression(undefined, this.root, path);
        if (!this.value.isLoaded('customerOrder')) {
            return new CustomerOrderExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(this.root, path, 'customerOrder'));
        }
        const relation = this.value.customerOrder;
        const target = relation == null
            ? undefined
            : relation instanceof CustomerOrder
                ? relation
                : CustomerOrder.fromRecord({ id: relation });
        return new CustomerOrderExpression(target, this.root, path);
    }

}

export class PlatformListExpression {
    constructor(
        private readonly items: readonly Platform[],
        private readonly root = 'Platform(null)',
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): PlatformListExpression {
        return new PlatformListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): PlatformExpression {
        return this.get(0);
    }

    get(index: number): PlatformExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new PlatformExpression(undefined, this.root, itemPath)
            : new PlatformExpression(this.items[index], this.root, itemPath);
    }
}

export class OrderStatusListExpression {
    constructor(
        private readonly items: readonly OrderStatus[],
        private readonly root = 'OrderStatus(null)',
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): OrderStatusListExpression {
        return new OrderStatusListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): OrderStatusExpression {
        return this.get(0);
    }

    get(index: number): OrderStatusExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new OrderStatusExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new OrderStatusExpression(undefined, this.root, itemPath)
            : new OrderStatusExpression(this.items[index], this.root, itemPath);
    }
}

export class CustomerListExpression {
    constructor(
        private readonly items: readonly Customer[],
        private readonly root = 'Customer(null)',
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): CustomerListExpression {
        return new CustomerListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): CustomerExpression {
        return this.get(0);
    }

    get(index: number): CustomerExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new CustomerExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new CustomerExpression(undefined, this.root, itemPath)
            : new CustomerExpression(this.items[index], this.root, itemPath);
    }
}

export class CustomerOrderListExpression {
    constructor(
        private readonly items: readonly CustomerOrder[],
        private readonly root = 'CustomerOrder(null)',
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): CustomerOrderListExpression {
        return new CustomerOrderListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): CustomerOrderExpression {
        return this.get(0);
    }

    get(index: number): CustomerOrderExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new CustomerOrderExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new CustomerOrderExpression(undefined, this.root, itemPath)
            : new CustomerOrderExpression(this.items[index], this.root, itemPath);
    }
}

export class OrderItemListExpression {
    constructor(
        private readonly items: readonly OrderItem[],
        private readonly root = 'OrderItem(null)',
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): OrderItemListExpression {
        return new OrderItemListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): OrderItemExpression {
        return this.get(0);
    }

    get(index: number): OrderItemExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new OrderItemExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new OrderItemExpression(undefined, this.root, itemPath)
            : new OrderItemExpression(this.items[index], this.root, itemPath);
    }
}

export class E {
    static platform(
        value: Platform | null | undefined,
    ): PlatformExpression {
        return new PlatformExpression(
            value, `Platform(id=${value?.id ?? 'null'})`,
        );
    }

    static orderStatus(
        value: OrderStatus | null | undefined,
    ): OrderStatusExpression {
        return new OrderStatusExpression(
            value, `OrderStatus(id=${value?.id ?? 'null'})`,
        );
    }

    static customer(
        value: Customer | null | undefined,
    ): CustomerExpression {
        return new CustomerExpression(
            value, `Customer(id=${value?.id ?? 'null'})`,
        );
    }

    static customerOrder(
        value: CustomerOrder | null | undefined,
    ): CustomerOrderExpression {
        return new CustomerOrderExpression(
            value, `CustomerOrder(id=${value?.id ?? 'null'})`,
        );
    }

    static orderItem(
        value: OrderItem | null | undefined,
    ): OrderItemExpression {
        return new OrderItemExpression(
            value, `OrderItem(id=${value?.id ?? 'null'})`,
        );
    }
}