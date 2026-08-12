"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserContext = void 0;
class UserContext {
    constructor() {
        this.resources = new Map();
    }
    insertResource(name, resource) {
        this.resources.set(name, resource);
        return this;
    }
    getResource(name) {
        return this.resources.get(name);
    }
    requireResource(name) {
        const resource = this.getResource(name);
        if (resource === undefined) {
            throw new Error(`Required UserContext resource is missing: ${name}`);
        }
        return resource;
    }
}
exports.UserContext = UserContext;
//# sourceMappingURL=context.js.map