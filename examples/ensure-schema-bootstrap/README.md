# Start a district school catalog

Installing the generated module registers metadata. The install-only entry
opens an empty SQLite database and verifies that installation issues no SQL.
Explicit schema setup then creates the default district and two school types.
A second ensure preserves their identities and versions. The generated Q APIs
allocate an additional district and register a school under that root.
Reopening the same database reuses both records.

- `model.xml` models the districts, school types and school.
- `typescript-node-lib-core/` holds the generated Node domain library.
- `typescript-app-console/src/main.ts` runs the generated workspace.
- `typescript-app-console/calibration/main.ts` retains the original
  manual bootstrap probe.

Run `npm ci` and `npm run build` in this directory. Set
`TEAQL_SCHEMA_BOOTSTRAP_DB` to a writable SQLite file and use `npm start`.
Set `TEAQL_SCHEMA_BOOTSTRAP_INSTALL_ONLY=1` for the installation-only phase.
The focused gate independently verifies the SQLite table inventory before
ensure and all persisted rows after both launches.
