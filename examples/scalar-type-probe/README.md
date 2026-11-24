# Freight quote settlement

The TypeScript console creates three quotes, revises an offshore rate and
queries the exact total. The generated Q and E APIs show how Decimal, shipment
numbers, delivery dates and wall-clock times survive a SQLite round trip.
A package count outside the modeled Integer domain fails before mutation SQL.
Optional instructions distinguish null, empty and unselected values.

`freight-quote.xml` defines the model. `typescript-node-lib-core` is the
generated domain library and `typescript-app-console` is the generated
workspace. From the runtime root, run `npm ci` and `npm run build`, then
`bash examples/scalar-type-probe/verify-freight-quotes.sh`. The verifier runs
the console twice on the same SQLite file and retains the original scalar
calibration, including its file and SQLite Integer boundary checks.
