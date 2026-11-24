# TeaQL TypeScript application rules

## TeaQL workspace rules

- Work in application-owned files. Keep the generated domain library read-only.
- Discover API names and signatures through model-aware Assist only.
  Do not read or search generated library source for API discovery. Use the
  original evaluated KSML file or directory and its exact entity and field names.
- Ask for the current entity and action first. Request field-level query help
  only for the fields you use. If Assist lacks the operation, report
  `MISSING_ASSIST` with the entity, action, and relevant field or diagnostic.

```text
cargo teaql --input [model] typescript-assist-[action]/[entity]
cargo teaql --input [model] typescript-assist-query/[entity].[field]
```

Replace the bracketed values with the actual model path, action, entity, and
field. Actions include `query`, `list-page`, `create`, `update`, `delete`, and
`expression`. Validate API usage by compiling and testing the application.

- Use the trusted `UserContext` as the only runtime argument for generated query
  execution and saves. Resolve tenant, actor, authorization, and provider
  resources from trusted application setup.
- Keep queries bounded and provide a non-empty purpose and comment. Supply a
  non-empty audit reason for writes through the API shown by Assist.

This workspace implements `trace-chain-service`.

## Application entry and context

Start in `src/main.ts` and configure its `new UserContext()` with the installed
local data service.

- Set projection, filters, and relation selection before the executable purpose
  stage.
- Only the root graph requires `auditAs(...)`. A child without a local reason
  inherits the root. A child with `auditAs(...)` keeps its additional reason.
- Keep deleted children in the composed graph using `markForDeletion()`, then
  save the root. Do not invent direct delete or low-level graph execution APIs.
- Schema/bootstrap runs through `context.ensureSchema()`; reuse the default Domain
  Root.
- Compile and test application changes. Repair the smallest diagnosed block;
  never rewrite or patch generated source to make a test pass.

## Optional standard telemetry

See [STANDARD_TELEMETRY.md](STANDARD_TELEMETRY.md) for the selected runtime's optional module, trusted activation variables and safe startup diagnostics.
