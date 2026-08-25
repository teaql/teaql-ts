# Ensure Schema Bootstrap

This is the smallest executable TypeScript example of TeaQL's explicit schema
and system-bootstrap contract.

It proves that:

- installing a `RuntimeModule` is passive;
- explicit `ensureSchema()` creates the Default Domain Root `Platform(1)`;
- the same call creates or reconciles generated constants;
- a second call is idempotent;
- an additional Platform is allocated without a hard-coded ID and becomes an
  Isolated Domain Root for another Data Graph.

The bootstrap manifest in `app.ts` stands in for generated metadata. Ordinary
sample business data does not belong in this manifest.

```bash
npm install
npm start
npm start # demonstrates restart idempotency
```

The SQLite database is written to `.local/bootstrap.sqlite`.
