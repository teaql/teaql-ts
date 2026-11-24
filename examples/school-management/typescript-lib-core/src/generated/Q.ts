import { TeaQLClient } from '../teaql-ts';
import { PlatformRequest } from './requests/PlatformRequest';
import { SchoolTypeRequest } from './requests/SchoolTypeRequest';
import { SchoolRequest } from './requests/SchoolRequest';

export class Q {
    static platforms(): PlatformRequest {
        return new PlatformRequest(false);
    }

    static platformsWithMinimalFields(): PlatformRequest {
        return new PlatformRequest(true);
    }
    static schoolTypes(): SchoolTypeRequest {
        return new SchoolTypeRequest(false);
    }

    static schoolTypesWithMinimalFields(): SchoolTypeRequest {
        return new SchoolTypeRequest(true);
    }
    static schools(): SchoolRequest {
        return new SchoolRequest(false);
    }

    static schoolsWithMinimalFields(): SchoolRequest {
        return new SchoolRequest(true);
    }
}