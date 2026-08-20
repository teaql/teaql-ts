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
        super(...data);
        Object.setPrototypeOf(this, SmartList.prototype);
        this.totalCount = options.totalCount;
        this.aggregations = options.aggregations ?? {};
        this.summary = options.summary ?? {};
        this.facets = options.facets ?? {};
        this.isLoaded = options.isLoaded ?? true;
    }
    static empty() {
        return new SmartList([], { isLoaded: false });
    }
    get data() {
        return this;
    }
    withTotalCount(totalCount) {
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
}
exports.SmartList = SmartList;
//# sourceMappingURL=smart-list.js.map