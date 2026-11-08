<!-- ephemeral -->

# TypeScript Assist — Expression `Scalar Type Probe`

The generated E facade preserves Value, loaded null/undefined, and NotLoaded.
`eval()` returns a native value for the first two and throws
`TeaQLNotLoadedError` for the third. `orElse` is nullish-only and never hides
NotLoaded.

Use the error's `toWire()` for structured diagnostics: `location` is the first
missing canonical path; `attemptedLocation` retains the full suffix and real
list indices. `expressionWithBrokenPoint` marks one `<broken>` in the complete
native chain. Use `suggestedFix.location` with Q Assist; never parse the message
or guess a preload method.

```typescript
import { E } from './E';
import { ScalarTypeProbe } from './models/ScalarTypeProbe';

export function extractId(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).id().eval();
}

export function extractIdOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['id']>,
) {
    return E.scalarTypeProbe(entity).id().orElse(fallback);
}

export function extractRequiredString(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).requiredString().eval();
}

export function extractRequiredStringOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['requiredString']>,
) {
    return E.scalarTypeProbe(entity).requiredString().orElse(fallback);
}

export function extractOptionalString(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).optionalString().eval();
}

export function extractOptionalStringOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['optionalString']>,
) {
    return E.scalarTypeProbe(entity).optionalString().orElse(fallback);
}

export function extractLargeText(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).largeText().eval();
}

export function extractLargeTextOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['largeText']>,
) {
    return E.scalarTypeProbe(entity).largeText().orElse(fallback);
}

export function extractRequiredBoolean(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).requiredBoolean().eval();
}

export function extractRequiredBooleanOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['requiredBoolean']>,
) {
    return E.scalarTypeProbe(entity).requiredBoolean().orElse(fallback);
}

export function extractOptionalBoolean(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).optionalBoolean().eval();
}

export function extractOptionalBooleanOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['optionalBoolean']>,
) {
    return E.scalarTypeProbe(entity).optionalBoolean().orElse(fallback);
}

export function extractRequiredInteger(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).requiredInteger().eval();
}

export function extractRequiredIntegerOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['requiredInteger']>,
) {
    return E.scalarTypeProbe(entity).requiredInteger().orElse(fallback);
}

export function extractOptionalInteger(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).optionalInteger().eval();
}

export function extractOptionalIntegerOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['optionalInteger']>,
) {
    return E.scalarTypeProbe(entity).optionalInteger().orElse(fallback);
}

export function extractRequiredLong(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).requiredLong().eval();
}

export function extractRequiredLongOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['requiredLong']>,
) {
    return E.scalarTypeProbe(entity).requiredLong().orElse(fallback);
}

export function extractOptionalLong(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).optionalLong().eval();
}

export function extractOptionalLongOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['optionalLong']>,
) {
    return E.scalarTypeProbe(entity).optionalLong().orElse(fallback);
}

export function extractRequiredDecimal(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).requiredDecimal().eval();
}

export function extractRequiredDecimalOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['requiredDecimal']>,
) {
    return E.scalarTypeProbe(entity).requiredDecimal().orElse(fallback);
}

export function extractOptionalDecimal(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).optionalDecimal().eval();
}

export function extractOptionalDecimalOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['optionalDecimal']>,
) {
    return E.scalarTypeProbe(entity).optionalDecimal().orElse(fallback);
}

export function extractRequiredFloat(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).requiredFloat().eval();
}

export function extractRequiredFloatOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['requiredFloat']>,
) {
    return E.scalarTypeProbe(entity).requiredFloat().orElse(fallback);
}

export function extractOptionalFloat(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).optionalFloat().eval();
}

export function extractOptionalFloatOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['optionalFloat']>,
) {
    return E.scalarTypeProbe(entity).optionalFloat().orElse(fallback);
}

export function extractRequiredDouble(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).requiredDouble().eval();
}

export function extractRequiredDoubleOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['requiredDouble']>,
) {
    return E.scalarTypeProbe(entity).requiredDouble().orElse(fallback);
}

export function extractOptionalDouble(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).optionalDouble().eval();
}

export function extractOptionalDoubleOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['optionalDouble']>,
) {
    return E.scalarTypeProbe(entity).optionalDouble().orElse(fallback);
}

export function extractRequiredDate(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).requiredDate().eval();
}

export function extractRequiredDateOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['requiredDate']>,
) {
    return E.scalarTypeProbe(entity).requiredDate().orElse(fallback);
}

export function extractOptionalDate(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).optionalDate().eval();
}

export function extractOptionalDateOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['optionalDate']>,
) {
    return E.scalarTypeProbe(entity).optionalDate().orElse(fallback);
}

export function extractRequiredTime(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).requiredTime().eval();
}

export function extractRequiredTimeOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['requiredTime']>,
) {
    return E.scalarTypeProbe(entity).requiredTime().orElse(fallback);
}

export function extractOptionalTime(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).optionalTime().eval();
}

export function extractOptionalTimeOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['optionalTime']>,
) {
    return E.scalarTypeProbe(entity).optionalTime().orElse(fallback);
}

export function extractRequiredDatetime(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).requiredDatetime().eval();
}

export function extractRequiredDatetimeOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['requiredDatetime']>,
) {
    return E.scalarTypeProbe(entity).requiredDatetime().orElse(fallback);
}

export function extractOptionalDatetime(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).optionalDatetime().eval();
}

export function extractOptionalDatetimeOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['optionalDatetime']>,
) {
    return E.scalarTypeProbe(entity).optionalDatetime().orElse(fallback);
}

export function extractCreateTime(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).createTime().eval();
}

export function extractCreateTimeOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['createTime']>,
) {
    return E.scalarTypeProbe(entity).createTime().orElse(fallback);
}

export function extractUpdateTime(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).updateTime().eval();
}

export function extractUpdateTimeOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['updateTime']>,
) {
    return E.scalarTypeProbe(entity).updateTime().orElse(fallback);
}

export function extractVersion(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).version().eval();
}

export function extractVersionOrElse(
    entity: ScalarTypeProbe, fallback: NonNullable<ScalarTypeProbe['version']>,
) {
    return E.scalarTypeProbe(entity).version().orElse(fallback);
}

export function extractTypePlatformId(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).typePlatformId().eval();
}

export function traverseTypePlatform(entity: ScalarTypeProbe) {
    return E.scalarTypeProbe(entity).typePlatform().eval();
}


```

Select every traversed field and relation. Never catch
`TeaQLNotLoadedError` merely to supply a default, and never replace generated E
accessors with optional chaining.


---

## TeaQL seven-language assist contract

Apply the verified Rust semantic ceiling while using only the exact TYPESCRIPT generated and
runtime APIs. Discover APIs through the generated application AGENTS.md and progressive
model-aware Assist. Do not inspect generated domain-library source.

- Do not create plurals by appending `s` or `es`; use the centralized generated plural.
- Human and non-human entities use different generated predicate vocabularies. Preserve
  forms such as “who are active” and “whose email is”; never infer them from English.
- Configure filters, projection, paging, and other query options before `purpose(...)`.
  Comment may appear anywhere in the chain. Purpose enters the executable stage; execution
  requires both values, but comment does not have to immediately precede purpose.
- Every execute/list/stream and every save accepts exactly one context argument:
  `UserContext`. Name that argument `context`, never `runtime`; data services and global
  policy are injected when the context is built. Reserve `runtime` for process-level
  runtime ownership, provider/pool setup, and module assembly.
- Tenant, merchant, identity, permissions, request policy, purpose policy, hard limit,
  and continuous-page cursor policy come only from trusted context, never dynamic JSON or TFP.
- If the required operation is absent after current entity/action and required field
  Assist, stop that path and report MISSING_ASSIST. Do not guess an API or search the
  generated library as a fallback.
- Create each application-owned source file once. After its first compile attempt,
  repair only the smallest block identified by the exact compiler or test diagnostic.
  Preserve unrelated code; do not rewrite the complete file as an error-recovery loop.
- Before a repair that would replace more than 25% of an existing application file,
  stop and report LARGE_REWRITE_REQUEST with the file, exact diagnostic, reason, and
  estimated scope. Initial creation and model-driven regeneration are not repairs.

Capability: `expression`.

- Distinguish a loaded null from a field or relation that was not projected. A
  NotLoaded/coding error must remain visible; do not turn it into an ordinary null.
- Select every traversed relation first and use the generated E/expression API for
  scalar, object, and list traversal. Do not translate Java accessor names by guess.
