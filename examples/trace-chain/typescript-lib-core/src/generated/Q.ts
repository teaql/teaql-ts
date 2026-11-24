import { TeaQLClient } from '../teaql-ts';
import { PlatformRequest } from './requests/PlatformRequest';
import { CustomerOrderRequest } from './requests/CustomerOrderRequest';
import { OrderItemRequest } from './requests/OrderItemRequest';
import { PaymentRequest } from './requests/PaymentRequest';
import { PaymentAttemptRequest } from './requests/PaymentAttemptRequest';
import { ShipmentRequest } from './requests/ShipmentRequest';

export class Q {
    static platforms(): PlatformRequest {
        return new PlatformRequest(false);
    }

    static platformsWithMinimalFields(): PlatformRequest {
        return new PlatformRequest(true);
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
    static payments(): PaymentRequest {
        return new PaymentRequest(false);
    }

    static paymentsWithMinimalFields(): PaymentRequest {
        return new PaymentRequest(true);
    }
    static paymentAttempts(): PaymentAttemptRequest {
        return new PaymentAttemptRequest(false);
    }

    static paymentAttemptsWithMinimalFields(): PaymentAttemptRequest {
        return new PaymentAttemptRequest(true);
    }
    static shipments(): ShipmentRequest {
        return new ShipmentRequest(false);
    }

    static shipmentsWithMinimalFields(): ShipmentRequest {
        return new ShipmentRequest(true);
    }
}