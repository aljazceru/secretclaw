#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
EXTRA_COMPOSE_FILE="$ROOT_DIR/docker-compose.extra.yml"
IMAGE_NAME="${SECRETCLAW_IMAGE:-${OPENCLAW_IMAGE:-secretclaw:local}}"
EXTRA_MOUNTS="${SECRETCLAW_EXTRA_MOUNTS:-${OPENCLAW_EXTRA_MOUNTS:-}}"
HOME_VOLUME_NAME="${SECRETCLAW_HOME_VOLUME:-${OPENCLAW_HOME_VOLUME:-}}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1" >&2
    exit 1
  fi
}

require_cmd docker
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose not available (try: docker compose version)" >&2
  exit 1
fi

SECRETCLAW_CONFIG_DIR="${SECRETCLAW_CONFIG_DIR:-${OPENCLAW_CONFIG_DIR:-$HOME/.secretclaw}}"
SECRETCLAW_WORKSPACE_DIR="${SECRETCLAW_WORKSPACE_DIR:-${OPENCLAW_WORKSPACE_DIR:-$HOME/.secretclaw/workspace}}"

mkdir -p "$SECRETCLAW_CONFIG_DIR"
mkdir -p "$SECRETCLAW_WORKSPACE_DIR"

export SECRETCLAW_CONFIG_DIR
export SECRETCLAW_WORKSPACE_DIR
export SECRETCLAW_GATEWAY_PORT="${SECRETCLAW_GATEWAY_PORT:-${OPENCLAW_GATEWAY_PORT:-18789}}"
export SECRETCLAW_BRIDGE_PORT="${SECRETCLAW_BRIDGE_PORT:-${OPENCLAW_BRIDGE_PORT:-18790}}"
export SECRETCLAW_GATEWAY_BIND="${SECRETCLAW_GATEWAY_BIND:-${OPENCLAW_GATEWAY_BIND:-lan}}"
export SECRETCLAW_IMAGE="$IMAGE_NAME"
export SECRETCLAW_DOCKER_APT_PACKAGES="${SECRETCLAW_DOCKER_APT_PACKAGES:-${OPENCLAW_DOCKER_APT_PACKAGES:-}}"
export SECRETCLAW_EXTRA_MOUNTS="$EXTRA_MOUNTS"
export SECRETCLAW_HOME_VOLUME="$HOME_VOLUME_NAME"
export MAPLE_PROXY_IMAGE="${MAPLE_PROXY_IMAGE:-maple-proxy:local}"
export MAPLE_PROXY_PORT="${MAPLE_PROXY_PORT:-8080}"
export MAPLE_PROXY_URL="${MAPLE_PROXY_URL:-http://maple-proxy:8080/v1}"
export PRIVATEMODE_PROXY_URL="${PRIVATEMODE_PROXY_URL:-}"
export TINFOIL_PROXY_IMAGE="${TINFOIL_PROXY_IMAGE:-tinfoil-proxy:local}"
export TINFOIL_PROXY_PORT="${TINFOIL_PROXY_PORT:-8081}"
export TINFOIL_PROXY_URL="${TINFOIL_PROXY_URL:-http://tinfoil-proxy:8080/v1}"
export SECRETCLAW_LOCAL_PROXY_HOSTS="${SECRETCLAW_LOCAL_PROXY_HOSTS:-${OPENCLAW_LOCAL_PROXY_HOSTS:-maple-proxy,tinfoil-proxy,host.docker.internal,host.containers.internal}}"

SECRETCLAW_GATEWAY_TOKEN="${SECRETCLAW_GATEWAY_TOKEN:-${OPENCLAW_GATEWAY_TOKEN:-}}"
if [[ -z "${SECRETCLAW_GATEWAY_TOKEN:-}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    SECRETCLAW_GATEWAY_TOKEN="$(openssl rand -hex 32)"
  else
    SECRETCLAW_GATEWAY_TOKEN="$(python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
)"
  fi
fi
export SECRETCLAW_GATEWAY_TOKEN

COMPOSE_FILES=("$COMPOSE_FILE")
COMPOSE_ARGS=()

write_extra_compose() {
  local home_volume="$1"
  shift
  local -a mounts=("$@")
  local mount

  cat >"$EXTRA_COMPOSE_FILE" <<'YAML'
services:
  secretclaw-gateway:
    volumes:
YAML

  if [[ -n "$home_volume" ]]; then
    printf '      - %s:/home/node\n' "$home_volume" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/.secretclaw\n' "$SECRETCLAW_CONFIG_DIR" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/.secretclaw/workspace\n' "$SECRETCLAW_WORKSPACE_DIR" >>"$EXTRA_COMPOSE_FILE"
  fi

  for mount in "${mounts[@]}"; do
    printf '      - %s\n' "$mount" >>"$EXTRA_COMPOSE_FILE"
  done

  cat >>"$EXTRA_COMPOSE_FILE" <<'YAML'
  secretclaw-cli:
    volumes:
YAML

  if [[ -n "$home_volume" ]]; then
    printf '      - %s:/home/node\n' "$home_volume" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/.secretclaw\n' "$SECRETCLAW_CONFIG_DIR" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/.secretclaw/workspace\n' "$SECRETCLAW_WORKSPACE_DIR" >>"$EXTRA_COMPOSE_FILE"
  fi

  for mount in "${mounts[@]}"; do
    printf '      - %s\n' "$mount" >>"$EXTRA_COMPOSE_FILE"
  done

  if [[ -n "$home_volume" && "$home_volume" != *"/"* ]]; then
    cat >>"$EXTRA_COMPOSE_FILE" <<YAML
volumes:
  ${home_volume}:
YAML
  fi
}

VALID_MOUNTS=()
if [[ -n "$EXTRA_MOUNTS" ]]; then
  IFS=',' read -r -a mounts <<<"$EXTRA_MOUNTS"
  for mount in "${mounts[@]}"; do
    mount="${mount#"${mount%%[![:space:]]*}"}"
    mount="${mount%"${mount##*[![:space:]]}"}"
    if [[ -n "$mount" ]]; then
      VALID_MOUNTS+=("$mount")
    fi
  done
fi

if [[ -n "$HOME_VOLUME_NAME" || ${#VALID_MOUNTS[@]} -gt 0 ]]; then
  write_extra_compose "$HOME_VOLUME_NAME" "${VALID_MOUNTS[@]}"
  COMPOSE_FILES+=("$EXTRA_COMPOSE_FILE")
fi
for compose_file in "${COMPOSE_FILES[@]}"; do
  COMPOSE_ARGS+=("-f" "$compose_file")
done
COMPOSE_HINT="docker compose"
for compose_file in "${COMPOSE_FILES[@]}"; do
  COMPOSE_HINT+=" -f ${compose_file}"
done

ENV_FILE="$ROOT_DIR/.env"
upsert_env() {
  local file="$1"
  shift
  local -a keys=("$@")
  local tmp
  tmp="$(mktemp)"
  declare -A seen=()

  if [[ -f "$file" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      local key="${line%%=*}"
      local replaced=false
      for k in "${keys[@]}"; do
        if [[ "$key" == "$k" ]]; then
          printf '%s=%s\n' "$k" "${!k-}" >>"$tmp"
          seen["$k"]=1
          replaced=true
          break
        fi
      done
      if [[ "$replaced" == false ]]; then
        printf '%s\n' "$line" >>"$tmp"
      fi
    done <"$file"
  fi

  for k in "${keys[@]}"; do
    if [[ -z "${seen[$k]:-}" ]]; then
      printf '%s=%s\n' "$k" "${!k-}" >>"$tmp"
    fi
  done

  mv "$tmp" "$file"
}

upsert_env "$ENV_FILE" \
  SECRETCLAW_CONFIG_DIR \
  SECRETCLAW_WORKSPACE_DIR \
  SECRETCLAW_GATEWAY_PORT \
  SECRETCLAW_BRIDGE_PORT \
  SECRETCLAW_GATEWAY_BIND \
  SECRETCLAW_GATEWAY_TOKEN \
  SECRETCLAW_IMAGE \
  SECRETCLAW_EXTRA_MOUNTS \
  SECRETCLAW_HOME_VOLUME \
  SECRETCLAW_DOCKER_APT_PACKAGES \
  MAPLE_API_KEY \
  PRIVATEMODE_API_KEY \
  TINFOIL_API_KEY \
  MAPLE_PROXY_IMAGE \
  MAPLE_PROXY_PORT \
  MAPLE_PROXY_URL \
  PRIVATEMODE_PROXY_URL \
  TINFOIL_PROXY_IMAGE \
  TINFOIL_PROXY_PORT \
  TINFOIL_PROXY_URL \
  SECRETCLAW_LOCAL_PROXY_HOSTS

echo "==> Building Docker image: $IMAGE_NAME"
docker build \
  --build-arg "SECRETCLAW_DOCKER_APT_PACKAGES=${SECRETCLAW_DOCKER_APT_PACKAGES}" \
  -t "$IMAGE_NAME" \
  -f "$ROOT_DIR/Dockerfile" \
  "$ROOT_DIR"

echo ""
echo "==> Onboarding (interactive)"
echo "When prompted:"
echo "  - Gateway bind: lan"
echo "  - Gateway auth: token"
echo "  - Gateway token: $SECRETCLAW_GATEWAY_TOKEN"
echo "  - Tailscale exposure: Off"
echo "  - Install Gateway daemon: No"
echo ""
docker compose "${COMPOSE_ARGS[@]}" run --rm secretclaw-cli onboard --no-install-daemon

echo ""
echo "==> Provider setup (optional)"
echo "WhatsApp (QR):"
echo "  ${COMPOSE_HINT} run --rm secretclaw-cli channels login"
echo "Telegram (bot token):"
echo "  ${COMPOSE_HINT} run --rm secretclaw-cli channels add --channel telegram --token <token>"
echo "Discord (bot token):"
echo "  ${COMPOSE_HINT} run --rm secretclaw-cli channels add --channel discord --token <token>"
echo ""
echo "TEE proxies (optional):"
echo "  Maple: set MAPLE_PROXY_IMAGE, then ${COMPOSE_HINT} --profile maple up -d maple-proxy"
echo "  Tinfoil: set TINFOIL_PROXY_IMAGE, then ${COMPOSE_HINT} --profile tinfoil up -d tinfoil-proxy"
echo "Docs: https://docs.openclaw.ai/channels"

echo ""
echo "==> Starting gateway"
docker compose "${COMPOSE_ARGS[@]}" up -d secretclaw-gateway

echo ""
echo "Gateway running with host port mapping."
echo "Access from tailnet devices via the host's tailnet IP."
echo "Config: $SECRETCLAW_CONFIG_DIR"
echo "Workspace: $SECRETCLAW_WORKSPACE_DIR"
echo "Token: $SECRETCLAW_GATEWAY_TOKEN"
echo ""
echo "Commands:"
echo "  ${COMPOSE_HINT} logs -f secretclaw-gateway"
echo "  ${COMPOSE_HINT} exec secretclaw-gateway node dist/index.js health --token \"$SECRETCLAW_GATEWAY_TOKEN\""
