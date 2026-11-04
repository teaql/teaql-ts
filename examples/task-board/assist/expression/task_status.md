<!-- ephemeral -->

# TypeScript Assist — Expression `Task Status`

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
import { TaskStatus } from './models/TaskStatus';

export function extractId(entity: TaskStatus) {
    return E.taskStatus(entity).id().eval();
}

export function extractIdOrElse(
    entity: TaskStatus, fallback: NonNullable<TaskStatus['id']>,
) {
    return E.taskStatus(entity).id().orElse(fallback);
}

export function extractName(entity: TaskStatus) {
    return E.taskStatus(entity).name().eval();
}

export function extractNameOrElse(
    entity: TaskStatus, fallback: NonNullable<TaskStatus['name']>,
) {
    return E.taskStatus(entity).name().orElse(fallback);
}

export function extractCode(entity: TaskStatus) {
    return E.taskStatus(entity).code().eval();
}

export function extractCodeOrElse(
    entity: TaskStatus, fallback: NonNullable<TaskStatus['code']>,
) {
    return E.taskStatus(entity).code().orElse(fallback);
}

export function extractColor(entity: TaskStatus) {
    return E.taskStatus(entity).color().eval();
}

export function extractColorOrElse(
    entity: TaskStatus, fallback: NonNullable<TaskStatus['color']>,
) {
    return E.taskStatus(entity).color().orElse(fallback);
}

export function extractDisplayOrder(entity: TaskStatus) {
    return E.taskStatus(entity).displayOrder().eval();
}

export function extractDisplayOrderOrElse(
    entity: TaskStatus, fallback: NonNullable<TaskStatus['displayOrder']>,
) {
    return E.taskStatus(entity).displayOrder().orElse(fallback);
}

export function extractProgress(entity: TaskStatus) {
    return E.taskStatus(entity).progress().eval();
}

export function extractProgressOrElse(
    entity: TaskStatus, fallback: NonNullable<TaskStatus['progress']>,
) {
    return E.taskStatus(entity).progress().orElse(fallback);
}

export function extractVersion(entity: TaskStatus) {
    return E.taskStatus(entity).version().eval();
}

export function extractVersionOrElse(
    entity: TaskStatus, fallback: NonNullable<TaskStatus['version']>,
) {
    return E.taskStatus(entity).version().orElse(fallback);
}

export function extractPlatformId(entity: TaskStatus) {
    return E.taskStatus(entity).platformId().eval();
}

export function traversePlatform(entity: TaskStatus) {
    return E.taskStatus(entity).platform().eval();
}

export function aggregateTaskListSize(entity: TaskStatus) {
    return E.taskStatus(entity).taskList().size().eval();
}

export function firstTaskListId(entity: TaskStatus) {
    return E.taskStatus(entity).taskList().first().id().eval();
}

export function getTaskListId(entity: TaskStatus, index: number) {
    return E.taskStatus(entity).taskList().get(index).id().eval();
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
