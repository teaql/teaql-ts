#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
verify_scratch="$(mktemp -d -t teaql-ts-example-scratch.XXXXXXXX)"
finish_verification() {
  local status=$?
  trap - EXIT
  # Only logs/configuration owned by this invocation; never databases or caches.
  if [[ -n "$verify_scratch" && -d "$verify_scratch" ]]; then
    if ! rm -r -- "$verify_scratch"; then echo "WARNING: owned scratch retained: $verify_scratch" >&2; fi
  fi
  exit "$status"
}
trap finish_verification EXIT
example_evidence="${TEAQL_EXAMPLES_EVIDENCE_DIR:-$(mktemp -d -t teaql-ts-example-evidence.XXXXXXXX)}"
mkdir -p "$example_evidence"
echo "Retained TypeScript example evidence: $example_evidence"
expected=(browser-sqlite conformance context-derived ensure-schema-bootstrap expression-profiles facet-trace fix-e-alignment natural-messages object-storage order-management scalar-type-probe school-management task-board trace-chain)
mapfile -t actual < <(find "$repo/examples" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)
if [[ "${actual[*]}" != "${expected[*]}" ]]; then
  echo "example inventory changed; update scripts/verify-examples.sh: ${actual[*]}" >&2
  exit 1
fi
# Bind the complete source snapshot before the build replaces tracked dist chunks.
# Profiles compile repository source in their own isolated copy; no source guard
# is weakened to accommodate generated build output.
TEAQL_DISPATCH_PROFILE_EVIDENCE_DIR="$example_evidence/expression-profiles" bash "$repo/examples/expression-profiles/verify-dispatch.sh"
TEAQL_CONTEXT_FIX_EVIDENCE_DIR="$example_evidence/context-derived" node "$repo/examples/context-derived/verify-local.cjs"
node "$repo/scripts/verify-natural-messages.cjs" --example --output "$example_evidence/natural-messages"
bash "$repo/examples/object-storage/verify.sh"
(cd "$repo" && npm test -- --runInBand tests/sql-relation-membership.test.ts)
mkdir -p "$repo/.local"
TEAQL_FIX_E_EVIDENCE_DIR="${TEAQL_FIX_E_EVIDENCE_DIR:-$example_evidence/fix-e-alignment}" node "$repo/examples/fix-e-alignment/verify-local.cjs"
TEAQL_FREIGHT_QUOTE_EVIDENCE_DIR="$example_evidence/freight-quotes" bash "$repo/examples/scalar-type-probe/verify-freight-quotes.sh"
TEAQL_FILE_BOOTSTRAP_OUTPUT="$example_evidence/file-bootstrap" node "$repo/examples/school-management/verify-file-bootstrap.cjs"
TEAQL_CONFORMANCE_EVIDENCE_DIR="$example_evidence/conformance" bash "$repo/examples/conformance/verify.sh"
if rg -n --glob '*.ts' --glob '!**/node_modules/**' --glob '!**/dist/**' \
    '\b(executeForPage|ExecuteForPage|execute_for_page)\b' "$repo/examples"; then
  echo 'FAIL: an example still exposes or calls a retired page terminal; regenerate its library' >&2
  exit 1
fi

(
  cd "$repo/examples/ensure-schema-bootstrap"
  npm ci
  npm run build
  TEAQL_SCHEMA_CALIBRATION_DB="$example_evidence/bootstrap-calibration.sqlite" npm run calibrate
  TEAQL_SCHEMA_BOOTSTRAP_DB="$example_evidence/district-bootstrap.sqlite" TEAQL_SCHEMA_BOOTSTRAP_INSTALL_ONLY=1 npm start
  TEAQL_SCHEMA_BOOTSTRAP_DB="$example_evidence/district-bootstrap.sqlite" npm start
  TEAQL_SCHEMA_BOOTSTRAP_DB="$example_evidence/district-bootstrap.sqlite" npm start
)
(
  cd "$repo/examples/school-management/typescript-app-console"
  npm ci
  npm run build
  npm start
)
TEAQL_ORDER_EVIDENCE_DIR="$example_evidence/order-management" bash "$repo/examples/order-management/verify.sh"
(cd "$repo/examples/task-board" && npm ci && npm run build && \
  TEAQL_TASK_BOARD_EVIDENCE_DIR="$example_evidence/task-board" npm run verify)
(cd "$repo/examples/browser-sqlite/typescript-web-vite" && npm ci && npm run build && npm run smoke && \
  TEAQL_BROWSER_ORDER_EVIDENCE="$example_evidence/browser-orders.json" npm run smoke:orders)
TEAQL_TRACE_CHAIN_EVIDENCE_DIRECTORY="$example_evidence/trace-chain" bash "$repo/examples/trace-chain/verify.sh"
bash "$repo/examples/facet-trace/verify.sh"
echo "PASS: all TypeScript examples"
