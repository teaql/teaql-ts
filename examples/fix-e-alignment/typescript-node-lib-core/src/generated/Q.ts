import { TeaQLClient } from '../teaql-ts';
import { TenantRequest } from './requests/TenantRequest';
import { PurchaseOrderRequest } from './requests/PurchaseOrderRequest';
import { OrderItemRequest } from './requests/OrderItemRequest';

export class Q {
    static tenants(): TenantRequest {
        return new TenantRequest(false);
    }

    static tenantsWithMinimalFields(): TenantRequest {
        return new TenantRequest(true);
    }
    static purchaseOrders(): PurchaseOrderRequest {
        return new PurchaseOrderRequest(false);
    }

    static purchaseOrdersWithMinimalFields(): PurchaseOrderRequest {
        return new PurchaseOrderRequest(true);
    }
    static orderItems(): OrderItemRequest {
        return new OrderItemRequest(false);
    }

    static orderItemsWithMinimalFields(): OrderItemRequest {
        return new OrderItemRequest(true);
    }
}