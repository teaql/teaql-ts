import { TeaQLClient } from '../teaql-ts';
import { WarehouseRequest } from './requests/WarehouseRequest';
import { SupplierRequest } from './requests/SupplierRequest';

export class Q {
    static warehouses(): WarehouseRequest {
        return new WarehouseRequest(false);
    }

    static warehousesWithMinimalFields(): WarehouseRequest {
        return new WarehouseRequest(true);
    }
    static suppliers(): SupplierRequest {
        return new SupplierRequest(false);
    }

    static suppliersWithMinimalFields(): SupplierRequest {
        return new SupplierRequest(true);
    }
}