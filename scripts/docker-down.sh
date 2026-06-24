#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/docker/.env}"

cd "$ROOT/docker"
docker compose --env-file "$ENV_FILE" down "$@"
