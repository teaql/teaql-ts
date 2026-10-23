import { JsonFieldNamingProfile, ObjectLocation, ObjectLocationSegment } from './object-location';

type Step = Readonly<{ call: string; location: ObjectLocation; traverses: boolean }>;
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
  suggestedFix: Readonly<{ action: 'preload'; location: readonly ObjectLocationSegment[] }>;
}>;

/** Generated native calls and canonical locations are recorded separately from values. */
export class ExpressionPath {
  private constructor(
    private readonly rootExpression: string,
    readonly profile: JsonFieldNamingProfile,
    readonly location: ObjectLocation,
    private readonly steps: readonly Step[],
    private readonly missing?: number,
  ) {}
  static root(expression: string, profile: JsonFieldNamingProfile = 'camelCase'): ExpressionPath {
    return new ExpressionPath(expression, profile, ObjectLocation.root(), []);
  }
  member(name: string, method: string): ExpressionPath {
    return this.append(`${method}()`, this.location.property(name), true);
  }
  index(index: number, first = false): ExpressionPath {
    return this.append(first ? 'first()' : `get(${index})`, this.location.index(index), true);
  }
  operation(call: string): ExpressionPath { return this.append(call, this.location, false); }
  private append(call: string, location: ObjectLocation, traverses: boolean): ExpressionPath {
    return new ExpressionPath(this.rootExpression, this.profile, location,
      [...this.steps, { call, location, traverses }], this.missing);
  }
  markMissing(): ExpressionPath {
    return new ExpressionPath(this.rootExpression, this.profile, this.location, this.steps,
      this.missing ?? this.steps.length - 1);
  }
  withFailureFrom(failed: ExpressionPath): ExpressionPath {
    return new ExpressionPath(this.rootExpression, this.profile, this.location, this.steps, failed.missing);
  }
  render(broken = false): string {
    return this.rootExpression + this.steps.map((step, index) =>
      `.${step.call}${broken && index === this.missing ? '<broken>' : ''}`).join('');
  }
  diagnostic(fallback: string): NotLoadedDiagnostic {
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

export class TeaQLNotLoadedError extends Error {
  readonly details: NotLoadedDiagnostic;
  constructor(readonly path: ExpressionPath, readonly breakPoint: string) {
    const details = path.diagnostic(breakPoint);
    super(JSON.stringify(details));
    this.name = 'TeaQLNotLoadedError';
    this.details = details;
  }
  withPath(path: ExpressionPath): TeaQLNotLoadedError {
    return new TeaQLNotLoadedError(path.withFailureFrom(this.path), this.breakPoint);
  }
  terminal(call: string): TeaQLNotLoadedError {
    return new TeaQLNotLoadedError(this.path.operation(call), this.breakPoint);
  }
  toWire(): NotLoadedDiagnostic { return this.details; }
}
