# School showcase ownership

Follow [typescript-app-console/AGENTS.md](typescript-app-console/AGENTS.md).
`model.xml` owns the School domain, the generated `typescript-lib-core` is
read-only, and business code lives in `typescript-app-console`. The constant
reconciliation variant uses `model-reconciled.xml` and explicitly owned native
scopes inside the parent workspace. See `showcase.json` for provenance.
