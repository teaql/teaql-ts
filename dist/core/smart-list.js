"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartList = void 0;
/**
 * TeaQL's typed list boundary. Besides array ergonomics it preserves query
 * metadata so adding facets, summaries, or totals does not require an API change.
 */
class SmartList extends Array {
    static get [Symbol.species]() {
        return Array;
    }
    constructor(data = [], options = {}) {
        super();
        if (typeof data === 'number')
            this.length = data;
        else
            for (const item of data)
                super.push(item);
        Object.setPrototypeOf(this, SmartList.prototype);
        if (options.totalCount !== undefined)
            validateCount(options.totalCount);
        this.totalCount = options.totalCount;
        // Constructor metadata is owned recursively; entity row references are retained.
        this.aggregations = cloneMetadata(options.aggregations ?? {});
        this.summary = cloneMetadata(options.summary ?? {});
        this.facets = cloneMetadata(options.facets ?? {});
        this.isLoaded = options.isLoaded ?? true;
    }
    static empty() {
        return new SmartList([], { isLoaded: false });
    }
    get data() {
        return this;
    }
    withTotalCount(totalCount) {
        validateCount(totalCount);
        this.totalCount = totalCount;
        return this;
    }
    withFacet(name, facet) {
        this.facets[name] = facet;
        return this;
    }
    facet(name) {
        return this.facets[name];
    }
    totalCountOrLength() {
        return this.totalCount ?? this.length;
    }
    /** Native map/filter return Array; these dedicated operations return SmartList. */
    mapSmart(mapper) {
        return new SmartList(Array.from(this, mapper), {
            totalCount: this.totalCount, aggregations: this.aggregations,
            summary: this.summary, facets: this.facets, isLoaded: this.isLoaded,
        });
    }
    filterSmart(predicate) {
        return new SmartList(this.filter(predicate), { isLoaded: this.isLoaded });
    }
    flatMapSmart(mapper) {
        return new SmartList(this.flatMap((item, index) => Array.from(mapper(item, index))), { isLoaded: this.isLoaded });
    }
    get(index) {
        return Number.isInteger(index) && index >= 0 && index < this.length ? this[index] : undefined;
    }
    set(index, value) {
        if (!Number.isInteger(index) || index < 0 || index >= this.length)
            return false;
        this[index] = value;
        return true;
    }
    first() { return this.get(0); }
    last() { return this.get(this.length - 1); }
    mergeBy(incoming, key) {
        const positions = new Map();
        this.forEach((item, index) => positions.set(key(item), index));
        for (const item of incoming) {
            const itemKey = key(item), position = positions.get(itemKey);
            if (position !== undefined)
                this[position] = item;
            else {
                positions.set(itemKey, this.length);
                this.push(item);
            }
        }
    }
    identityMap(key) {
        return new Map(Array.from(this, item => [key(item), item]));
    }
    groupBy(key) {
        const groups = new Map();
        for (const item of this) {
            const itemKey = key(item), values = groups.get(itemKey) ?? [];
            values.push(item);
            groups.set(itemKey, values);
        }
        return groups;
    }
    ids() {
        return Array.from(this, item => item.id ?? null);
    }
    mapById() {
        const result = new Map();
        for (const item of this)
            if (item.id !== undefined && item.id !== null)
                result.set(item.id, item);
        return result;
    }
    versions() {
        return Array.from(this, item => item.version ?? null);
    }
    removeFacet(name) {
        const result = this.facets[name];
        delete this.facets[name];
        return result;
    }
    takeFacets() {
        const result = this.facets;
        this.facets = {};
        return result;
    }
}
exports.SmartList = SmartList;
function validateCount(count) {
    if (!Number.isSafeInteger(count) || count < 0)
        throw new RangeError('totalCount must be an exact non-negative safe integer');
}
function cloneMetadata(value) {
    if (value instanceof SmartList)
        return value.mapSmart(cloneMetadata);
    if (value instanceof Date)
        return new Date(value.getTime());
    if (Array.isArray(value))
        return value.map(cloneMetadata);
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneMetadata(item)]));
    }
    return value;
}
//# sourceMappingURL=smart-list.js.map