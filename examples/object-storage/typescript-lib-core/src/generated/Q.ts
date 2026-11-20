import { TeaQLClient } from '../teaql-ts';
import { CommercePlatformRequest } from './requests/CommercePlatformRequest';
import { CustomerOrderRequest } from './requests/CustomerOrderRequest';
import { OrderAttachmentRequest } from './requests/OrderAttachmentRequest';

export class Q {
    static commercePlatforms(): CommercePlatformRequest {
        return new CommercePlatformRequest(false);
    }

    static commercePlatformsWithMinimalFields(): CommercePlatformRequest {
        return new CommercePlatformRequest(true);
    }
    static customerOrders(): CustomerOrderRequest {
        return new CustomerOrderRequest(false);
    }

    static customerOrdersWithMinimalFields(): CustomerOrderRequest {
        return new CustomerOrderRequest(true);
    }
    static orderAttachments(): OrderAttachmentRequest {
        return new OrderAttachmentRequest(false);
    }

    static orderAttachmentsWithMinimalFields(): OrderAttachmentRequest {
        return new OrderAttachmentRequest(true);
    }
}