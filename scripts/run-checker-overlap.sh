#!/usr/bin/env bash
set -euo pipefail

# Requires GNU coreutils timeout (including --kill-after). Guard only this
# Checker consumer; compilation and unrelated examples retain their own flows.
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
log="${1:?usage: run-checker-overlap.sh LOG_FILE}"
seconds="${TEAQL_TRACE_CHAIN_CHECKER_TIMEOUT_SECONDS:-60}"
if [[ ! "$seconds" =~ ^[1-9][0-9]*$ ]]; then
  echo 'FAIL: Checker timeout must be a positive integer number of seconds' >&2
  exit 2
fi
marker='PASS TypeScript generated Checker overlap: 4 scenarios; real Required rejection, no rejected commands/business SQL/audit; transactions serialized'

if (
  cd "$repo/examples/trace-chain"
  timeout --kill-after=5s "${seconds}s" env -u TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS \
    npm run test:checker-overlap
) > "$log" 2>&1; then
  :
else
  status=$?
  tail -n 20 "$log" >&2
  printf 'FAIL: Checker consumer exit %s; evidence %s\n' "$status" "$log" >&2
  exit "$status"
fi
if ! grep -Fxq -- "$marker" "$log"; then
  tail -n 20 "$log" >&2
  printf 'FAIL: Checker consumer omitted its exact PASS marker; evidence %s\n' "$log" >&2
  exit 1
fi
tail -n 2 "$log"
