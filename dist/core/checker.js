"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckException = void 0;
class CheckException extends Error {
    constructor(violations) {
        super(`Check failed: ${violations.map(v => v.message ?? `${v.ruleId}:${v.location}`).join('; ')}`);
        this.violations = violations;
        this.name = 'CheckException';
        const owned = [...violations];
        Object.defineProperty(this, 'violations', { value: owned, enumerable: true });
        CheckException.owned.set(this, owned);
    }
    /** @internal Preserve the exception identity when the graph finishes relocation. */
    refreshPresentation(results) {
        const owned = CheckException.owned.get(this);
        if (!owned)
            return;
        if (results.length === owned.length && results.every((result, index) => result.message === owned[index].message))
            return;
        owned.splice(0, owned.length, ...results);
        this.message = `Check failed: ${results.map(v => v.message ?? `${v.ruleId}:${v.location}`).join('; ')}`;
    }
}
exports.CheckException = CheckException;
CheckException.owned = new WeakMap();
//# sourceMappingURL=checker.js.map