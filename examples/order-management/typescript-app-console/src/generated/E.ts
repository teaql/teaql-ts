import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { CommercePlatform } from './models/CommercePlatform';
import { Customer } from './models/Customer';
import { OrderStatus } from './models/OrderStatus';
import { CustomerOrder } from './models/CustomerOrder';
import { Product } from './models/Product';
import { OrderLine } from './models/OrderLine';
import { OrderSearchPreset } from './models/OrderSearchPreset';
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

export class CommercePlatformExpression {
    constructor(
        private readonly value: CommercePlatform | null | undefined,
        private readonly root = 'CommercePlatform(null)',
        private readonly path = ExpressionPath.root('E.commercePlatform(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): CommercePlatform | null | undefined {
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



    customerList(): CustomerListExpression {
        const path = this.path.member('customer_list', 'customerList');
        if (this.notLoaded) {
            return new CustomerListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return CustomerListExpression.missing(this.root, path);
        if (!this.value.isLoaded('customerList')) {
            return new CustomerListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'customer_list'));
        }
        return new CustomerListExpression(
            this.value.customerList(), this.root, path,
        );
    }

    orderStatusList(): OrderStatusListExpression {
        const path = this.path.member('order_status_list', 'orderStatusList');
        if (this.notLoaded) {
            return new OrderStatusListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return OrderStatusListExpression.missing(this.root, path);
        if (!this.value.isLoaded('orderStatusList')) {
            return new OrderStatusListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'order_status_list'));
        }
        return new OrderStatusListExpression(
            this.value.orderStatusList(), this.root, path,
        );
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

    productList(): ProductListExpression {
        const path = this.path.member('product_list', 'productList');
        if (this.notLoaded) {
            return new ProductListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return ProductListExpression.missing(this.root, path);
        if (!this.value.isLoaded('productList')) {
            return new ProductListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'product_list'));
        }
        return new ProductListExpression(
            this.value.productList(), this.root, path,
        );
    }

    orderLineList(): OrderLineListExpression {
        const path = this.path.member('order_line_list', 'orderLineList');
        if (this.notLoaded) {
            return new OrderLineListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return OrderLineListExpression.missing(this.root, path);
        if (!this.value.isLoaded('orderLineList')) {
            return new OrderLineListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'order_line_list'));
        }
        return new OrderLineListExpression(
            this.value.orderLineList(), this.root, path,
        );
    }

    orderSearchPresetList(): OrderSearchPresetListExpression {
        const path = this.path.member('order_search_preset_list', 'orderSearchPresetList');
        if (this.notLoaded) {
            return new OrderSearchPresetListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return OrderSearchPresetListExpression.missing(this.root, path);
        if (!this.value.isLoaded('orderSearchPresetList')) {
            return new OrderSearchPresetListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'order_search_preset_list'));
        }
        return new OrderSearchPresetListExpression(
            this.value.orderSearchPresetList(), this.root, path,
        );
    }
}

export class CustomerExpression {
    constructor(
        private readonly value: Customer | null | undefined,
        private readonly root = 'Customer(null)',
        private readonly path = ExpressionPath.root('E.customer(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Customer | null | undefined {
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

    email(): ValueExpression<string> {
        const path = this.path.member('email', 'email');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('email')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'email'),
            );
        }
        return new ValueExpression<string>(this.value.email);
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

    commercePlatformId(): ValueExpression<string | number> {
        const path = this.path.member('commerce_platform', 'commercePlatformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('commercePlatform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'),
            );
        }
        const reference = this.value.commercePlatform;
        return new ValueExpression<string | number>(
            reference instanceof CommercePlatform
                ? reference.id : reference as string | number | undefined,
        );
    }

    commercePlatform(): CommercePlatformExpression {
        const path = this.path.member('commerce_platform', 'commercePlatform');
        if (this.notLoaded) {
            return new CommercePlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CommercePlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('commercePlatform')) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const relation = this.value.commercePlatform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof CommercePlatform)) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const target = relation instanceof CommercePlatform ? relation : undefined;
        return new CommercePlatformExpression(target, this.root, path);
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

export class OrderStatusExpression {
    constructor(
        private readonly value: OrderStatus | null | undefined,
        private readonly root = 'OrderStatus(null)',
        private readonly path = ExpressionPath.root('E.orderStatus(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): OrderStatus | null | undefined {
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

    code(): ValueExpression<string> {
        const path = this.path.member('code', 'code');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('code')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'code'),
            );
        }
        return new ValueExpression<string>(this.value.code);
    }

    color(): ValueExpression<string | null> {
        const path = this.path.member('color', 'color');
        if (this.notLoaded) return ValueExpression.notLoaded<string | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | null>();
        if (!this.value.isLoaded('color')) {
            return ValueExpression.notLoaded<string | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'color'),
            );
        }
        return new ValueExpression<string | null>(this.value.color);
    }

    displayOrder(): ValueExpression<Decimal | null> {
        const path = this.path.member('display_order', 'displayOrder');
        if (this.notLoaded) return ValueExpression.notLoaded<Decimal | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Decimal | null>();
        if (!this.value.isLoaded('displayOrder')) {
            return ValueExpression.notLoaded<Decimal | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'display_order'),
            );
        }
        return new ValueExpression<Decimal | null>(this.value.displayOrder);
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

    commercePlatformId(): ValueExpression<string | number> {
        const path = this.path.member('commerce_platform', 'commercePlatformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('commercePlatform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'),
            );
        }
        const reference = this.value.commercePlatform;
        return new ValueExpression<string | number>(
            reference instanceof CommercePlatform
                ? reference.id : reference as string | number | undefined,
        );
    }

    commercePlatform(): CommercePlatformExpression {
        const path = this.path.member('commerce_platform', 'commercePlatform');
        if (this.notLoaded) {
            return new CommercePlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CommercePlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('commercePlatform')) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const relation = this.value.commercePlatform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof CommercePlatform)) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const target = relation instanceof CommercePlatform ? relation : undefined;
        return new CommercePlatformExpression(target, this.root, path);
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

    orderDate(): ValueExpression<string> {
        const path = this.path.member('order_date', 'orderDate');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('orderDate')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'order_date'),
            );
        }
        return new ValueExpression<string>(this.value.orderDate);
    }

    totalAmount(): ValueExpression<Decimal> {
        const path = this.path.member('total_amount', 'totalAmount');
        if (this.notLoaded) return ValueExpression.notLoaded<Decimal>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Decimal>();
        if (!this.value.isLoaded('totalAmount')) {
            return ValueExpression.notLoaded<Decimal>(
                new TeaQLNotLoadedError(path.markMissing(), 'total_amount'),
            );
        }
        return new ValueExpression<Decimal>(this.value.totalAmount);
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

    statusId(): ValueExpression<string | number> {
        const path = this.path.member('status', 'statusId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('status')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'status'),
            );
        }
        const reference = this.value.status;
        return new ValueExpression<string | number>(
            reference instanceof OrderStatus
                ? reference.id : reference as string | number | undefined,
        );
    }

    customerId(): ValueExpression<string | number> {
        const path = this.path.member('customer', 'customerId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('customer')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'customer'),
            );
        }
        const reference = this.value.customer;
        return new ValueExpression<string | number>(
            reference instanceof Customer
                ? reference.id : reference as string | number | undefined,
        );
    }

    commercePlatformId(): ValueExpression<string | number> {
        const path = this.path.member('commerce_platform', 'commercePlatformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('commercePlatform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'),
            );
        }
        const reference = this.value.commercePlatform;
        return new ValueExpression<string | number>(
            reference instanceof CommercePlatform
                ? reference.id : reference as string | number | undefined,
        );
    }

    status(): OrderStatusExpression {
        const path = this.path.member('status', 'status');
        if (this.notLoaded) {
            return new OrderStatusExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new OrderStatusExpression(undefined, this.root, path);
        if (!this.value.isLoaded('status')) {
            return new OrderStatusExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'status'));
        }
        const relation = this.value.status;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof OrderStatus)) {
            return new OrderStatusExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'status'));
        }
        const target = relation instanceof OrderStatus ? relation : undefined;
        return new OrderStatusExpression(target, this.root, path);
    }

    customer(): CustomerExpression {
        const path = this.path.member('customer', 'customer');
        if (this.notLoaded) {
            return new CustomerExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CustomerExpression(undefined, this.root, path);
        if (!this.value.isLoaded('customer')) {
            return new CustomerExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'customer'));
        }
        const relation = this.value.customer;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Customer)) {
            return new CustomerExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'customer'));
        }
        const target = relation instanceof Customer ? relation : undefined;
        return new CustomerExpression(target, this.root, path);
    }

    commercePlatform(): CommercePlatformExpression {
        const path = this.path.member('commerce_platform', 'commercePlatform');
        if (this.notLoaded) {
            return new CommercePlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CommercePlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('commercePlatform')) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const relation = this.value.commercePlatform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof CommercePlatform)) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const target = relation instanceof CommercePlatform ? relation : undefined;
        return new CommercePlatformExpression(target, this.root, path);
    }

    orderLineList(): OrderLineListExpression {
        const path = this.path.member('order_line_list', 'orderLineList');
        if (this.notLoaded) {
            return new OrderLineListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return OrderLineListExpression.missing(this.root, path);
        if (!this.value.isLoaded('orderLineList')) {
            return new OrderLineListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'order_line_list'));
        }
        return new OrderLineListExpression(
            this.value.orderLineList(), this.root, path,
        );
    }
}

export class ProductExpression {
    constructor(
        private readonly value: Product | null | undefined,
        private readonly root = 'Product(null)',
        private readonly path = ExpressionPath.root('E.product(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Product | null | undefined {
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

    sku(): ValueExpression<string> {
        const path = this.path.member('sku', 'sku');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('sku')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'sku'),
            );
        }
        return new ValueExpression<string>(this.value.sku);
    }

    imageUrl(): ValueExpression<string | null> {
        const path = this.path.member('image_url', 'imageUrl');
        if (this.notLoaded) return ValueExpression.notLoaded<string | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | null>();
        if (!this.value.isLoaded('imageUrl')) {
            return ValueExpression.notLoaded<string | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'image_url'),
            );
        }
        return new ValueExpression<string | null>(this.value.imageUrl);
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

    commercePlatformId(): ValueExpression<string | number> {
        const path = this.path.member('commerce_platform', 'commercePlatformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('commercePlatform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'),
            );
        }
        const reference = this.value.commercePlatform;
        return new ValueExpression<string | number>(
            reference instanceof CommercePlatform
                ? reference.id : reference as string | number | undefined,
        );
    }

    commercePlatform(): CommercePlatformExpression {
        const path = this.path.member('commerce_platform', 'commercePlatform');
        if (this.notLoaded) {
            return new CommercePlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CommercePlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('commercePlatform')) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const relation = this.value.commercePlatform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof CommercePlatform)) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const target = relation instanceof CommercePlatform ? relation : undefined;
        return new CommercePlatformExpression(target, this.root, path);
    }

    orderLineList(): OrderLineListExpression {
        const path = this.path.member('order_line_list', 'orderLineList');
        if (this.notLoaded) {
            return new OrderLineListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return OrderLineListExpression.missing(this.root, path);
        if (!this.value.isLoaded('orderLineList')) {
            return new OrderLineListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'order_line_list'));
        }
        return new OrderLineListExpression(
            this.value.orderLineList(), this.root, path,
        );
    }
}

export class OrderLineExpression {
    constructor(
        private readonly value: OrderLine | null | undefined,
        private readonly root = 'OrderLine(null)',
        private readonly path = ExpressionPath.root('E.orderLine(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): OrderLine | null | undefined {
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

    sku(): ValueExpression<string> {
        const path = this.path.member('sku', 'sku');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('sku')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'sku'),
            );
        }
        return new ValueExpression<string>(this.value.sku);
    }

    quantity(): ValueExpression<number> {
        const path = this.path.member('quantity', 'quantity');
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number>();
        if (!this.value.isLoaded('quantity')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(path.markMissing(), 'quantity'),
            );
        }
        const error = integer32Error(this.value.quantity, 'OrderLine', 'quantity');
        if (error) return ValueExpression.invalid<number>(error);
        return new ValueExpression<number>(this.value.quantity);
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

    productId(): ValueExpression<string | number> {
        const path = this.path.member('product', 'productId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('product')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'product'),
            );
        }
        const reference = this.value.product;
        return new ValueExpression<string | number>(
            reference instanceof Product
                ? reference.id : reference as string | number | undefined,
        );
    }

    commercePlatformId(): ValueExpression<string | number> {
        const path = this.path.member('commerce_platform', 'commercePlatformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('commercePlatform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'),
            );
        }
        const reference = this.value.commercePlatform;
        return new ValueExpression<string | number>(
            reference instanceof CommercePlatform
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

    product(): ProductExpression {
        const path = this.path.member('product', 'product');
        if (this.notLoaded) {
            return new ProductExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new ProductExpression(undefined, this.root, path);
        if (!this.value.isLoaded('product')) {
            return new ProductExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'product'));
        }
        const relation = this.value.product;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Product)) {
            return new ProductExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'product'));
        }
        const target = relation instanceof Product ? relation : undefined;
        return new ProductExpression(target, this.root, path);
    }

    commercePlatform(): CommercePlatformExpression {
        const path = this.path.member('commerce_platform', 'commercePlatform');
        if (this.notLoaded) {
            return new CommercePlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CommercePlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('commercePlatform')) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const relation = this.value.commercePlatform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof CommercePlatform)) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const target = relation instanceof CommercePlatform ? relation : undefined;
        return new CommercePlatformExpression(target, this.root, path);
    }

}

export class OrderSearchPresetExpression {
    constructor(
        private readonly value: OrderSearchPreset | null | undefined,
        private readonly root = 'OrderSearchPreset(null)',
        private readonly path = ExpressionPath.root('E.orderSearchPreset(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): OrderSearchPreset | null | undefined {
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

    filterJson(): ValueExpression<string> {
        const path = this.path.member('filter_json', 'filterJson');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('filterJson')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'filter_json'),
            );
        }
        return new ValueExpression<string>(this.value.filterJson);
    }

    requestId(): ValueExpression<string> {
        const path = this.path.member('request_id', 'requestId');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('requestId')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'request_id'),
            );
        }
        return new ValueExpression<string>(this.value.requestId);
    }

    ownerUserId(): ValueExpression<string> {
        const path = this.path.member('owner_user_id', 'ownerUserId');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('ownerUserId')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'owner_user_id'),
            );
        }
        return new ValueExpression<string>(this.value.ownerUserId);
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

    commercePlatformId(): ValueExpression<string | number> {
        const path = this.path.member('commerce_platform', 'commercePlatformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('commercePlatform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'),
            );
        }
        const reference = this.value.commercePlatform;
        return new ValueExpression<string | number>(
            reference instanceof CommercePlatform
                ? reference.id : reference as string | number | undefined,
        );
    }

    commercePlatform(): CommercePlatformExpression {
        const path = this.path.member('commerce_platform', 'commercePlatform');
        if (this.notLoaded) {
            return new CommercePlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CommercePlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('commercePlatform')) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const relation = this.value.commercePlatform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof CommercePlatform)) {
            return new CommercePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'commerce_platform'));
        }
        const target = relation instanceof CommercePlatform ? relation : undefined;
        return new CommercePlatformExpression(target, this.root, path);
    }

}

export class CommercePlatformListExpression {
    constructor(
        private readonly items: readonly CommercePlatform[],
        private readonly root = 'CommercePlatform(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): CommercePlatformListExpression {
        return new CommercePlatformListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): CommercePlatformExpression {
        return this.item(0, true);
    }

    get(index: number): CommercePlatformExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): CommercePlatformExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new CommercePlatformExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new CommercePlatformExpression(undefined, this.root, itemPath)
            : new CommercePlatformExpression(this.items[index], this.root, itemPath);
    }
}

export class CustomerListExpression {
    constructor(
        private readonly items: readonly Customer[],
        private readonly root = 'Customer(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): CustomerListExpression {
        return new CustomerListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): CustomerExpression {
        return this.item(0, true);
    }

    get(index: number): CustomerExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): CustomerExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new CustomerExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new CustomerExpression(undefined, this.root, itemPath)
            : new CustomerExpression(this.items[index], this.root, itemPath);
    }
}

export class OrderStatusListExpression {
    constructor(
        private readonly items: readonly OrderStatus[],
        private readonly root = 'OrderStatus(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): OrderStatusListExpression {
        return new OrderStatusListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): OrderStatusExpression {
        return this.item(0, true);
    }

    get(index: number): OrderStatusExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): OrderStatusExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new OrderStatusExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new OrderStatusExpression(undefined, this.root, itemPath)
            : new OrderStatusExpression(this.items[index], this.root, itemPath);
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

export class ProductListExpression {
    constructor(
        private readonly items: readonly Product[],
        private readonly root = 'Product(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): ProductListExpression {
        return new ProductListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): ProductExpression {
        return this.item(0, true);
    }

    get(index: number): ProductExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): ProductExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new ProductExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new ProductExpression(undefined, this.root, itemPath)
            : new ProductExpression(this.items[index], this.root, itemPath);
    }
}

export class OrderLineListExpression {
    constructor(
        private readonly items: readonly OrderLine[],
        private readonly root = 'OrderLine(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): OrderLineListExpression {
        return new OrderLineListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): OrderLineExpression {
        return this.item(0, true);
    }

    get(index: number): OrderLineExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): OrderLineExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new OrderLineExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new OrderLineExpression(undefined, this.root, itemPath)
            : new OrderLineExpression(this.items[index], this.root, itemPath);
    }
}

export class OrderSearchPresetListExpression {
    constructor(
        private readonly items: readonly OrderSearchPreset[],
        private readonly root = 'OrderSearchPreset(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): OrderSearchPresetListExpression {
        return new OrderSearchPresetListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): OrderSearchPresetExpression {
        return this.item(0, true);
    }

    get(index: number): OrderSearchPresetExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): OrderSearchPresetExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new OrderSearchPresetExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new OrderSearchPresetExpression(undefined, this.root, itemPath)
            : new OrderSearchPresetExpression(this.items[index], this.root, itemPath);
    }
}

export class E {
    static commercePlatform(
        value: CommercePlatform | null | undefined,
    ): CommercePlatformExpression {
        return new CommercePlatformExpression(
            value, 'CommercePlatform', ExpressionPath.root('E.commercePlatform(<root>)', 'camelCase'),
        );
    }

    static customer(
        value: Customer | null | undefined,
    ): CustomerExpression {
        return new CustomerExpression(
            value, 'Customer', ExpressionPath.root('E.customer(<root>)', 'camelCase'),
        );
    }

    static orderStatus(
        value: OrderStatus | null | undefined,
    ): OrderStatusExpression {
        return new OrderStatusExpression(
            value, 'OrderStatus', ExpressionPath.root('E.orderStatus(<root>)', 'camelCase'),
        );
    }

    static customerOrder(
        value: CustomerOrder | null | undefined,
    ): CustomerOrderExpression {
        return new CustomerOrderExpression(
            value, 'CustomerOrder', ExpressionPath.root('E.customerOrder(<root>)', 'camelCase'),
        );
    }

    static product(
        value: Product | null | undefined,
    ): ProductExpression {
        return new ProductExpression(
            value, 'Product', ExpressionPath.root('E.product(<root>)', 'camelCase'),
        );
    }

    static orderLine(
        value: OrderLine | null | undefined,
    ): OrderLineExpression {
        return new OrderLineExpression(
            value, 'OrderLine', ExpressionPath.root('E.orderLine(<root>)', 'camelCase'),
        );
    }

    static orderSearchPreset(
        value: OrderSearchPreset | null | undefined,
    ): OrderSearchPresetExpression {
        return new OrderSearchPresetExpression(
            value, 'OrderSearchPreset', ExpressionPath.root('E.orderSearchPreset(<root>)', 'camelCase'),
        );
    }
}