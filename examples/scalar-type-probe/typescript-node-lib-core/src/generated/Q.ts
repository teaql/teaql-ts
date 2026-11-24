import { TeaQLClient } from '../teaql-ts';
import { PlatformRequest } from './requests/PlatformRequest';
import { FreightQuoteRequest } from './requests/FreightQuoteRequest';

export class Q {
    static platforms(): PlatformRequest {
        return new PlatformRequest(false);
    }

    static platformsWithMinimalFields(): PlatformRequest {
        return new PlatformRequest(true);
    }
    static freightQuotes(): FreightQuoteRequest {
        return new FreightQuoteRequest(false);
    }

    static freightQuotesWithMinimalFields(): FreightQuoteRequest {
        return new FreightQuoteRequest(true);
    }
}