import { TeaQLClient } from '../teaql-ts';
import { DistributionCenterRequest } from './requests/DistributionCenterRequest';
import { DispatchOrderRequest } from './requests/DispatchOrderRequest';

export class Q {
    static distributionCenters(): DistributionCenterRequest {
        return new DistributionCenterRequest(false);
    }

    static distributionCentersWithMinimalFields(): DistributionCenterRequest {
        return new DistributionCenterRequest(true);
    }
    static dispatchOrders(): DispatchOrderRequest {
        return new DispatchOrderRequest(false);
    }

    static dispatchOrdersWithMinimalFields(): DispatchOrderRequest {
        return new DispatchOrderRequest(true);
    }
}