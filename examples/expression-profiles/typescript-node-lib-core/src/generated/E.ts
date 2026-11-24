import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { DistributionCenter } from './models/DistributionCenter';
import { DispatchOrder } from './models/DispatchOrder';
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

export class DistributionCenterExpression {
    constructor(
        private readonly value: DistributionCenter | null | undefined,
        private readonly root = 'DistributionCenter(null)',
        private readonly path = ExpressionPath.root('E.distributionCenter(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): DistributionCenter | null | undefined {
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

    dockName(): ValueExpression<string> {
        const path = this.path.member('dock_name', 'dockName');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('dockName')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'dock_name'),
            );
        }
        return new ValueExpression<string>(this.value.dockName);
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



    dispatchOrderList(): DispatchOrderListExpression {
        const path = this.path.member('dispatch_order_list', 'dispatchOrderList');
        if (this.notLoaded) {
            return new DispatchOrderListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return DispatchOrderListExpression.missing(this.root, path);
        if (!this.value.isLoaded('dispatchOrderList')) {
            return new DispatchOrderListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'dispatch_order_list'));
        }
        return new DispatchOrderListExpression(
            this.value.dispatchOrderList(), this.root, path,
        );
    }
}

export class DispatchOrderExpression {
    constructor(
        private readonly value: DispatchOrder | null | undefined,
        private readonly root = 'DispatchOrder(null)',
        private readonly path = ExpressionPath.root('E.dispatchOrder(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): DispatchOrder | null | undefined {
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

    orderReference(): ValueExpression<string> {
        const path = this.path.member('order_reference', 'orderReference');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('orderReference')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'order_reference'),
            );
        }
        return new ValueExpression<string>(this.value.orderReference);
    }

    handlingNote(): ValueExpression<string> {
        const path = this.path.member('handling_note', 'handlingNote');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('handlingNote')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'handling_note'),
            );
        }
        return new ValueExpression<string>(this.value.handlingNote);
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

    distributionCenterId(): ValueExpression<string | number> {
        const path = this.path.member('distribution_center', 'distributionCenterId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('distributionCenter')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'distribution_center'),
            );
        }
        const reference = this.value.distributionCenter;
        return new ValueExpression<string | number>(
            reference instanceof DistributionCenter
                ? reference.id : reference as string | number | undefined,
        );
    }

    distributionCenter(): DistributionCenterExpression {
        const path = this.path.member('distribution_center', 'distributionCenter');
        if (this.notLoaded) {
            return new DistributionCenterExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new DistributionCenterExpression(undefined, this.root, path);
        if (!this.value.isLoaded('distributionCenter')) {
            return new DistributionCenterExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'distribution_center'));
        }
        const relation = this.value.distributionCenter;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof DistributionCenter)) {
            return new DistributionCenterExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'distribution_center'));
        }
        const target = relation instanceof DistributionCenter ? relation : undefined;
        return new DistributionCenterExpression(target, this.root, path);
    }

}

export class DistributionCenterListExpression {
    constructor(
        private readonly items: readonly DistributionCenter[],
        private readonly root = 'DistributionCenter(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): DistributionCenterListExpression {
        return new DistributionCenterListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): DistributionCenterExpression {
        return this.item(0, true);
    }

    get(index: number): DistributionCenterExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): DistributionCenterExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new DistributionCenterExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new DistributionCenterExpression(undefined, this.root, itemPath)
            : new DistributionCenterExpression(this.items[index], this.root, itemPath);
    }
}

export class DispatchOrderListExpression {
    constructor(
        private readonly items: readonly DispatchOrder[],
        private readonly root = 'DispatchOrder(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): DispatchOrderListExpression {
        return new DispatchOrderListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): DispatchOrderExpression {
        return this.item(0, true);
    }

    get(index: number): DispatchOrderExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): DispatchOrderExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new DispatchOrderExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new DispatchOrderExpression(undefined, this.root, itemPath)
            : new DispatchOrderExpression(this.items[index], this.root, itemPath);
    }
}

export class E {
    static distributionCenter(
        value: DistributionCenter | null | undefined,
    ): DistributionCenterExpression {
        return new DistributionCenterExpression(
            value, 'DistributionCenter', ExpressionPath.root('E.distributionCenter(<root>)', 'camelCase'),
        );
    }

    static dispatchOrder(
        value: DispatchOrder | null | undefined,
    ): DispatchOrderExpression {
        return new DispatchOrderExpression(
            value, 'DispatchOrder', ExpressionPath.root('E.dispatchOrder(<root>)', 'camelCase'),
        );
    }
}