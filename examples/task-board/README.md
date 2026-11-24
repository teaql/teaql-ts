# Robot task board

Create a robot task, inspect its planned status, rename it and read the attached
execution history. The example calls explicit schema setup twice to reconcile
the platform and four status constants.

- `model.xml` owns the robot task, status and execution-log model.
- `typescript-node-lib-core/` holds the generated domain library.
- `typescript-app-console/src/main.ts` runs the application through generated Q and E.

Run `npm ci`, `npm run build` and `npm run verify` from this directory.
The local verification uses SQLite. It compares the typed and parsed-query
results, history and facets, preserves precise rejection behavior and reruns
against the same database. The second round expects no duplicate task or
status records. The optional HTTP commands are in the package scripts.
