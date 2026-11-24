import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { Catalog } from './models/Catalog';
import { Entry } from './models/Entry';
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

export class CatalogExpression {
    constructor(
        private readonly value: Catalog | null | undefined,
        private readonly root = 'Catalog(null)',
        private readonly path = ExpressionPath.root('E.catalog(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Catalog | null | undefined {
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



    entryList(): EntryListExpression {
        const path = this.path.member('entry_list', 'entryList');
        if (this.notLoaded) {
            return new EntryListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return EntryListExpression.missing(this.root, path);
        if (!this.value.isLoaded('entryList')) {
            return new EntryListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'entry_list'));
        }
        return new EntryListExpression(
            this.value.entryList(), this.root, path,
        );
    }
}

export class EntryExpression {
    constructor(
        private readonly value: Entry | null | undefined,
        private readonly root = 'Entry(null)',
        private readonly path = ExpressionPath.root('E.entry(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Entry | null | undefined {
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

    bornAt(): ValueExpression<string> {
        const path = this.path.member('born_at', 'bornAt');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('bornAt')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'born_at'),
            );
        }
        return new ValueExpression<string>(this.value.bornAt);
    }

    touchedAt(): ValueExpression<string> {
        const path = this.path.member('touched_at', 'touchedAt');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('touchedAt')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'touched_at'),
            );
        }
        return new ValueExpression<string>(this.value.touchedAt);
    }

    sourceIp(): ValueExpression<string> {
        const path = this.path.member('source_ip', 'sourceIp');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('sourceIp')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'source_ip'),
            );
        }
        return new ValueExpression<string>(this.value.sourceIp);
    }

    lastIp(): ValueExpression<string> {
        const path = this.path.member('last_ip', 'lastIp');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('lastIp')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'last_ip'),
            );
        }
        return new ValueExpression<string>(this.value.lastIp);
    }

    openedBy(): ValueExpression<string> {
        const path = this.path.member('opened_by', 'openedBy');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('openedBy')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'opened_by'),
            );
        }
        return new ValueExpression<string>(this.value.openedBy);
    }

    changedBy(): ValueExpression<string> {
        const path = this.path.member('changed_by', 'changedBy');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('changedBy')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'changed_by'),
            );
        }
        return new ValueExpression<string>(this.value.changedBy);
    }

    guardedToken(): ValueExpression<string> {
        const path = this.path.member('guarded_token', 'guardedToken');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('guardedToken')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'guarded_token'),
            );
        }
        return new ValueExpression<string>(this.value.guardedToken);
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

    catalogId(): ValueExpression<string | number> {
        const path = this.path.member('catalog', 'catalogId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('catalog')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'catalog'),
            );
        }
        const reference = this.value.catalog;
        return new ValueExpression<string | number>(
            reference instanceof Catalog
                ? reference.id : reference as string | number | undefined,
        );
    }

    catalog(): CatalogExpression {
        const path = this.path.member('catalog', 'catalog');
        if (this.notLoaded) {
            return new CatalogExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new CatalogExpression(undefined, this.root, path);
        if (!this.value.isLoaded('catalog')) {
            return new CatalogExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'catalog'));
        }
        const relation = this.value.catalog;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Catalog)) {
            return new CatalogExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'catalog'));
        }
        const target = relation instanceof Catalog ? relation : undefined;
        return new CatalogExpression(target, this.root, path);
    }

}

export class CatalogListExpression {
    constructor(
        private readonly items: readonly Catalog[],
        private readonly root = 'Catalog(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): CatalogListExpression {
        return new CatalogListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): CatalogExpression {
        return this.item(0, true);
    }

    get(index: number): CatalogExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): CatalogExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new CatalogExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new CatalogExpression(undefined, this.root, itemPath)
            : new CatalogExpression(this.items[index], this.root, itemPath);
    }
}

export class EntryListExpression {
    constructor(
        private readonly items: readonly Entry[],
        private readonly root = 'Entry(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): EntryListExpression {
        return new EntryListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): EntryExpression {
        return this.item(0, true);
    }

    get(index: number): EntryExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): EntryExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new EntryExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new EntryExpression(undefined, this.root, itemPath)
            : new EntryExpression(this.items[index], this.root, itemPath);
    }
}

export class E {
    static catalog(
        value: Catalog | null | undefined,
    ): CatalogExpression {
        return new CatalogExpression(
            value, 'Catalog', ExpressionPath.root('E.catalog(<root>)', 'camelCase'),
        );
    }

    static entry(
        value: Entry | null | undefined,
    ): EntryExpression {
        return new EntryExpression(
            value, 'Entry', ExpressionPath.root('E.entry(<root>)', 'camelCase'),
        );
    }
}