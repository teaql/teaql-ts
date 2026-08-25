import { TeaQLClient } from '../teaql-ts';
import { PlatformRequest } from './requests/PlatformRequest';
import { WorkItemRequest } from './requests/WorkItemRequest';

export class Q {
    static platforms(): PlatformRequest {
        return new PlatformRequest(false);
    }

    static platformsWithMinimalFields(): PlatformRequest {
        return new PlatformRequest(true);
    }
    static workItems(): WorkItemRequest {
        return new WorkItemRequest(false);
    }

    static workItemsWithMinimalFields(): WorkItemRequest {
        return new WorkItemRequest(true);
    }
}