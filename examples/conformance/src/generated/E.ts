import { Platform } from './models/Platform';
import { WorkItem } from './models/WorkItem';

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



    workItemList(): WorkItemListExpression {
        const path = expressionPath(this.path, 'workItemList');
        if (this.notLoaded) {
            return new WorkItemListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value) return WorkItemListExpression.missing(this.root, path);
        if (!this.value.isLoaded('workItemList')) {
            return new WorkItemListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(this.root, path, 'workItemList'));
        }
        return new WorkItemListExpression(
            this.value.workItemList(), this.root, path,
        );
    }
}

export class WorkItemExpression {
    constructor(
        private readonly value: WorkItem | null | undefined,
        private readonly root = 'WorkItem(null)',
        private readonly path = '',
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): WorkItem | null | undefined {
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

    title(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'title');
        if (!this.value.isLoaded('title')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'title'),
            );
        }
        return new ValueExpression<string>(this.value.title);
    }

    description(): ValueExpression<string> {
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded);
        if (!this.value) return ValueExpression.missing<string>();
        const path = expressionPath(this.path, 'description');
        if (!this.value.isLoaded('description')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(this.root, path, 'description'),
            );
        }
        return new ValueExpression<string>(this.value.description);
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

export class WorkItemListExpression {
    constructor(
        private readonly items: readonly WorkItem[],
        private readonly root = 'WorkItem(null)',
        private readonly path = '',
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ''): WorkItemListExpression {
        return new WorkItemListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded);
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): WorkItemExpression {
        return this.get(0);
    }

    get(index: number): WorkItemExpression {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new WorkItemExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new WorkItemExpression(undefined, this.root, itemPath)
            : new WorkItemExpression(this.items[index], this.root, itemPath);
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

    static workItem(
        value: WorkItem | null | undefined,
    ): WorkItemExpression {
        return new WorkItemExpression(
            value, `WorkItem(id=${value?.id ?? 'null'})`,
        );
    }
}