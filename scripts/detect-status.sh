#!/usr/bin/env bash
#
# detect-status.sh — Framework-only status detection (non-overridable)
#
# This script is a .sh file (not .ts), so it bypasses the consumer override
# mechanism. Consumers CANNOT replace this logic. This is intentional:
# status detection is a core framework invariant that must not be overridden.
#
# Usage:
#   detect-status /tmp/agent_output.txt
#
# Output (stdout):
#   One of: in-progress | waiting-ci | waiting-human | done | failed
#
# Heuristic (applied in order):
#   1. Contains <!-- WAITING_FOR_HUMAN --> token  → waiting-human
#   2. Matches PR-creation / push patterns        → waiting-ci
#   3. Empty or < 10 chars                        → failed
#   4. Otherwise                                  → done
#
set -euo pipefail

VALID_STATUSES="in-progress waiting-ci waiting-human done failed"

RESPONSE_FILE="${1:-}"

if [ -z "$RESPONSE_FILE" ]; then
  echo "failed"
  exit 0
fi

if [ ! -f "$RESPONSE_FILE" ]; then
  echo "failed"
  exit 0
fi

RESPONSE=$(cat "$RESPONSE_FILE" 2>/dev/null || true)
RESPONSE_LEN=${#RESPONSE}

# ── Heuristic 1: Waiting-for-human token ──────────────────────────────
if echo "$RESPONSE" | grep -qF '<!-- WAITING_FOR_HUMAN -->'; then
  echo "waiting-human"
  exit 0
fi

# ── Heuristic 2: PR creation / push patterns ─────────────────────────
if echo "$RESPONSE" | grep -qiE 'Created pull request|pushed|PR #[0-9]+|git push|the push was|body .?pr preview'; then
  echo "waiting-ci"
  exit 0
fi

# ── Heuristic 3: Empty or too short → failed ─────────────────────────
if [ "$RESPONSE_LEN" -lt 10 ]; then
  echo "failed"
  exit 0
fi

# ── Default: done ─────────────────────────────────────────────────────
echo "done"
