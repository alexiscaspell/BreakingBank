#!/usr/bin/env bash
# Start API + MinIO + Web (Expo static export).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-$ROOT/docker/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Creating $ENV_FILE from .env.example"
  cp "$ROOT/docker/.env.example" "$ENV_FILE"
fi

cd "$ROOT/docker"
docker compose --env-file "$ENV_FILE" up --build -d "$@"

echo ""
echo "Spend Tracker stack is running:"
echo "  Web:  http://localhost:${WEB_PORT:-8080}"
echo "  API:  http://localhost:8000"
echo "  Docs: http://localhost:8000/docs"
echo "  MinIO console: http://localhost:9001"
