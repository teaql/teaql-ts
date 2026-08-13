import { TeaQLClient } from '../teaql-ts';
import { CommercePlatformRequest } from './requests/CommercePlatformRequest';
import { CustomerRequest } from './requests/CustomerRequest';
import { OrderStatusRequest } from './requests/OrderStatusRequest';
import { CustomerOrderRequest } from './requests/CustomerOrderRequest';
import { ProductRequest } from './requests/ProductRequest';
import { OrderLineRequest } from './requests/OrderLineRequest';
import { OrderSearchPresetRequest } from './requests/OrderSearchPresetRequest';

export class Q {
    static commercePlatforms(): CommercePlatformRequest {
        return new CommercePlatformRequest();
    }
    static customers(): CustomerRequest {
        return new CustomerRequest();
    }
    static orderStatuses(): OrderStatusRequest {
        return new OrderStatusRequest();
    }
    static customerOrders(): CustomerOrderRequest {
        return new CustomerOrderRequest();
    }
    static products(): ProductRequest {
        return new ProductRequest();
    }
    static orderLines(): OrderLineRequest {
        return new OrderLineRequest();
    }
    static orderSearchPresets(): OrderSearchPresetRequest {
        return new OrderSearchPresetRequest();
    }
}