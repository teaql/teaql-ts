import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { CommercePlatform } from './models/CommercePlatform';
import { CustomerOrder } from './models/CustomerOrder';
import { OrderAttachment } from './models/OrderAttachment';
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

    orderAttachmentList(): OrderAttachmentListExpression {
        const path = this.path.member('order_attachment_list', 'orderAttachmentList');
        if (this.notLoaded) {
            return new OrderAttachmentListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return OrderAttachmentListExpression.missing(this.root, path);
        if (!this.value.isLoaded('orderAttachmentList')) {
            return new OrderAttachmentListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'order_attachment_list'));
        }
        return new OrderAttachmentListExpression(
            this.value.orderAttachmentList(), this.root, path,
        );
    }
}

export class OrderAttachmentExpression {
    constructor(
        private readonly value: OrderAttachment | null | undefined,
        private readonly root = 'OrderAttachment(null)',
        private readonly path = ExpressionPath.root('E.orderAttachment(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): OrderAttachment | null | undefined {
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

    fileName(): ValueExpression<string> {
        const path = this.path.member('file_name', 'fileName');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('fileName')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'file_name'),
            );
        }
        return new ValueExpression<string>(this.value.fileName);
    }

    contentType(): ValueExpression<string> {
        const path = this.path.member('content_type', 'contentType');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('contentType')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'content_type'),
            );
        }
        return new ValueExpression<string>(this.value.contentType);
    }

    contentLength(): ValueExpression<number> {
        const path = this.path.member('content_length', 'contentLength');
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number>();
        if (!this.value.isLoaded('contentLength')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(path.markMissing(), 'content_length'),
            );
        }
        const error = integer32Error(this.value.contentLength, 'OrderAttachment', 'content_length');
        if (error) return ValueExpression.invalid<number>(error);
        return new ValueExpression<number>(this.value.contentLength);
    }

    contentSha256(): ValueExpression<string> {
        const path = this.path.member('content_sha256', 'contentSha256');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('contentSha256')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'content_sha256'),
            );
        }
        return new ValueExpression<string>(this.value.contentSha256);
    }

    objectKey(): ValueExpression<string> {
        const path = this.path.member('object_key', 'objectKey');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('objectKey')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'object_key'),
            );
        }
        return new ValueExpression<string>(this.value.objectKey);
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

export class OrderAttachmentListExpression {
    constructor(
        private readonly items: readonly OrderAttachment[],
        private readonly root = 'OrderAttachment(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): OrderAttachmentListExpression {
        return new OrderAttachmentListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): OrderAttachmentExpression {
        return this.item(0, true);
    }

    get(index: number): OrderAttachmentExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): OrderAttachmentExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new OrderAttachmentExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new OrderAttachmentExpression(undefined, this.root, itemPath)
            : new OrderAttachmentExpression(this.items[index], this.root, itemPath);
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

    static customerOrder(
        value: CustomerOrder | null | undefined,
    ): CustomerOrderExpression {
        return new CustomerOrderExpression(
            value, 'CustomerOrder', ExpressionPath.root('E.customerOrder(<root>)', 'camelCase'),
        );
    }

    static orderAttachment(
        value: OrderAttachment | null | undefined,
    ): OrderAttachmentExpression {
        return new OrderAttachmentExpression(
            value, 'OrderAttachment', ExpressionPath.root('E.orderAttachment(<root>)', 'camelCase'),
        );
    }
}