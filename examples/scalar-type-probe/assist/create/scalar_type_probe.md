<!-- ephemeral -->

# TypeScript Assist — Create `Scalar Type Probe`

Use the exact generated `Q.scalarTypeProbes()` entry point. The
trusted `UserContext` supplies actor, tenant, policy, provider, and audit sink;
none of those values may be accepted from the writable input.

```typescript
import { Decimal, UserContext, decimal } from '../teaql-ts';
import { Q } from './Q';
import { ScalarTypeProbe } from './models/ScalarTypeProbe';

export interface CreateScalarTypeProbeInput {
    typePlatform: string | number;
    requiredString: string;
    optionalString: string;
    largeText: string;
    requiredBoolean: boolean;
    optionalBoolean: boolean;
    requiredInteger: number;
    optionalInteger: number;
    requiredLong: number;
    optionalLong: number;
    requiredDecimal: Decimal;
    optionalDecimal: Decimal;
    requiredFloat: number;
    optionalFloat: number;
    requiredDouble: number;
    optionalDouble: number;
    requiredDate: string;
    optionalDate: string;
    requiredTime: unknown;
    optionalTime: unknown;
    requiredDatetime: string;
    optionalDatetime: string;

}

export async function createScalarTypeProbe(
    input: CreateScalarTypeProbeInput,
    context: UserContext,
): Promise<ScalarTypeProbe> {
    const entity = await Q.scalarTypeProbes()
        .comment('what: initialize Scalar Type Probe')
        .purpose('why: create Scalar Type Probe')
        .newEntity(context);

    entity.updateTypePlatform(input.typePlatform);
    entity.updateRequiredString(input.requiredString);
    entity.updateOptionalString(input.optionalString);
    entity.updateLargeText(input.largeText);
    entity.updateRequiredBoolean(input.requiredBoolean);
    entity.updateOptionalBoolean(input.optionalBoolean);
    entity.updateRequiredInteger(input.requiredInteger);
    entity.updateOptionalInteger(input.optionalInteger);
    entity.updateRequiredLong(input.requiredLong);
    entity.updateOptionalLong(input.optionalLong);
    entity.updateRequiredDecimal(input.requiredDecimal);
    entity.updateOptionalDecimal(input.optionalDecimal);
    entity.updateRequiredFloat(input.requiredFloat);
    entity.updateOptionalFloat(input.optionalFloat);
    entity.updateRequiredDouble(input.requiredDouble);
    entity.updateOptionalDouble(input.optionalDouble);
    entity.updateRequiredDate(input.requiredDate);
    entity.updateOptionalDate(input.optionalDate);
    entity.updateRequiredTime(input.requiredTime);
    entity.updateOptionalTime(input.optionalTime);
    entity.updateRequiredDatetime(input.requiredDatetime);
    entity.updateOptionalDatetime(input.optionalDatetime);

    await entity
        .auditAs('Create Scalar Type Probe for the requested business operation')
        .save(context);
    return entity;
}
```

Only the generated updater methods above are writable. Constant relation
candidates, when present, are also generated and must be copied exactly:

For Decimal fields, construct exact values with `decimal('3.50')`. Do not pass a
JavaScript `number`, which can lose digits before the runtime sees it.

Compile the result unchanged. Test persistence and query-back, and prove that
blank/missing intent, blank/missing audit reason, unknown fields, and attempted
trusted-context overrides fail. Do not edit generated sources.


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

Capability: `create`.

- Validate and allow-list writable business fields; never mass-assign dynamic JSON.
- Create through the generated request/entity API, attach a non-empty audit reason,
  save with the same UserContext, and return the runtime's native save result.
- Add a negative test proving a missing audit reason cannot write.
