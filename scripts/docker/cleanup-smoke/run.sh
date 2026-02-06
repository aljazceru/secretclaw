#!/usr/bin/env bash
set -euo pipefail

cd /repo

export SECRETCLAW_STATE_DIR="/tmp/secretclaw-test"
export SECRETCLAW_CONFIG_PATH="${SECRETCLAW_STATE_DIR}/secretclaw.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${SECRETCLAW_STATE_DIR}/credentials"
mkdir -p "${SECRETCLAW_STATE_DIR}/agents/main/sessions"
echo '{}' >"${SECRETCLAW_CONFIG_PATH}"
echo 'creds' >"${SECRETCLAW_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${SECRETCLAW_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm secretclaw reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${SECRETCLAW_CONFIG_PATH}"
test ! -d "${SECRETCLAW_STATE_DIR}/credentials"
test ! -d "${SECRETCLAW_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${SECRETCLAW_STATE_DIR}/credentials"
echo '{}' >"${SECRETCLAW_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm secretclaw uninstall --state --yes --non-interactive

test ! -d "${SECRETCLAW_STATE_DIR}"

echo "OK"
