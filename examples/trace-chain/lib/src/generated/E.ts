import { Platform } from './models/Platform';
import { CustomerOrder } from './models/CustomerOrder';
import { OrderItem } from './models/OrderItem';
import { Payment } from './models/Payment';
import { PaymentAttempt } from './models/PaymentAttempt';
import { Shipment } from './models/Shipment';

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

    description(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'description');
        if (!this.value.isLoaded('description')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'description'),
            );
        }
        return new ValueExpression<string>(this.value.description);
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
        const relation = this.value.platform;
        return new ValueExpression<string | number>(
            relation != null && typeof relation === 'object' ? relation.id : relation,
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

    paymentList(): PaymentListExpression {
        const path = expressionPath(this.path, 'paymentList');
        if (this.notLoaded) {
            return new PaymentListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return PaymentListExpression.missing(this.root, path);
        if (!this.value.isLoaded('paymentList')) {
            return new PaymentListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'paymentList'));
        }
        return new PaymentListExpression(
            this.value.paymentList(), this.root, path,
        );
    }

    shipmentList(): ShipmentListExpression {
        const path = expressionPath(this.path, 'shipmentList');
        if (this.notLoaded) {
            return new ShipmentListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return ShipmentListExpression.missing(this.root, path);
        if (!this.value.isLoaded('shipmentList')) {
            return new ShipmentListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'shipmentList'));
        }
        return new ShipmentListExpression(
            this.value.shipmentList(), this.root, path,
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

    customerOrderId(): ValueExpression<string | number> {
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string | number>();
        const path = expressionPath(this.path, 'customerOrder');
        if (!this.value.isLoaded('customerOrder')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(this.root, path, 'customerOrder'),
            );
        }
        const relation = this.value.customerOrder;
        return new ValueExpression<string | number>(
            relation != null && typeof relation === 'object' ? relation.id : relation,
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

export class PaymentExpression {
    constructor(
        private readonly value: Payment | null | undefined,
        private readonly root = 'Payment(null)',
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Payment | null | undefined {
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

    referenceCode(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'referenceCode');
        if (!this.value.isLoaded('referenceCode')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'referenceCode'),
            );
        }
        return new ValueExpression<string>(this.value.referenceCode);
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
        const relation = this.value.customerOrder;
        return new ValueExpression<string | number>(
            relation != null && typeof relation === 'object' ? relation.id : relation,
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

    paymentAttemptList(): PaymentAttemptListExpression {
        const path = expressionPath(this.path, 'paymentAttemptList');
        if (this.notLoaded) {
            return new PaymentAttemptListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return PaymentAttemptListExpression.missing(this.root, path);
        if (!this.value.isLoaded('paymentAttemptList')) {
            return new PaymentAttemptListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'paymentAttemptList'));
        }
        return new PaymentAttemptListExpression(
            this.value.paymentAttemptList(), this.root, path,
        );
    }
}

export class PaymentAttemptExpression {
    constructor(
        private readonly value: PaymentAttempt | null | undefined,
        private readonly root = 'PaymentAttempt(null)',
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): PaymentAttempt | null | undefined {
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

    referenceCode(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'referenceCode');
        if (!this.value.isLoaded('referenceCode')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'referenceCode'),
            );
        }
        return new ValueExpression<string>(this.value.referenceCode);
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

    paymentId(): ValueExpression<string | number> {
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string | number>();
        const path = expressionPath(this.path, 'payment');
        if (!this.value.isLoaded('payment')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(this.root, path, 'payment'),
            );
        }
        const relation = this.value.payment;
        return new ValueExpression<string | number>(
            relation != null && typeof relation === 'object' ? relation.id : relation,
        );
    }

    payment(): PaymentExpression {
        const path = expressionPath(this.path, 'payment');
        if (this.notLoaded) {
            return new PaymentExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value) return new PaymentExpression(undefined, this.root, path);
        if (!this.value.isLoaded('payment')) {
            return new PaymentExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(this.root, path, 'payment'));
        }
        const relation = this.value.payment;
        const target = relation == null
            ? undefined
            : relation instanceof Payment
                ? relation
                : Payment.fromRecord({ id: relation });
        return new PaymentExpression(target, this.root, path);
    }

}

export class ShipmentExpression {
    constructor(
        private readonly value: Shipment | null | undefined,
        private readonly root = 'Shipment(null)',
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Shipment | null | undefined {
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

    referenceCode(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'referenceCode');
        if (!this.value.isLoaded('referenceCode')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'referenceCode'),
            );
        }
        return new ValueExpression<string>(this.value.referenceCode);
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
        const relation = this.value.customerOrder;
        return new ValueExpression<string | number>(
            relation != null && typeof relation === 'object' ? relation.id : relation,
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

export class PaymentListExpression {
    constructor(
        private readonly items: readonly Payment[],
        private readonly root = 'Payment(null)',
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): PaymentListExpression {
        return new PaymentListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): PaymentExpression {
        return this.get(0);
    }

    get(index: number): PaymentExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new PaymentExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new PaymentExpression(undefined, this.root, itemPath)
            : new PaymentExpression(this.items[index], this.root, itemPath);
    }
}

export class PaymentAttemptListExpression {
    constructor(
        private readonly items: readonly PaymentAttempt[],
        private readonly root = 'PaymentAttempt(null)',
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): PaymentAttemptListExpression {
        return new PaymentAttemptListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): PaymentAttemptExpression {
        return this.get(0);
    }

    get(index: number): PaymentAttemptExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new PaymentAttemptExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new PaymentAttemptExpression(undefined, this.root, itemPath)
            : new PaymentAttemptExpression(this.items[index], this.root, itemPath);
    }
}

export class ShipmentListExpression {
    constructor(
        private readonly items: readonly Shipment[],
        private readonly root = 'Shipment(null)',
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): ShipmentListExpression {
        return new ShipmentListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): ShipmentExpression {
        return this.get(0);
    }

    get(index: number): ShipmentExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new ShipmentExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new ShipmentExpression(undefined, this.root, itemPath)
            : new ShipmentExpression(this.items[index], this.root, itemPath);
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

    static payment(
        value: Payment | null | undefined,
    ): PaymentExpression {
        return new PaymentExpression(
            value, `Payment(id=${value?.id ?? 'null'})`,
        );
    }

    static paymentAttempt(
        value: PaymentAttempt | null | undefined,
    ): PaymentAttemptExpression {
        return new PaymentAttemptExpression(
            value, `PaymentAttempt(id=${value?.id ?? 'null'})`,
        );
    }

    static shipment(
        value: Shipment | null | undefined,
    ): ShipmentExpression {
        return new ShipmentExpression(
            value, `Shipment(id=${value?.id ?? 'null'})`,
        );
    }
}