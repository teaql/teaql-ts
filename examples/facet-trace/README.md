# Generated Facet Trace Chain acceptance

Run `bash examples/facet-trace/verify.sh`. It rebuilds this repository's runtime,
uses a `file:../..` dependency, verifies runtime resolution to repository `dist`,
and executes twice on one retained fresh SQLite file without cleanup. The
all-examples gate includes it. All 16 generated library inputs (13 TypeScript
sources plus manifests/i18n) remain unchanged.

The three-object School model isolates `TC-SQL-09` and related privacy: 48
combinations of root/nested/loaded-relation Facets, exact/prefix predicates,
include-all/matched-only, empty/nonempty matches and diagnostic logging on/off.
It asserts typed `SmartList<School>` carriers, loaded-empty versus NotLoaded,
visible limit one versus full count two, exact count/materialization SQL numbers,
ordered inherited paths, logical edge details, original request intent, and
root/future-only private binding redaction. Fixture writes use generated audited
mutation APIs. This fixture does not claim Facet-specific E API traversal.

`FACET_OBSERVED` records real counts, returned Facets and safe execution evidence.
An explicitly installed evidence sink continues collecting safe physical facts
when diagnostic logging is off; the diagnostic sink receives zero events in
that mode. This is not a claim that log-off disables an explicitly requested
evidence collector.

`lib/` is read-only output from producer
`cddabd0976bfcd3251f79333a49e03d732e20b2c`, whose generated carrier repair is
retained under producer #251. Do not inspect generated source for API discovery.
Use model-aware action/entity/field Assist with `model.xml` for new operations;
report `MISSING_ASSIST` instead of guessing.

Downloaded-package acceptance belongs in a separate workspace with fixed npm
tarball/package hashes and actual module resolution. Never change this local
example to silently exercise an installed release. This fixture does not prove
all Trace Chain cases, external providers or public-release parity.
