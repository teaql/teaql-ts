import { TeaQLClient } from '../teaql-ts';
import { CatalogRequest } from './requests/CatalogRequest';
import { EntryRequest } from './requests/EntryRequest';

export class Q {
    static catalogs(): CatalogRequest {
        return new CatalogRequest(false);
    }

    static catalogsWithMinimalFields(): CatalogRequest {
        return new CatalogRequest(true);
    }
    static entries(): EntryRequest {
        return new EntryRequest(false);
    }

    static entriesWithMinimalFields(): EntryRequest {
        return new EntryRequest(true);
    }
}