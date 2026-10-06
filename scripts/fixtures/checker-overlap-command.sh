#!/usr/bin/env bash
set -euo pipefail

# Test-only npm stand-in; never invoked by a real consumer verification.
marker='PASS TypeScript generated Checker overlap: 4 scenarios; real Required rejection, no rejected commands/business SQL/audit; transactions serialized'
case "${TEAQL_CHECKER_GUARD_CONTROL:?test mode required}" in
  timeout) printf '%s\n' "$marker"; exec sleep 30 ;;
  nonzero) printf '%s\n' "$marker"; exit 7 ;;
  missing) echo 'process exited successfully without completing Checker assertions' ;;
  partial) printf 'prefix %s suffix\n' "$marker" ;;
  success) printf '%s\n' "$marker" ;;
  *) exit 2 ;;
esac
