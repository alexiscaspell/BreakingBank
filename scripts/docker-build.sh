#!/usr/bin/env bash
# Build all Docker images without starting containers.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/docker/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/docker/.env.example" "$ENV_FILE"
fi

cd "$ROOT/docker"
docker compose --env-file "$ENV_FILE" build "$@"

echo "Build complete. Run ./scripts/docker-up.sh to start."
