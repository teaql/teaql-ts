import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { TypePlatform } from './models/TypePlatform';
import { ScalarTypeProbe } from './models/ScalarTypeProbe';
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

export class TypePlatformExpression {
    constructor(
        private readonly value: TypePlatform | null | undefined,
        private readonly root = 'TypePlatform(null)',
        private readonly path = ExpressionPath.root('E.typePlatform(<root>)', 'PascalCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): TypePlatform | null | undefined {
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



    scalarTypeProbeList(): ScalarTypeProbeListExpression {
        const path = this.path.member('scalar_type_probe_list', 'scalarTypeProbeList');
        if (this.notLoaded) {
            return new ScalarTypeProbeListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return ScalarTypeProbeListExpression.missing(this.root, path);
        if (!this.value.isLoaded('scalarTypeProbeList')) {
            return new ScalarTypeProbeListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'scalar_type_probe_list'));
        }
        return new ScalarTypeProbeListExpression(
            this.value.scalarTypeProbeList(), this.root, path,
        );
    }
}

export class ScalarTypeProbeExpression {
    constructor(
        private readonly value: ScalarTypeProbe | null | undefined,
        private readonly root = 'ScalarTypeProbe(null)',
        private readonly path = ExpressionPath.root('E.scalarTypeProbe(<root>)', 'PascalCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): ScalarTypeProbe | null | undefined {
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

    requiredString(): ValueExpression<string> {
        const path = this.path.member('required_string', 'requiredString');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('requiredString')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'required_string'),
            );
        }
        return new ValueExpression<string>(this.value.requiredString);
    }

    optionalString(): ValueExpression<string | null> {
        const path = this.path.member('optional_string', 'optionalString');
        if (this.notLoaded) return ValueExpression.notLoaded<string | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | null>();
        if (!this.value.isLoaded('optionalString')) {
            return ValueExpression.notLoaded<string | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'optional_string'),
            );
        }
        return new ValueExpression<string | null>(this.value.optionalString);
    }

    largeText(): ValueExpression<string | null> {
        const path = this.path.member('large_text', 'largeText');
        if (this.notLoaded) return ValueExpression.notLoaded<string | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | null>();
        if (!this.value.isLoaded('largeText')) {
            return ValueExpression.notLoaded<string | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'large_text'),
            );
        }
        return new ValueExpression<string | null>(this.value.largeText);
    }

    requiredBoolean(): ValueExpression<boolean> {
        const path = this.path.member('required_boolean', 'requiredBoolean');
        if (this.notLoaded) return ValueExpression.notLoaded<boolean>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<boolean>();
        if (!this.value.isLoaded('requiredBoolean')) {
            return ValueExpression.notLoaded<boolean>(
                new TeaQLNotLoadedError(path.markMissing(), 'required_boolean'),
            );
        }
        return new ValueExpression<boolean>(this.value.requiredBoolean);
    }

    optionalBoolean(): ValueExpression<boolean | null> {
        const path = this.path.member('optional_boolean', 'optionalBoolean');
        if (this.notLoaded) return ValueExpression.notLoaded<boolean | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<boolean | null>();
        if (!this.value.isLoaded('optionalBoolean')) {
            return ValueExpression.notLoaded<boolean | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'optional_boolean'),
            );
        }
        return new ValueExpression<boolean | null>(this.value.optionalBoolean);
    }

    requiredInteger(): ValueExpression<number> {
        const path = this.path.member('required_integer', 'requiredInteger');
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number>();
        if (!this.value.isLoaded('requiredInteger')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(path.markMissing(), 'required_integer'),
            );
        }
        const error = integer32Error(this.value.requiredInteger, 'ScalarTypeProbe', 'required_integer');
        if (error) return ValueExpression.invalid<number>(error);
        return new ValueExpression<number>(this.value.requiredInteger);
    }

    optionalInteger(): ValueExpression<number | null> {
        const path = this.path.member('optional_integer', 'optionalInteger');
        if (this.notLoaded) return ValueExpression.notLoaded<number | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number | null>();
        if (!this.value.isLoaded('optionalInteger')) {
            return ValueExpression.notLoaded<number | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'optional_integer'),
            );
        }
        const error = integer32Error(this.value.optionalInteger, 'ScalarTypeProbe', 'optional_integer');
        if (error) return ValueExpression.invalid<number | null>(error);
        return new ValueExpression<number | null>(this.value.optionalInteger);
    }

    requiredLong(): ValueExpression<Long> {
        const path = this.path.member('required_long', 'requiredLong');
        if (this.notLoaded) return ValueExpression.notLoaded<Long>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Long>();
        if (!this.value.isLoaded('requiredLong')) {
            return ValueExpression.notLoaded<Long>(
                new TeaQLNotLoadedError(path.markMissing(), 'required_long'),
            );
        }
        return new ValueExpression<Long>(this.value.requiredLong);
    }

    optionalLong(): ValueExpression<Long | null> {
        const path = this.path.member('optional_long', 'optionalLong');
        if (this.notLoaded) return ValueExpression.notLoaded<Long | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Long | null>();
        if (!this.value.isLoaded('optionalLong')) {
            return ValueExpression.notLoaded<Long | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'optional_long'),
            );
        }
        return new ValueExpression<Long | null>(this.value.optionalLong);
    }

    requiredDecimal(): ValueExpression<Decimal> {
        const path = this.path.member('required_decimal', 'requiredDecimal');
        if (this.notLoaded) return ValueExpression.notLoaded<Decimal>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Decimal>();
        if (!this.value.isLoaded('requiredDecimal')) {
            return ValueExpression.notLoaded<Decimal>(
                new TeaQLNotLoadedError(path.markMissing(), 'required_decimal'),
            );
        }
        return new ValueExpression<Decimal>(this.value.requiredDecimal);
    }

    optionalDecimal(): ValueExpression<Decimal | null> {
        const path = this.path.member('optional_decimal', 'optionalDecimal');
        if (this.notLoaded) return ValueExpression.notLoaded<Decimal | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Decimal | null>();
        if (!this.value.isLoaded('optionalDecimal')) {
            return ValueExpression.notLoaded<Decimal | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'optional_decimal'),
            );
        }
        return new ValueExpression<Decimal | null>(this.value.optionalDecimal);
    }

    requiredFloat(): ValueExpression<number> {
        const path = this.path.member('required_float', 'requiredFloat');
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number>();
        if (!this.value.isLoaded('requiredFloat')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(path.markMissing(), 'required_float'),
            );
        }
        return new ValueExpression<number>(this.value.requiredFloat);
    }

    optionalFloat(): ValueExpression<number | null> {
        const path = this.path.member('optional_float', 'optionalFloat');
        if (this.notLoaded) return ValueExpression.notLoaded<number | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number | null>();
        if (!this.value.isLoaded('optionalFloat')) {
            return ValueExpression.notLoaded<number | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'optional_float'),
            );
        }
        return new ValueExpression<number | null>(this.value.optionalFloat);
    }

    requiredDouble(): ValueExpression<number> {
        const path = this.path.member('required_double', 'requiredDouble');
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number>();
        if (!this.value.isLoaded('requiredDouble')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(path.markMissing(), 'required_double'),
            );
        }
        return new ValueExpression<number>(this.value.requiredDouble);
    }

    optionalDouble(): ValueExpression<number | null> {
        const path = this.path.member('optional_double', 'optionalDouble');
        if (this.notLoaded) return ValueExpression.notLoaded<number | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number | null>();
        if (!this.value.isLoaded('optionalDouble')) {
            return ValueExpression.notLoaded<number | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'optional_double'),
            );
        }
        return new ValueExpression<number | null>(this.value.optionalDouble);
    }

    requiredDate(): ValueExpression<string> {
        const path = this.path.member('required_date', 'requiredDate');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('requiredDate')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'required_date'),
            );
        }
        return new ValueExpression<string>(this.value.requiredDate);
    }

    optionalDate(): ValueExpression<string | null> {
        const path = this.path.member('optional_date', 'optionalDate');
        if (this.notLoaded) return ValueExpression.notLoaded<string | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | null>();
        if (!this.value.isLoaded('optionalDate')) {
            return ValueExpression.notLoaded<string | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'optional_date'),
            );
        }
        return new ValueExpression<string | null>(this.value.optionalDate);
    }

    requiredTime(): ValueExpression<LocalTime> {
        const path = this.path.member('required_time', 'requiredTime');
        if (this.notLoaded) return ValueExpression.notLoaded<LocalTime>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<LocalTime>();
        if (!this.value.isLoaded('requiredTime')) {
            return ValueExpression.notLoaded<LocalTime>(
                new TeaQLNotLoadedError(path.markMissing(), 'required_time'),
            );
        }
        return new ValueExpression<LocalTime>(this.value.requiredTime);
    }

    optionalTime(): ValueExpression<LocalTime | null> {
        const path = this.path.member('optional_time', 'optionalTime');
        if (this.notLoaded) return ValueExpression.notLoaded<LocalTime | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<LocalTime | null>();
        if (!this.value.isLoaded('optionalTime')) {
            return ValueExpression.notLoaded<LocalTime | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'optional_time'),
            );
        }
        return new ValueExpression<LocalTime | null>(this.value.optionalTime);
    }

    requiredDatetime(): ValueExpression<string> {
        const path = this.path.member('required_datetime', 'requiredDatetime');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('requiredDatetime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'required_datetime'),
            );
        }
        return new ValueExpression<string>(this.value.requiredDatetime);
    }

    optionalDatetime(): ValueExpression<string | null> {
        const path = this.path.member('optional_datetime', 'optionalDatetime');
        if (this.notLoaded) return ValueExpression.notLoaded<string | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | null>();
        if (!this.value.isLoaded('optionalDatetime')) {
            return ValueExpression.notLoaded<string | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'optional_datetime'),
            );
        }
        return new ValueExpression<string | null>(this.value.optionalDatetime);
    }

    createTime(): ValueExpression<string> {
        const path = this.path.member('create_time', 'createTime');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('createTime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'create_time'),
            );
        }
        return new ValueExpression<string>(this.value.createTime);
    }

    updateTime(): ValueExpression<string> {
        const path = this.path.member('update_time', 'updateTime');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('updateTime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'update_time'),
            );
        }
        return new ValueExpression<string>(this.value.updateTime);
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

    typePlatformId(): ValueExpression<string | number> {
        const path = this.path.member('type_platform', 'typePlatformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('typePlatform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'type_platform'),
            );
        }
        const reference = this.value.typePlatform;
        return new ValueExpression<string | number>(
            reference instanceof TypePlatform
                ? reference.id : reference as string | number | undefined,
        );
    }

    typePlatform(): TypePlatformExpression {
        const path = this.path.member('type_platform', 'typePlatform');
        if (this.notLoaded) {
            return new TypePlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new TypePlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('typePlatform')) {
            return new TypePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'type_platform'));
        }
        const relation = this.value.typePlatform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof TypePlatform)) {
            return new TypePlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'type_platform'));
        }
        const target = relation instanceof TypePlatform ? relation : undefined;
        return new TypePlatformExpression(target, this.root, path);
    }

}

export class TypePlatformListExpression {
    constructor(
        private readonly items: readonly TypePlatform[],
        private readonly root = 'TypePlatform(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'PascalCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'PascalCase')): TypePlatformListExpression {
        return new TypePlatformListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): TypePlatformExpression {
        return this.item(0, true);
    }

    get(index: number): TypePlatformExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): TypePlatformExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new TypePlatformExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new TypePlatformExpression(undefined, this.root, itemPath)
            : new TypePlatformExpression(this.items[index], this.root, itemPath);
    }
}

export class ScalarTypeProbeListExpression {
    constructor(
        private readonly items: readonly ScalarTypeProbe[],
        private readonly root = 'ScalarTypeProbe(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'PascalCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'PascalCase')): ScalarTypeProbeListExpression {
        return new ScalarTypeProbeListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): ScalarTypeProbeExpression {
        return this.item(0, true);
    }

    get(index: number): ScalarTypeProbeExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): ScalarTypeProbeExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new ScalarTypeProbeExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new ScalarTypeProbeExpression(undefined, this.root, itemPath)
            : new ScalarTypeProbeExpression(this.items[index], this.root, itemPath);
    }
}

export class E {
    static typePlatform(
        value: TypePlatform | null | undefined,
    ): TypePlatformExpression {
        return new TypePlatformExpression(
            value, 'TypePlatform', ExpressionPath.root('E.typePlatform(<root>)', 'PascalCase'),
        );
    }

    static scalarTypeProbe(
        value: ScalarTypeProbe | null | undefined,
    ): ScalarTypeProbeExpression {
        return new ScalarTypeProbeExpression(
            value, 'ScalarTypeProbe', ExpressionPath.root('E.scalarTypeProbe(<root>)', 'PascalCase'),
        );
    }
}