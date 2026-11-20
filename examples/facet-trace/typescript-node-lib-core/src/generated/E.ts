import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { Platform } from './models/Platform';
import { SchoolType } from './models/SchoolType';
import { School } from './models/School';
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

    baseUrl(): ValueExpression<string> {
        const path = this.path.member('base_url', 'baseUrl');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('baseUrl')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'base_url'),
            );
        }
        return new ValueExpression<string>(this.value.baseUrl);
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



    schoolTypeList(): SchoolTypeListExpression {
        const path = this.path.member('school_type_list', 'schoolTypeList');
        if (this.notLoaded) {
            return new SchoolTypeListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return SchoolTypeListExpression.missing(this.root, path);
        if (!this.value.isLoaded('schoolTypeList')) {
            return new SchoolTypeListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'school_type_list'));
        }
        return new SchoolTypeListExpression(
            this.value.schoolTypeList(), this.root, path,
        );
    }

    schoolList(): SchoolListExpression {
        const path = this.path.member('school_list', 'schoolList');
        if (this.notLoaded) {
            return new SchoolListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return SchoolListExpression.missing(this.root, path);
        if (!this.value.isLoaded('schoolList')) {
            return new SchoolListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'school_list'));
        }
        return new SchoolListExpression(
            this.value.schoolList(), this.root, path,
        );
    }
}

export class SchoolTypeExpression {
    constructor(
        private readonly value: SchoolType | null | undefined,
        private readonly root = 'SchoolType(null)',
        private readonly path = ExpressionPath.root('E.schoolType(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): SchoolType | null | undefined {
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

    code(): ValueExpression<string> {
        const path = this.path.member('code', 'code');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('code')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'code'),
            );
        }
        return new ValueExpression<string>(this.value.code);
    }

    displayOrder(): ValueExpression<Decimal> {
        const path = this.path.member('display_order', 'displayOrder');
        if (this.notLoaded) return ValueExpression.notLoaded<Decimal>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Decimal>();
        if (!this.value.isLoaded('displayOrder')) {
            return ValueExpression.notLoaded<Decimal>(
                new TeaQLNotLoadedError(path.markMissing(), 'display_order'),
            );
        }
        return new ValueExpression<Decimal>(this.value.displayOrder);
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

    schoolList(): SchoolListExpression {
        const path = this.path.member('school_list', 'schoolList');
        if (this.notLoaded) {
            return new SchoolListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return SchoolListExpression.missing(this.root, path);
        if (!this.value.isLoaded('schoolList')) {
            return new SchoolListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'school_list'));
        }
        return new SchoolListExpression(
            this.value.schoolList(), this.root, path,
        );
    }
}

export class SchoolExpression {
    constructor(
        private readonly value: School | null | undefined,
        private readonly root = 'School(null)',
        private readonly path = ExpressionPath.root('E.school(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): School | null | undefined {
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

    address(): ValueExpression<string> {
        const path = this.path.member('address', 'address');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('address')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'address'),
            );
        }
        return new ValueExpression<string>(this.value.address);
    }

    establishedDate(): ValueExpression<string> {
        const path = this.path.member('established_date', 'establishedDate');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('establishedDate')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'established_date'),
            );
        }
        return new ValueExpression<string>(this.value.establishedDate);
    }

    studentCapacity(): ValueExpression<number> {
        const path = this.path.member('student_capacity', 'studentCapacity');
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<number>();
        if (!this.value.isLoaded('studentCapacity')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(path.markMissing(), 'student_capacity'),
            );
        }
        const error = integer32Error(this.value.studentCapacity, 'School', 'student_capacity');
        if (error) return ValueExpression.invalid<number>(error);
        return new ValueExpression<number>(this.value.studentCapacity);
    }

    active(): ValueExpression<boolean> {
        const path = this.path.member('active', 'active');
        if (this.notLoaded) return ValueExpression.notLoaded<boolean>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<boolean>();
        if (!this.value.isLoaded('active')) {
            return ValueExpression.notLoaded<boolean>(
                new TeaQLNotLoadedError(path.markMissing(), 'active'),
            );
        }
        return new ValueExpression<boolean>(this.value.active);
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

    schoolTypeId(): ValueExpression<string | number> {
        const path = this.path.member('school_type', 'schoolTypeId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('schoolType')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'school_type'),
            );
        }
        const reference = this.value.schoolType;
        return new ValueExpression<string | number>(
            reference instanceof SchoolType
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

    schoolType(): SchoolTypeExpression {
        const path = this.path.member('school_type', 'schoolType');
        if (this.notLoaded) {
            return new SchoolTypeExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new SchoolTypeExpression(undefined, this.root, path);
        if (!this.value.isLoaded('schoolType')) {
            return new SchoolTypeExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'school_type'));
        }
        const relation = this.value.schoolType;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof SchoolType)) {
            return new SchoolTypeExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'school_type'));
        }
        const target = relation instanceof SchoolType ? relation : undefined;
        return new SchoolTypeExpression(target, this.root, path);
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

export class SchoolTypeListExpression {
    constructor(
        private readonly items: readonly SchoolType[],
        private readonly root = 'SchoolType(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): SchoolTypeListExpression {
        return new SchoolTypeListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): SchoolTypeExpression {
        return this.item(0, true);
    }

    get(index: number): SchoolTypeExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): SchoolTypeExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new SchoolTypeExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new SchoolTypeExpression(undefined, this.root, itemPath)
            : new SchoolTypeExpression(this.items[index], this.root, itemPath);
    }
}

export class SchoolListExpression {
    constructor(
        private readonly items: readonly School[],
        private readonly root = 'School(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): SchoolListExpression {
        return new SchoolListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): SchoolExpression {
        return this.item(0, true);
    }

    get(index: number): SchoolExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): SchoolExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new SchoolExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new SchoolExpression(undefined, this.root, itemPath)
            : new SchoolExpression(this.items[index], this.root, itemPath);
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

    static schoolType(
        value: SchoolType | null | undefined,
    ): SchoolTypeExpression {
        return new SchoolTypeExpression(
            value, 'SchoolType', ExpressionPath.root('E.schoolType(<root>)', 'camelCase'),
        );
    }

    static school(
        value: School | null | undefined,
    ): SchoolExpression {
        return new SchoolExpression(
            value, 'School', ExpressionPath.root('E.school(<root>)', 'camelCase'),
        );
    }
}