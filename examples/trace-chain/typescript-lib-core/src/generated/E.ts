import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { Platform } from './models/Platform';
import { CustomerOrder } from './models/CustomerOrder';
import { OrderItem } from './models/OrderItem';
import { Payment } from './models/Payment';
import { PaymentAttempt } from './models/PaymentAttempt';
import { Shipment } from './models/Shipment';
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

export class PlatformExpression {
    constructor(
        private readonly value: Platform | null | undefined,
        private readonly root = 'Platform(null)',
        private readonly path = ExpressionPath.root('E.platform(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Platform | null | undefined {
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



    customerOrderList(): CustomerOrderListExpression {
        const path = this.path.member('customer_order_list', 'customerOrderList');
        if (this.notLoaded) {
            return new CustomerOrderListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return CustomerOrderListExpression.missing(this.root, path);
        if (!this.value.isLoaded('customerOrderList')) {
            return new CustomerOrderListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'customer_order_list'));
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
        private readonly path = ExpressionPath.root('E.customerOrder(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): CustomerOrder | null | undefined {
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

    orderNumber(): ValueExpression<string> {
        const path = this.path.member('order_number', 'orderNumber');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('orderNumber')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'order_number'),
            );
        }
        return new ValueExpression<string>(this.value.orderNumber);
    }

    description(): ValueExpression<string> {
        const path = this.path.member('description', 'description');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('description')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'description'),
            );
        }
        return new ValueExpression<string>(this.value.description);
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

    platformId(): ValueExpression<string | number> {
        const path = this.path.member('platform', 'platformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('platform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'platform'),
            );
        }
        const reference = this.value.platform;
        return new ValueExpression<string | number>(
            reference instanceof Platform
                ? reference.id : reference as string | number | undefined,
        );
    }

    platform(): PlatformExpression {
        const path = this.path.member('platform', 'platform');
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new PlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('platform')) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'platform'));
        }
        const relation = this.value.platform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Platform)) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'platform'));
        }
        const target = relation instanceof Platform ? relation : undefined;
        return new PlatformExpression(target, this.root, path);
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

    paymentList(): PaymentListExpression {
        const path = this.path.member('payment_list', 'paymentList');
        if (this.notLoaded) {
            return new PaymentListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return PaymentListExpression.missing(this.root, path);
        if (!this.value.isLoaded('paymentList')) {
            return new PaymentListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'payment_list'));
        }
        return new PaymentListExpression(
            this.value.paymentList(), this.root, path,
        );
    }

    shipmentList(): ShipmentListExpression {
        const path = this.path.member('shipment_list', 'shipmentList');
        if (this.notLoaded) {
            return new ShipmentListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return ShipmentListExpression.missing(this.root, path);
        if (!this.value.isLoaded('shipmentList')) {
            return new ShipmentListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'shipment_list'));
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

    customerOrderId(): ValueExpression<string | number> {
        const path = this.path.member('customer_order', 'customerOrderId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('customerOrder')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'customer_order'),
            );
        }
        const reference = this.value.customerOrder;
        return new ValueExpression<string | number>(
            reference instanceof CustomerOrder
                ? reference.id : reference as string | number | undefined,
        );
    }

    customerOrder(): CustomerOrderExpression {
        const path = this.path.member('customer_order', 'customerOrder');
        if (this.notLoaded) {
            return new CustomerOrderExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CustomerOrderExpression(undefined, this.root, path);
        if (!this.value.isLoaded('customerOrder')) {
            return new CustomerOrderExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'customer_order'));
        }
        const relation = this.value.customerOrder;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof CustomerOrder)) {
            return new CustomerOrderExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'customer_order'));
        }
        const target = relation instanceof CustomerOrder ? relation : undefined;
        return new CustomerOrderExpression(target, this.root, path);
    }

}

export class PaymentExpression {
    constructor(
        private readonly value: Payment | null | undefined,
        private readonly root = 'Payment(null)',
        private readonly path = ExpressionPath.root('E.payment(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Payment | null | undefined {
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

    referenceCode(): ValueExpression<string> {
        const path = this.path.member('reference_code', 'referenceCode');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('referenceCode')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'reference_code'),
            );
        }
        return new ValueExpression<string>(this.value.referenceCode);
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

    customerOrderId(): ValueExpression<string | number> {
        const path = this.path.member('customer_order', 'customerOrderId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('customerOrder')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'customer_order'),
            );
        }
        const reference = this.value.customerOrder;
        return new ValueExpression<string | number>(
            reference instanceof CustomerOrder
                ? reference.id : reference as string | number | undefined,
        );
    }

    customerOrder(): CustomerOrderExpression {
        const path = this.path.member('customer_order', 'customerOrder');
        if (this.notLoaded) {
            return new CustomerOrderExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CustomerOrderExpression(undefined, this.root, path);
        if (!this.value.isLoaded('customerOrder')) {
            return new CustomerOrderExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'customer_order'));
        }
        const relation = this.value.customerOrder;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof CustomerOrder)) {
            return new CustomerOrderExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'customer_order'));
        }
        const target = relation instanceof CustomerOrder ? relation : undefined;
        return new CustomerOrderExpression(target, this.root, path);
    }

    paymentAttemptList(): PaymentAttemptListExpression {
        const path = this.path.member('payment_attempt_list', 'paymentAttemptList');
        if (this.notLoaded) {
            return new PaymentAttemptListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return PaymentAttemptListExpression.missing(this.root, path);
        if (!this.value.isLoaded('paymentAttemptList')) {
            return new PaymentAttemptListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'payment_attempt_list'));
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
        private readonly path = ExpressionPath.root('E.paymentAttempt(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): PaymentAttempt | null | undefined {
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

    referenceCode(): ValueExpression<string> {
        const path = this.path.member('reference_code', 'referenceCode');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('referenceCode')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'reference_code'),
            );
        }
        return new ValueExpression<string>(this.value.referenceCode);
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

    paymentId(): ValueExpression<string | number> {
        const path = this.path.member('payment', 'paymentId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('payment')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'payment'),
            );
        }
        const reference = this.value.payment;
        return new ValueExpression<string | number>(
            reference instanceof Payment
                ? reference.id : reference as string | number | undefined,
        );
    }

    payment(): PaymentExpression {
        const path = this.path.member('payment', 'payment');
        if (this.notLoaded) {
            return new PaymentExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new PaymentExpression(undefined, this.root, path);
        if (!this.value.isLoaded('payment')) {
            return new PaymentExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'payment'));
        }
        const relation = this.value.payment;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Payment)) {
            return new PaymentExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'payment'));
        }
        const target = relation instanceof Payment ? relation : undefined;
        return new PaymentExpression(target, this.root, path);
    }

}

export class ShipmentExpression {
    constructor(
        private readonly value: Shipment | null | undefined,
        private readonly root = 'Shipment(null)',
        private readonly path = ExpressionPath.root('E.shipment(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Shipment | null | undefined {
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

    referenceCode(): ValueExpression<string> {
        const path = this.path.member('reference_code', 'referenceCode');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('referenceCode')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'reference_code'),
            );
        }
        return new ValueExpression<string>(this.value.referenceCode);
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

    customerOrderId(): ValueExpression<string | number> {
        const path = this.path.member('customer_order', 'customerOrderId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('customerOrder')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'customer_order'),
            );
        }
        const reference = this.value.customerOrder;
        return new ValueExpression<string | number>(
            reference instanceof CustomerOrder
                ? reference.id : reference as string | number | undefined,
        );
    }

    customerOrder(): CustomerOrderExpression {
        const path = this.path.member('customer_order', 'customerOrder');
        if (this.notLoaded) {
            return new CustomerOrderExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CustomerOrderExpression(undefined, this.root, path);
        if (!this.value.isLoaded('customerOrder')) {
            return new CustomerOrderExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'customer_order'));
        }
        const relation = this.value.customerOrder;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof CustomerOrder)) {
            return new CustomerOrderExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'customer_order'));
        }
        const target = relation instanceof CustomerOrder ? relation : undefined;
        return new CustomerOrderExpression(target, this.root, path);
    }

}

export class PlatformListExpression {
    constructor(
        private readonly items: readonly Platform[],
        private readonly root = 'Platform(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): PlatformListExpression {
        return new PlatformListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): PlatformExpression {
        return this.item(0, true);
    }

    get(index: number): PlatformExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): PlatformExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
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
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): CustomerOrderListExpression {
        return new CustomerOrderListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): CustomerOrderExpression {
        return this.item(0, true);
    }

    get(index: number): CustomerOrderExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): CustomerOrderExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new CustomerOrderExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
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

export class PaymentListExpression {
    constructor(
        private readonly items: readonly Payment[],
        private readonly root = 'Payment(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): PaymentListExpression {
        return new PaymentListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): PaymentExpression {
        return this.item(0, true);
    }

    get(index: number): PaymentExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): PaymentExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new PaymentExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
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
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): PaymentAttemptListExpression {
        return new PaymentAttemptListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): PaymentAttemptExpression {
        return this.item(0, true);
    }

    get(index: number): PaymentAttemptExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): PaymentAttemptExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new PaymentAttemptExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
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
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): ShipmentListExpression {
        return new ShipmentListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): ShipmentExpression {
        return this.item(0, true);
    }

    get(index: number): ShipmentExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): ShipmentExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new ShipmentExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
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
            value, 'Platform', ExpressionPath.root('E.platform(<root>)', 'camelCase'),
        );
    }

    static customerOrder(
        value: CustomerOrder | null | undefined,
    ): CustomerOrderExpression {
        return new CustomerOrderExpression(
            value, 'CustomerOrder', ExpressionPath.root('E.customerOrder(<root>)', 'camelCase'),
        );
    }

    static orderItem(
        value: OrderItem | null | undefined,
    ): OrderItemExpression {
        return new OrderItemExpression(
            value, 'OrderItem', ExpressionPath.root('E.orderItem(<root>)', 'camelCase'),
        );
    }

    static payment(
        value: Payment | null | undefined,
    ): PaymentExpression {
        return new PaymentExpression(
            value, 'Payment', ExpressionPath.root('E.payment(<root>)', 'camelCase'),
        );
    }

    static paymentAttempt(
        value: PaymentAttempt | null | undefined,
    ): PaymentAttemptExpression {
        return new PaymentAttemptExpression(
            value, 'PaymentAttempt', ExpressionPath.root('E.paymentAttempt(<root>)', 'camelCase'),
        );
    }

    static shipment(
        value: Shipment | null | undefined,
    ): ShipmentExpression {
        return new ShipmentExpression(
            value, 'Shipment', ExpressionPath.root('E.shipment(<root>)', 'camelCase'),
        );
    }
}