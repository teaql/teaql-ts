import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { Warehouse } from './models/Warehouse';
import { Supplier } from './models/Supplier';
import { CheckException, integer32Error, ExpressionPath, TeaQLNotLoadedError } from '../teaql-ts';
export { TeaQLNotLoadedError } from '../teaql-ts';

export class ValueExpression<T> {
    constructor(
        private readonly value: T | null | undefined,
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
        private readonly invalidValue?: CheckException,
    ) {}

    static missing<T>(): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false);
    }

    static notLoaded<T>(error: TeaQLNotLoadedError): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false, error);
    }

    static invalid<T>(error: CheckException): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false, undefined, error);
    }

    eval(): T | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        if (this.invalidValue) throw this.invalidValue;
        return this.present ? this.value : undefined;
    }

    isPresent(): boolean {
        if (this.notLoaded) throw this.notLoaded.terminal('isPresent()');
        if (this.invalidValue) throw this.invalidValue;
        return this.present;
    }

    orElse(fallback: T): T {
        if (this.notLoaded) throw this.notLoaded.terminal('orElse(<fallback>)');
        if (this.invalidValue) throw this.invalidValue;
        const value = this.value;
        return this.present && value != null ? value : fallback;
    }
}

export class WarehouseExpression {
    constructor(
        private readonly value: Warehouse | null | undefined,
        private readonly root = 'Warehouse(null)',
        private readonly path = ExpressionPath.root('E.warehouse(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Warehouse | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        return this.value;
    }

    id(): ValueExpression<string> {
        const path = this.path.member('id', 'id');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        const path = this.path.member('name', 'name');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    version(): ValueExpression<EntityVersion> {
        const path = this.path.member('version', 'version');
        if (this.notLoaded) return ValueExpression.notLoaded<EntityVersion>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<EntityVersion>();
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<EntityVersion>(
                new TeaQLNotLoadedError(path.markMissing(), 'version'),
            );
        }
        return new ValueExpression<EntityVersion>(this.value.version);
    }



    supplierList(): SupplierListExpression {
        const path = this.path.member('supplier_list', 'supplierList');
        if (this.notLoaded) {
            return new SupplierListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return SupplierListExpression.missing(this.root, path);
        if (!this.value.isLoaded('supplierList')) {
            return new SupplierListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'supplier_list'));
        }
        return new SupplierListExpression(
            this.value.supplierList(), this.root, path,
        );
    }
}

export class SupplierExpression {
    constructor(
        private readonly value: Supplier | null | undefined,
        private readonly root = 'Supplier(null)',
        private readonly path = ExpressionPath.root('E.supplier(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Supplier | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        return this.value;
    }

    id(): ValueExpression<string> {
        const path = this.path.member('id', 'id');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        const path = this.path.member('name', 'name');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    minimumOrderQuantity(): ValueExpression<number> {
        const path = this.path.member('minimum_order_quantity', 'minimumOrderQuantity');
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number>();
        if (!this.value.isLoaded('minimumOrderQuantity')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(path.markMissing(), 'minimum_order_quantity'),
            );
        }
        const error = integer32Error(this.value.minimumOrderQuantity, 'Supplier', 'minimum_order_quantity');
        if (error) return ValueExpression.invalid<number>(error);
        return new ValueExpression<number>(this.value.minimumOrderQuantity);
    }

    version(): ValueExpression<EntityVersion> {
        const path = this.path.member('version', 'version');
        if (this.notLoaded) return ValueExpression.notLoaded<EntityVersion>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<EntityVersion>();
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<EntityVersion>(
                new TeaQLNotLoadedError(path.markMissing(), 'version'),
            );
        }
        return new ValueExpression<EntityVersion>(this.value.version);
    }

    warehouseId(): ValueExpression<string | number> {
        const path = this.path.member('warehouse', 'warehouseId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('warehouse')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'warehouse'),
            );
        }
        const reference = this.value.warehouse;
        return new ValueExpression<string | number>(
            reference instanceof Warehouse
                ? reference.id : reference as string | number | undefined,
        );
    }

    warehouse(): WarehouseExpression {
        const path = this.path.member('warehouse', 'warehouse');
        if (this.notLoaded) {
            return new WarehouseExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new WarehouseExpression(undefined, this.root, path);
        if (!this.value.isLoaded('warehouse')) {
            return new WarehouseExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'warehouse'));
        }
        const relation = this.value.warehouse;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Warehouse)) {
            return new WarehouseExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'warehouse'));
        }
        const target = relation instanceof Warehouse ? relation : undefined;
        return new WarehouseExpression(target, this.root, path);
    }

}

export class WarehouseListExpression {
    constructor(
        private readonly items: readonly Warehouse[],
        private readonly root = 'Warehouse(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): WarehouseListExpression {
        return new WarehouseListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): WarehouseExpression {
        return this.item(0, true);
    }

    get(index: number): WarehouseExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): WarehouseExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new WarehouseExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new WarehouseExpression(undefined, this.root, itemPath)
            : new WarehouseExpression(this.items[index], this.root, itemPath);
    }
}

export class SupplierListExpression {
    constructor(
        private readonly items: readonly Supplier[],
        private readonly root = 'Supplier(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): SupplierListExpression {
        return new SupplierListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): SupplierExpression {
        return this.item(0, true);
    }

    get(index: number): SupplierExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): SupplierExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new SupplierExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new SupplierExpression(undefined, this.root, itemPath)
            : new SupplierExpression(this.items[index], this.root, itemPath);
    }
}

export class E {
    static warehouse(
        value: Warehouse | null | undefined,
    ): WarehouseExpression {
        return new WarehouseExpression(
            value, 'Warehouse', ExpressionPath.root('E.warehouse(<root>)', 'camelCase'),
        );
    }

    static supplier(
        value: Supplier | null | undefined,
    ): SupplierExpression {
        return new SupplierExpression(
            value, 'Supplier', ExpressionPath.root('E.supplier(<root>)', 'camelCase'),
        );
    }
}