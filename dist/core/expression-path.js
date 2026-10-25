"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeaQLNotLoadedError = exports.ExpressionPath = void 0;
const object_location_1 = require("./object-location");
/** Generated native calls and canonical locations are recorded separately from values. */
class ExpressionPath {
    constructor(rootExpression, profile, location, steps, missing) {
        this.rootExpression = rootExpression;
        this.profile = profile;
        this.location = location;
        this.steps = steps;
        this.missing = missing;
    }
    static root(expression, profile = 'camelCase') {
        return new ExpressionPath(expression, profile, object_location_1.ObjectLocation.root(), []);
    }
    member(name, method) {
        return this.append(`${method}()`, this.location.property(name), true);
    }
    index(index, first = false) {
        return this.append(first ? 'first()' : `get(${index})`, this.location.index(index), true);
    }
    operation(call) { return this.append(call, this.location, false); }
    append(call, location, traverses) {
        return new ExpressionPath(this.rootExpression, this.profile, location, [...this.steps, { call, location, traverses }], this.missing);
    }
    markMissing() {
        return new ExpressionPath(this.rootExpression, this.profile, this.location, this.steps, this.missing ?? this.steps.length - 1);
    }
    withFailureFrom(failed) {
        return new ExpressionPath(this.rootExpression, this.profile, this.location, this.steps, failed.missing);
    }
    render(broken = false) {
        return this.rootExpression + this.steps.map((step, index) => `.${step.call}${broken && index === this.missing ? '<broken>' : ''}`).join('');
    }
    diagnostic(fallback) {
        const failure = this.missing === undefined ? this.location : this.steps[this.missing].location;
        const last = failure.segments[failure.segments.length - 1];
        return {
            code: 'NOT_LOADED', location: failure.segments, instancePath: failure.instancePath(this.profile),
            breakPoint: last?.kind === 'property' ? last.name : fallback,
            attemptedLocation: this.location.segments, attemptedInstancePath: this.location.instancePath(this.profile),
            breakPointIndex: Math.max(0, failure.segments.length - 1),
            originalExpression: this.render(), expressionWithBrokenPoint: this.render(true),
            suggestedFix: { action: 'preload', location: failure.segments },
        };
    }
}
exports.ExpressionPath = ExpressionPath;
class TeaQLNotLoadedError extends Error {
    constructor(path, breakPoint) {
        const details = path.diagnostic(breakPoint);
        const location = details.location.reduce((current, segment) => segment.kind === 'index'
            ? current.index(segment.index) : current.property(segment.name), object_location_1.ObjectLocation.root());
        super(`TeaQLNotLoadedError: access_path=${location.nativePath()} break_point=${details.breakPoint}` +
            ` — select the missing field or relation expression=${details.expressionWithBrokenPoint}`);
        this.path = path;
        this.breakPoint = breakPoint;
        this.name = 'TeaQLNotLoadedError';
        this.details = details;
    }
    withPath(path) {
        return new TeaQLNotLoadedError(path.withFailureFrom(this.path), this.breakPoint);
    }
    terminal(call) {
        return new TeaQLNotLoadedError(this.path.operation(call), this.breakPoint);
    }
    toWire() { return this.details; }
}
exports.TeaQLNotLoadedError = TeaQLNotLoadedError;
//# sourceMappingURL=expression-path.js.map