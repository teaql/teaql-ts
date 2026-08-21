"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeModule = void 0;
/** Passive, immutable metadata manifest. It never creates or alters database tables. */
class RuntimeModule {
    constructor(schemas = {}, checkers = {}) {
        this.schemas = Object.freeze({ ...schemas });
        this.checkers = Object.freeze({ ...checkers });
    }
    and(other) {
        return new RuntimeModule({ ...this.schemas, ...other.schemas }, { ...this.checkers, ...other.checkers });
    }
}
exports.RuntimeModule = RuntimeModule;
//# sourceMappingURL=runtime-module.js.map