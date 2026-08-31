"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeModule = exports.mergeRuntimeBootstrap = void 0;
function mergeRuntimeBootstrap(left, right) {
    const leftRoot = left.defaultDomainRoot;
    const rightRoot = right.defaultDomainRoot;
    if (leftRoot && rightRoot &&
        (leftRoot.entity !== rightRoot.entity || leftRoot.id !== rightRoot.id)) {
        throw new Error('Cannot compose Runtime Modules with different Default Domain Roots');
    }
    const constants = new Map();
    for (const value of [...(left.constants ?? []), ...(right.constants ?? [])]) {
        constants.set(`${value.entity}:${value.id}`, value);
    }
    return {
        defaultDomainRoot: rightRoot ?? leftRoot,
        constants: [...constants.values()],
        ensure: left.ensure && right.ensure
            ? async (context) => { await left.ensure(context); await right.ensure(context); }
            : right.ensure ?? left.ensure,
    };
}
exports.mergeRuntimeBootstrap = mergeRuntimeBootstrap;
/** Passive, immutable metadata manifest. It never creates or alters database tables. */
class RuntimeModule {
    constructor(schemas = {}, checkers = {}, bootstrap = {}) {
        this.schemas = Object.freeze({ ...schemas });
        this.checkers = Object.freeze({ ...checkers });
        this.bootstrap = Object.freeze({
            defaultDomainRoot: bootstrap.defaultDomainRoot,
            constants: Object.freeze([...(bootstrap.constants ?? [])]),
            ensure: bootstrap.ensure,
        });
    }
    and(other) {
        return new RuntimeModule({ ...this.schemas, ...other.schemas }, { ...this.checkers, ...other.checkers }, mergeRuntimeBootstrap(this.bootstrap, other.bootstrap));
    }
}
exports.RuntimeModule = RuntimeModule;
//# sourceMappingURL=runtime-module.js.map