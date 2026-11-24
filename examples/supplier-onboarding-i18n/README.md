# Supplier onboarding in 15 locales with TeaQL TypeScript

The [KSML model](model.xml) describes a warehouse with suppliers. The [semantic model](semantics.json) sends two registrations through the generated workspace. One lacks a supplier name. The other submits 3 as the minimum order quantity, below the allowed value of 10. The application attempts audited saves and uses generated Q to confirm that SQLite stores neither invalid supplier.

## Run and select a locale

Node.js and npm, Python 3.9 or newer, plus a C++ toolchain if `better-sqlite3` needs to build from source. The verified version was Node.js 24.19.0. This example uses local TypeScript runtime 0.6.0 source. Run `npm ci` and `npm run build` in the runtime checkout before launching the example. The launcher compiles its console and sibling domain library against the same built `teaql-ts` package.

```sh
bash examples/supplier-onboarding-i18n/run.sh
bash examples/supplier-onboarding-i18n/run.sh --locale fr
bash examples/supplier-onboarding-i18n/run.sh --all
bash examples/supplier-onboarding-i18n/run.sh --edge-cases
bash examples/supplier-onboarding-i18n/run.sh --verify
```

The commands run from the runtime repository root. The output is UTF-8 JSON Lines. Each validation row gives the effective locale, stable message key, canonical field, native rule, arguments and localized message. `--all` uses the 15 locales from the semantic model in one process. The final command runs the full set twice against one SQLite file and runs the locale boundary checks.

The app selects the locale with `context.setLocaleCode(code)` and reads `context.locale`. A new context defaults to `en`. The parser trims, normalizes underscores and case, and resolves known aliases such as `ZH_hant` to `zh-TW`. An empty or unsupported code raises `UnsupportedLocaleError` and preserves the previous locale. Single-language mode prints the rejection and exits 2. Locale selection comes from the trusted CLI and context. Environment variables and business input do not set it.

`TEAQL_TYPESCRIPT_EXAMPLE_SOURCE_ROOT` defaults to the enclosing checkout and can select its already-built source copy.

## How the message is produced

1. The console builds its `UserContext`, installs generated model metadata, and explicitly initializes SQLite. It sets the locale before the generated business call.
2. The real model check rejects the invalid registration. The generated save raises `CheckException`. Its `violations` and `checkResultToWire` expose the same modeled rule, location and bound as the other runtimes. The SQL client stores its execution context for Checker and Fix, so this app binds one SQLite client per `UserContext` with `client.setUserContext(context)`. Both clients use the same file.
3. The renderer chooses the locale and a template for the field's location shape. It binds the rendered field, model path and applicable checker parameters, including the lower bound.
4. The sample attaches the generated application catalog through `context.installI18nCatalog(new I18nCatalog(data, I18nCatalog.builtin))`. Its Vietnamese message entries are absent. Built-in Vietnamese supplies the same two messages after attachment. For this natural checker message, selection tries the application's shape-specific override, the application legacy template, and the built-in natural template at the active locale, then repeats that order for English. The generic invalid rule can supply the final natural template. Direct lookup through the legacy message catalog selects application and built-in entries at the current locale first, then application and built-in English, then the stable key.

The independent French context remains French through the main context's Japanese, Arabic and Japanese sequence. Domain labels without an available translation can remain in English. The two contexts keep their own clients and locale state. In the source qualification a shared mutable client showed the previous request's checker language. Binding a client per context preserves the French text while another context switches languages. [Locale source](../../src/core/i18n.ts) · [Message lookup source](../../src/core/i18n.ts) · [Natural templates source](../../src/core/natural-messages/catalog.ts)

## Run the same scene in another runtime

Keep the same KSML and semantic inputs when switching to its sibling checkout. Each runtime uses its own setup and call style, while the error keys, field paths and minimum bound stay stable.

[Java](../../../java/examples/supplier-onboarding-i18n/README.md) · [Rust](../../../rust/examples/supplier-onboarding-i18n/README.md) · [TypeScript](./README.md) · [Go](../../../go/examples/supplier-onboarding-i18n/README.md) · [Python](../../../python/examples/supplier-onboarding-i18n/README.md) · [C#/.NET](../../../dotnet/examples/supplier-onboarding-i18n/README.md) · [Swift](../../../swift/Examples/SupplierOnboardingI18n/README.md)

## Add a locale

Add `'it'` to the `locales` tuple in `i18n.ts`. The inferred `Locale` type then follows the new selection. Add aliases if needed. Update the built-in resources `builtin-messages-v1.json`, `natural-messages/builtin-v1.json` and `natural-messages/presentation-defaults-v1.json` under `src/core`. Supply natural forms for the supported shapes and add presentation words, such as the name for the current object and the measurement units. For a legacy required-message entry the identifier and placeholder stay the same.

```json
{
  "it": {
    "messages": {"checker.required": "Il campo {location} è obbligatorio"},
    "vocabulary": {}
  }
}
```

Keep placeholders such as `{field}`, `{location}` and `{system}` aligned with their respective catalog schemas. Add the locale to the generator and shared semantic model, regenerate the workspaces, then run the same save, alias, fallback and isolation checks. To customize text for an already supported locale, attach an explicit application catalog.
