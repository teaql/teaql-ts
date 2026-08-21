"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckException = void 0;
class CheckException extends Error {
    constructor(violations) {
        super(`Check failed: ${violations.map(v => v.message ?? `${v.ruleId}:${v.location}`).join('; ')}`);
        this.violations = violations;
        this.name = 'CheckException';
    }
}
exports.CheckException = CheckException;
//# sourceMappingURL=checker.js.map