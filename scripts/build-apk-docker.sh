#!/usr/bin/env bash
# Build the Android APK inside Docker (no local Android SDK required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"
ENV_FILE="${ENV_FILE:-$ROOT/docker/.env}"
OUTPUT="${OUTPUT:-$ROOT/build/android}"
# 10.0.2.2 = host machine from Android emulator; use your LAN IP for a physical device.
API_URL="${EXPO_PUBLIC_API_URL:-http://10.0.2.2:8000}"
BUILD_TYPE="${BUILD_TYPE:-release}"
IMAGE="${IMAGE:-breakingbank-apk-builder}"
GOOGLE_WEB_CLIENT_ID="${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:-}"
GOOGLE_ANDROID_CLIENT_ID="${EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:-}"
CLI_API_URL="${EXPO_PUBLIC_API_URL:-}"
NO_CACHE=0

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  API_URL="${EXPO_PUBLIC_API_URL:-$API_URL}"
  GOOGLE_WEB_CLIENT_ID="${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:-$GOOGLE_WEB_CLIENT_ID}"
  GOOGLE_ANDROID_CLIENT_ID="${EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:-$GOOGLE_ANDROID_CLIENT_ID}"
fi
if [[ -n "$CLI_API_URL" ]]; then
  API_URL="$CLI_API_URL"
fi

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Build BreakingBank APK using Docker.

Options:
  --api-url URL     EXPO_PUBLIC_API_URL baked into the app (default: $API_URL)
  --output DIR      Directory for the APK output (default: $OUTPUT)
  --release         Build release APK (default)
  --debug           Build debug APK
  --image NAME      Docker image tag (default: $IMAGE)
  --no-cache        Docker build without layer cache
  -h, --help        Show this help

Environment:
  Reads $ENV_FILE when present (EXPO_PUBLIC_* vars).

Examples:
  $(basename "$0")
  $(basename "$0") --api-url http://192.168.1.10:8000
  BUILD_TYPE=debug $(basename "$0") --debug
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-url) API_URL="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    --release) BUILD_TYPE=release; shift ;;
    --debug) BUILD_TYPE=debug; shift ;;
    --image) IMAGE="$2"; shift 2 ;;
    --no-cache) NO_CACHE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker not found" >&2
  exit 1
fi

mkdir -p "$OUTPUT" "$MOBILE/.gradle-home"

echo "==> Building APK (type=$BUILD_TYPE, api=$API_URL)"
echo "==> Output: $OUTPUT"

BUILD_ARGS=(
  -f "$MOBILE/Dockerfile.apk"
  --build-arg "EXPO_PUBLIC_API_URL=$API_URL"
  --build-arg "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$GOOGLE_WEB_CLIENT_ID"
  --build-arg "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=$GOOGLE_ANDROID_CLIENT_ID"
  --build-arg "BUILD_TYPE=$BUILD_TYPE"
  -t "$IMAGE"
)
if [[ "$NO_CACHE" -eq 1 ]]; then
  BUILD_ARGS=(--no-cache "${BUILD_ARGS[@]}")
fi

docker build "${BUILD_ARGS[@]}" "$MOBILE"

CONTAINER="$IMAGE-$$"
docker create --name "$CONTAINER" "$IMAGE" >/dev/null
docker cp "$CONTAINER:/output/." "$OUTPUT/"
docker cp "$CONTAINER:/app/.gradle-home/." "$MOBILE/.gradle-home/" 2>/dev/null || true
docker rm "$CONTAINER" >/dev/null

echo ""
echo "Done. APK(s) in $OUTPUT:"
ls -lh "$OUTPUT"/*.apk 2>/dev/null || ls -lh "$OUTPUT/"
