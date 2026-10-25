import { JsonFieldNamingProfile, ObjectLocation, ObjectLocationSegment } from './object-location';
export type NotLoadedDiagnostic = Readonly<{
    code: 'NOT_LOADED';
    location: readonly ObjectLocationSegment[];
    instancePath: string;
    breakPoint: string;
    attemptedLocation: readonly ObjectLocationSegment[];
    attemptedInstancePath: string;
    breakPointIndex: number;
    originalExpression: string;
    expressionWithBrokenPoint: string;
    suggestedFix: Readonly<{
        action: 'preload';
        location: readonly ObjectLocationSegment[];
    }>;
}>;
/** Generated native calls and canonical locations are recorded separately from values. */
export declare class ExpressionPath {
    private readonly rootExpression;
    readonly profile: JsonFieldNamingProfile;
    readonly location: ObjectLocation;
    private readonly steps;
    private readonly missing?;
    private constructor();
    static root(expression: string, profile?: JsonFieldNamingProfile): ExpressionPath;
    member(name: string, method: string): ExpressionPath;
    index(index: number, first?: boolean): ExpressionPath;
    operation(call: string): ExpressionPath;
    private append;
    markMissing(): ExpressionPath;
    withFailureFrom(failed: ExpressionPath): ExpressionPath;
    render(broken?: boolean): string;
    diagnostic(fallback: string): NotLoadedDiagnostic;
}
export declare class TeaQLNotLoadedError extends Error {
    readonly path: ExpressionPath;
    readonly breakPoint: string;
    readonly details: NotLoadedDiagnostic;
    constructor(path: ExpressionPath, breakPoint: string);
    withPath(path: ExpressionPath): TeaQLNotLoadedError;
    terminal(call: string): TeaQLNotLoadedError;
    toWire(): NotLoadedDiagnostic;
}
//# sourceMappingURL=expression-path.d.ts.map