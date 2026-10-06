#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
evidence="${1:-$(mktemp -d /tmp/teaql-ts-checker-guard-controls.XXXXXX)}"
mkdir -p "$evidence/bin"
evidence="$(cd "$evidence" && pwd)"
ln -s "$repo/scripts/fixtures/checker-overlap-command.sh" "$evidence/bin/npm"

for control in timeout nonzero missing partial success; do
  case "$control" in
    timeout) expected=124 ;;
    nonzero) expected=7 ;;
    missing|partial) expected=1 ;;
    success) expected=0 ;;
  esac
  if PATH="$evidence/bin:$PATH" TEAQL_CHECKER_GUARD_CONTROL="$control" \
    TEAQL_TRACE_CHAIN_CHECKER_TIMEOUT_SECONDS=1 \
    bash "$repo/scripts/run-checker-overlap.sh" "$evidence/$control-consumer.log" \
    > "$evidence/$control-guard.log" 2>&1; then
    actual=0
  else
    actual=$?
  fi
  if [[ "$actual" != "$expected" ]]; then
    printf 'FAIL: guard control %s expected %s got %s; evidence %s\n' \
      "$control" "$expected" "$actual" "$evidence" >&2
    exit 1
  fi
  printf 'GUARD_CONTROL %s exit=%s expected=%s\n' "$control" "$actual" "$expected"
done
printf 'PASS: Checker verifier guard controls; evidence %s\n' "$evidence"
