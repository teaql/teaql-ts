import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { Platform } from './models/Platform';
import { WorkItem } from './models/WorkItem';
import { ExpressionPath, TeaQLNotLoadedError } from '../teaql-ts';
export { TeaQLNotLoadedError } from '../teaql-ts';

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
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        return this.present ? this.value : undefined;
    }

    isPresent(): boolean {
        if (this.notLoaded) throw this.notLoaded.terminal('isPresent()');
        return this.present;
    }

    orElse(fallback: T): T {
        if (this.notLoaded) throw this.notLoaded.terminal('orElse(<fallback>)');
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



    workItemList(): WorkItemListExpression {
        const path = this.path.member('work_item_list', 'workItemList');
        if (this.notLoaded) {
            return new WorkItemListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return WorkItemListExpression.missing(this.root, path);
        if (!this.value.isLoaded('workItemList')) {
            return new WorkItemListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'work_item_list'));
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
        private readonly path = ExpressionPath.root('E.workItem(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): WorkItem | null | undefined {
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

    title(): ValueExpression<string> {
        const path = this.path.member('title', 'title');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('title')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'title'),
            );
        }
        return new ValueExpression<string>(this.value.title);
    }

    description(): ValueExpression<string | null> {
        const path = this.path.member('description', 'description');
        if (this.notLoaded) return ValueExpression.notLoaded<string | null>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | null>();
        if (!this.value.isLoaded('description')) {
            return ValueExpression.notLoaded<string | null>(
                new TeaQLNotLoadedError(path.markMissing(), 'description'),
            );
        }
        return new ValueExpression<string | null>(this.value.description);
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

export class WorkItemListExpression {
    constructor(
        private readonly items: readonly WorkItem[],
        private readonly root = 'WorkItem(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): WorkItemListExpression {
        return new WorkItemListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): WorkItemExpression {
        return this.item(0, true);
    }

    get(index: number): WorkItemExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): WorkItemExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new WorkItemExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
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
            value, 'Platform', ExpressionPath.root('E.platform(<root>)', 'camelCase'),
        );
    }

    static workItem(
        value: WorkItem | null | undefined,
    ): WorkItemExpression {
        return new WorkItemExpression(
            value, 'WorkItem', ExpressionPath.root('E.workItem(<root>)', 'camelCase'),
        );
    }
}