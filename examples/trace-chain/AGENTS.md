# TeaQL TypeScript application rules

This workspace implements `trace-chain-service`. Work in application-owned code;
the generated domain library is read-only.

- Use current `typescript-assist-[action]/[entity]` and required field-level
  `typescript-assist-query/[entity].[field]` for exact APIs. Do not read or search
  generated domain-library source for API discovery. Report `MISSING_ASSIST`
  if current Assist cannot provide an operation; never guess a method name.
- Every query is bounded and has a non-blank comment and purpose. Set projection,
  filter and relation selection before the executable purpose stage.
- Public query execution and save accept only the trusted `UserContext`.
- Only the root graph requires `auditAs(...)`. A child without a local reason
  inherits the root. A child with `auditAs(...)` keeps its additional reason.
- Keep deleted children in the composed graph using `markForDeletion()`, then
  save the root. Do not invent direct delete or low-level graph execution APIs.
- Inject the installed local data service into context. Schema/bootstrap runs
  through `context.ensureSchema()`; reuse the default Domain Root.
- Compile and test application changes. Repair the smallest diagnosed block;
  never rewrite or patch generated source to make a test pass.