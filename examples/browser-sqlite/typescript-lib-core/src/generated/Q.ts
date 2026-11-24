import { TeaQLClient } from '../teaql-ts';
import { PlatformRequest } from './requests/PlatformRequest';
import { OrderStatusRequest } from './requests/OrderStatusRequest';
import { CustomerRequest } from './requests/CustomerRequest';
import { CustomerOrderRequest } from './requests/CustomerOrderRequest';
import { OrderItemRequest } from './requests/OrderItemRequest';

export class Q {
    static platforms(): PlatformRequest {
        return new PlatformRequest(false);
    }

    static platformsWithMinimalFields(): PlatformRequest {
        return new PlatformRequest(true);
    }
    static orderStatuses(): OrderStatusRequest {
        return new OrderStatusRequest(false);
    }

    static orderStatusesWithMinimalFields(): OrderStatusRequest {
        return new OrderStatusRequest(true);
    }
    static customers(): CustomerRequest {
        return new CustomerRequest(false);
    }

    static customersWithMinimalFields(): CustomerRequest {
        return new CustomerRequest(true);
    }
    static customerOrders(): CustomerOrderRequest {
        return new CustomerOrderRequest(false);
    }

    static customerOrdersWithMinimalFields(): CustomerOrderRequest {
        return new CustomerOrderRequest(true);
    }
    static orderItems(): OrderItemRequest {
        return new OrderItemRequest(false);
    }

    static orderItemsWithMinimalFields(): OrderItemRequest {
        return new OrderItemRequest(true);
    }
}