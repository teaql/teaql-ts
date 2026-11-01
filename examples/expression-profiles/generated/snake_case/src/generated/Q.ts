import { TeaQLClient } from '../teaql-ts';
import { TypePlatformRequest } from './requests/TypePlatformRequest';
import { ScalarTypeProbeRequest } from './requests/ScalarTypeProbeRequest';

export class Q {
    static typePlatforms(): TypePlatformRequest {
        return new TypePlatformRequest(false);
    }

    static typePlatformsWithMinimalFields(): TypePlatformRequest {
        return new TypePlatformRequest(true);
    }
    static scalarTypeProbes(): ScalarTypeProbeRequest {
        return new ScalarTypeProbeRequest(false);
    }

    static scalarTypeProbesWithMinimalFields(): ScalarTypeProbeRequest {
        return new ScalarTypeProbeRequest(true);
    }
}