import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { Platform } from './models/Platform';
import { FreightQuote } from './models/FreightQuote';
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

export class PlatformExpression {
    constructor(
        private readonly value: Platform | null | undefined,
        private readonly root = 'Platform(null)',
        private readonly path = ExpressionPath.root('E.platform(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Platform | null | undefined {
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



    freightQuoteList(): FreightQuoteListExpression {
        const path = this.path.member('freight_quote_list', 'freightQuoteList');
        if (this.notLoaded) {
            return new FreightQuoteListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return FreightQuoteListExpression.missing(this.root, path);
        if (!this.value.isLoaded('freightQuoteList')) {
            return new FreightQuoteListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'freight_quote_list'));
        }
        return new FreightQuoteListExpression(
            this.value.freightQuoteList(), this.root, path,
        );
    }
}

export class FreightQuoteExpression {
    constructor(
        private readonly value: FreightQuote | null | undefined,
        private readonly root = 'FreightQuote(null)',
        private readonly path = ExpressionPath.root('E.freightQuote(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): FreightQuote | null | undefined {
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

    reference(): ValueExpression<string> {
        const path = this.path.member('reference', 'reference');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('reference')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'reference'),
            );
        }
        return new ValueExpression<string>(this.value.reference);
    }

    amount(): ValueExpression<Decimal> {
        const path = this.path.member('amount', 'amount');
        if (this.notLoaded) return ValueExpression.notLoaded<Decimal>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Decimal>();
        if (!this.value.isLoaded('amount')) {
            return ValueExpression.notLoaded<Decimal>(
                new TeaQLNotLoadedError(path.markMissing(), 'amount'),
            );
        }
        return new ValueExpression<Decimal>(this.value.amount);
    }

    shipmentNumber(): ValueExpression<Long> {
        const path = this.path.member('shipment_number', 'shipmentNumber');
        if (this.notLoaded) return ValueExpression.notLoaded<Long>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Long>();
        if (!this.value.isLoaded('shipmentNumber')) {
            return ValueExpression.notLoaded<Long>(
                new TeaQLNotLoadedError(path.markMissing(), 'shipment_number'),
            );
        }
        return new ValueExpression<Long>(this.value.shipmentNumber);
    }

    packageCount(): ValueExpression<number> {
        const path = this.path.member('package_count', 'packageCount');
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number>();
        if (!this.value.isLoaded('packageCount')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(path.markMissing(), 'package_count'),
            );
        }
        const error = integer32Error(this.value.packageCount, 'FreightQuote', 'package_count');
        if (error) return ValueExpression.invalid<number>(error);
        return new ValueExpression<number>(this.value.packageCount);
    }

    deliveryDate(): ValueExpression<string> {
        const path = this.path.member('delivery_date', 'deliveryDate');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('deliveryDate')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'delivery_date'),
            );
        }
        return new ValueExpression<string>(this.value.deliveryDate);
    }

    pickupTime(): ValueExpression<LocalTime> {
        const path = this.path.member('pickup_time', 'pickupTime');
        if (this.notLoaded) return ValueExpression.notLoaded<LocalTime>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<LocalTime>();
        if (!this.value.isLoaded('pickupTime')) {
            return ValueExpression.notLoaded<LocalTime>(
                new TeaQLNotLoadedError(path.markMissing(), 'pickup_time'),
            );
        }
        return new ValueExpression<LocalTime>(this.value.pickupTime);
    }

    quotedAt(): ValueExpression<string> {
        const path = this.path.member('quoted_at', 'quotedAt');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('quotedAt')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'quoted_at'),
            );
        }
        return new ValueExpression<string>(this.value.quotedAt);
    }

    instructions(): ValueExpression<string | null> {
        const path = this.path.member('instructions', 'instructions');
        if (this.notLoaded) return ValueExpression.notLoaded<string | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | null>();
        if (!this.value.isLoaded('instructions')) {
            return ValueExpression.notLoaded<string | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'instructions'),
            );
        }
        return new ValueExpression<string | null>(this.value.instructions);
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

    platformId(): ValueExpression<string | number> {
        const path = this.path.member('platform', 'platformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('platform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'platform'),
            );
        }
        const reference = this.value.platform;
        return new ValueExpression<string | number>(
            reference instanceof Platform
                ? reference.id : reference as string | number | undefined,
        );
    }

    platform(): PlatformExpression {
        const path = this.path.member('platform', 'platform');
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new PlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('platform')) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'platform'));
        }
        const relation = this.value.platform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Platform)) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'platform'));
        }
        const target = relation instanceof Platform ? relation : undefined;
        return new PlatformExpression(target, this.root, path);
    }

}

export class PlatformListExpression {
    constructor(
        private readonly items: readonly Platform[],
        private readonly root = 'Platform(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): PlatformListExpression {
        return new PlatformListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): PlatformExpression {
        return this.item(0, true);
    }

    get(index: number): PlatformExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): PlatformExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new PlatformExpression(undefined, this.root, itemPath)
            : new PlatformExpression(this.items[index], this.root, itemPath);
    }
}

export class FreightQuoteListExpression {
    constructor(
        private readonly items: readonly FreightQuote[],
        private readonly root = 'FreightQuote(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): FreightQuoteListExpression {
        return new FreightQuoteListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): FreightQuoteExpression {
        return this.item(0, true);
    }

    get(index: number): FreightQuoteExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): FreightQuoteExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new FreightQuoteExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new FreightQuoteExpression(undefined, this.root, itemPath)
            : new FreightQuoteExpression(this.items[index], this.root, itemPath);
    }
}

export class E {
    static platform(
        value: Platform | null | undefined,
    ): PlatformExpression {
        return new PlatformExpression(
            value, 'Platform', ExpressionPath.root('E.platform(<root>)', 'camelCase'),
        );
    }

    static freightQuote(
        value: FreightQuote | null | undefined,
    ): FreightQuoteExpression {
        return new FreightQuoteExpression(
            value, 'FreightQuote', ExpressionPath.root('E.freightQuote(<root>)', 'camelCase'),
        );
    }
}