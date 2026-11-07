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
        return new CommercePlatformRequest(false);
    }

    static commercePlatformsWithMinimalFields(): CommercePlatformRequest {
        return new CommercePlatformRequest(true);
    }
    static customers(): CustomerRequest {
        return new CustomerRequest(false);
    }

    static customersWithMinimalFields(): CustomerRequest {
        return new CustomerRequest(true);
    }
    static orderStatuses(): OrderStatusRequest {
        return new OrderStatusRequest(false);
    }

    static orderStatusesWithMinimalFields(): OrderStatusRequest {
        return new OrderStatusRequest(true);
    }
    static customerOrders(): CustomerOrderRequest {
        return new CustomerOrderRequest(false);
    }

    static customerOrdersWithMinimalFields(): CustomerOrderRequest {
        return new CustomerOrderRequest(true);
    }
    static products(): ProductRequest {
        return new ProductRequest(false);
    }

    static productsWithMinimalFields(): ProductRequest {
        return new ProductRequest(true);
    }
    static orderLines(): OrderLineRequest {
        return new OrderLineRequest(false);
    }

    static orderLinesWithMinimalFields(): OrderLineRequest {
        return new OrderLineRequest(true);
    }
    static orderSearchPresets(): OrderSearchPresetRequest {
        return new OrderSearchPresetRequest(false);
    }

    static orderSearchPresetsWithMinimalFields(): OrderSearchPresetRequest {
        return new OrderSearchPresetRequest(true);
    }
}