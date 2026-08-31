import { Platform } from './models/Platform';
import { SchoolType } from './models/SchoolType';
import { School } from './models/School';

export class TeaQLNotLoadedError extends Error {
    readonly details: Record<string, unknown>;

    constructor(
        readonly root: string,
        readonly accessPath: string,
        readonly breakPoint: string,
    ) {
        const suggestedFix = `select${breakPoint.charAt(0).toUpperCase()}${breakPoint.slice(1)}(...)`;
        const details = {
            error: 'TeaQLNotLoadedError',
            root,
            accessPath: accessPath.split('.'),
            breakPoint,
            missingPreload: [breakPoint],
            suggestedFix,
            severity: 'error',
            humanMessage: `访问 ${root}.${accessPath} 时缺少预加载。请在查询中加入 ${suggestedFix}`,
        };
        super(JSON.stringify(details));
        this.name = 'TeaQLNotLoadedError';
        this.details = details;
    }
}

function expressionPath(prefix: string, field: string): string {
    return prefix ? `${prefix}.${field}` : field;
}

export class ValueExpression<T> {
    constructor(
        private readonly value: T | null | undefined,
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing<T>(): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false);
    }

    static notLoaded<T>(error: TeaQLNotLoadedError): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false, error);
    }

    eval(): T | null | undefined {
        if (this.notLoaded) throw this.notLoaded;
        return this.present ? this.value : undefined;
    }

    isPresent(): boolean {
        if (this.notLoaded) throw this.notLoaded;
        return this.present;
    }

    orElse(fallback: T): T {
        const value = this.eval();
        return this.present && value != null ? value : fallback;
    }
}

export class PlatformExpression {
    constructor(
        private readonly value: Platform | null | undefined,
        private readonly root = 'Platform(null)',
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Platform | null | undefined {
        if (this.notLoaded) throw this.notLoaded;
        return this.value;
    }

    id(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'name');
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    baseUrl(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'baseUrl');
        if (!this.value.isLoaded('baseUrl')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'baseUrl'),
            );
        }
        return new ValueExpression<string>(this.value.baseUrl);
    }

    createTime(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'createTime');
        if (!this.value.isLoaded('createTime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'createTime'),
            );
        }
        return new ValueExpression<string>(this.value.createTime);
    }

    updateTime(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'updateTime');
        if (!this.value.isLoaded('updateTime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'updateTime'),
            );
        }
        return new ValueExpression<string>(this.value.updateTime);
    }

    version(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'version'),
            );
        }
        return new ValueExpression<number>(this.value.version);
    }



    schoolTypeList(): SchoolTypeListExpression {
        const path = expressionPath(this.path, 'schoolTypeList');
        if (this.notLoaded) {
            return new SchoolTypeListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return SchoolTypeListExpression.missing(this.root, path);
        if (!this.value.isLoaded('schoolTypeList')) {
            return new SchoolTypeListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'schoolTypeList'));
        }
        return new SchoolTypeListExpression(
            this.value.schoolTypeList(), this.root, path,
        );
    }

    schoolList(): SchoolListExpression {
        const path = expressionPath(this.path, 'schoolList');
        if (this.notLoaded) {
            return new SchoolListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return SchoolListExpression.missing(this.root, path);
        if (!this.value.isLoaded('schoolList')) {
            return new SchoolListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'schoolList'));
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
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): SchoolType | null | undefined {
        if (this.notLoaded) throw this.notLoaded;
        return this.value;
    }

    id(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'name');
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    code(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'code');
        if (!this.value.isLoaded('code')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'code'),
            );
        }
        return new ValueExpression<string>(this.value.code);
    }

    displayOrder(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'displayOrder');
        if (!this.value.isLoaded('displayOrder')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'displayOrder'),
            );
        }
        return new ValueExpression<number>(this.value.displayOrder);
    }

    version(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'version'),
            );
        }
        return new ValueExpression<number>(this.value.version);
    }

    platformId(): ValueExpression<string | number> {
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string | number>();
        const path = expressionPath(this.path, 'platform');
        if (!this.value.isLoaded('platform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(this.root, path, 'platform'),
            );
        }
        return new ValueExpression<string | number>(
            this.value.platform as string | number | undefined,
        );
    }

    platform(): PlatformExpression {
        const path = expressionPath(this.path, 'platform');
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value) return new PlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('platform')) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(this.root, path, 'platform'));
        }
        const relation = this.value.platform;
        const target = relation == null
            ? undefined
            : relation instanceof Platform
                ? relation
                : Platform.fromRecord({ id: relation });
        return new PlatformExpression(target, this.root, path);
    }

    schoolList(): SchoolListExpression {
        const path = expressionPath(this.path, 'schoolList');
        if (this.notLoaded) {
            return new SchoolListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return SchoolListExpression.missing(this.root, path);
        if (!this.value.isLoaded('schoolList')) {
            return new SchoolListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'schoolList'));
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
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): School | null | undefined {
        if (this.notLoaded) throw this.notLoaded;
        return this.value;
    }

    id(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'name');
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    address(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'address');
        if (!this.value.isLoaded('address')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'address'),
            );
        }
        return new ValueExpression<string>(this.value.address);
    }

    establishedDate(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'establishedDate');
        if (!this.value.isLoaded('establishedDate')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'establishedDate'),
            );
        }
        return new ValueExpression<string>(this.value.establishedDate);
    }

    studentCapacity(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'studentCapacity');
        if (!this.value.isLoaded('studentCapacity')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'studentCapacity'),
            );
        }
        return new ValueExpression<number>(this.value.studentCapacity);
    }

    active(): ValueExpression<boolean> {
        if (this.notLoaded) return ValueExpression.notLoaded<boolean>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<boolean>();
        const path = expressionPath(this.path, 'active');
        if (!this.value.isLoaded('active')) {
            return ValueExpression.notLoaded<boolean>(
                new TeaQLNotLoadedError(this.root, path, 'active'),
            );
        }
        return new ValueExpression<boolean>(this.value.active);
    }

    createTime(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'createTime');
        if (!this.value.isLoaded('createTime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'createTime'),
            );
        }
        return new ValueExpression<string>(this.value.createTime);
    }

    updateTime(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'updateTime');
        if (!this.value.isLoaded('updateTime')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'updateTime'),
            );
        }
        return new ValueExpression<string>(this.value.updateTime);
    }

    version(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<number>();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<number>(
                new TeaQLNotLoadedError(this.root, path, 'version'),
            );
        }
        return new ValueExpression<number>(this.value.version);
    }

    platformId(): ValueExpression<string | number> {
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string | number>();
        const path = expressionPath(this.path, 'platform');
        if (!this.value.isLoaded('platform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(this.root, path, 'platform'),
            );
        }
        return new ValueExpression<string | number>(
            this.value.platform as string | number | undefined,
        );
    }

    schoolTypeId(): ValueExpression<string | number> {
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string | number>();
        const path = expressionPath(this.path, 'schoolType');
        if (!this.value.isLoaded('schoolType')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(this.root, path, 'schoolType'),
            );
        }
        return new ValueExpression<string | number>(
            this.value.schoolType as string | number | undefined,
        );
    }

    platform(): PlatformExpression {
        const path = expressionPath(this.path, 'platform');
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value) return new PlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('platform')) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(this.root, path, 'platform'));
        }
        const relation = this.value.platform;
        const target = relation == null
            ? undefined
            : relation instanceof Platform
                ? relation
                : Platform.fromRecord({ id: relation });
        return new PlatformExpression(target, this.root, path);
    }

    schoolType(): SchoolTypeExpression {
        const path = expressionPath(this.path, 'schoolType');
        if (this.notLoaded) {
            return new SchoolTypeExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value) return new SchoolTypeExpression(undefined, this.root, path);
        if (!this.value.isLoaded('schoolType')) {
            return new SchoolTypeExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(this.root, path, 'schoolType'));
        }
        const relation = this.value.schoolType;
        const target = relation == null
            ? undefined
            : relation instanceof SchoolType
                ? relation
                : SchoolType.fromRecord({ id: relation });
        return new SchoolTypeExpression(target, this.root, path);
    }

}

export class PlatformListExpression {
    constructor(
        private readonly items: readonly Platform[],
        private readonly root = 'Platform(null)',
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): PlatformListExpression {
        return new PlatformListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): PlatformExpression {
        return this.get(0);
    }

    get(index: number): PlatformExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, itemPath, this.notLoaded);
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
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): SchoolTypeListExpression {
        return new SchoolTypeListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): SchoolTypeExpression {
        return this.get(0);
    }

    get(index: number): SchoolTypeExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new SchoolTypeExpression(undefined, this.root, itemPath, this.notLoaded);
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
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): SchoolListExpression {
        return new SchoolListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): SchoolExpression {
        return this.get(0);
    }

    get(index: number): SchoolExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new SchoolExpression(undefined, this.root, itemPath, this.notLoaded);
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
            value, `Platform(id=${value?.id ?? 'null'})`,
        );
    }

    static schoolType(
        value: SchoolType | null | undefined,
    ): SchoolTypeExpression {
        return new SchoolTypeExpression(
            value, `SchoolType(id=${value?.id ?? 'null'})`,
        );
    }

    static school(
        value: School | null | undefined,
    ): SchoolExpression {
        return new SchoolExpression(
            value, `School(id=${value?.id ?? 'null'})`,
        );
    }
}