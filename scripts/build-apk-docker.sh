#!/usr/bin/env bash
# Build the Android APK inside Docker (no local Android SDK required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"
OUTPUT="${OUTPUT:-$ROOT/build/android}"
# 10.0.2.2 = host machine from Android emulator; use your LAN IP for a physical device.
API_URL="${EXPO_PUBLIC_API_URL:-http://10.0.2.2:8000}"
BUILD_TYPE="${BUILD_TYPE:-release}"
IMAGE="${IMAGE:-breakingbank-apk-builder}"
GOOGLE_WEB_CLIENT_ID="${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:-}"
GOOGLE_ANDROID_CLIENT_ID="${EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:-}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Build BreakingBank APK using Docker.

Options:
  --api-url URL     EXPO_PUBLIC_API_URL baked into the app (default: $API_URL)
  --output DIR      Directory for the APK output (default: $OUTPUT)
  --release         Build release APK instead of debug
  --image NAME      Docker image tag (default: $IMAGE)
  -h, --help        Show this help

Examples:
  $(basename "$0")
  $(basename "$0") --api-url http://192.168.1.10:8000 --output ./build/android
  BUILD_TYPE=release EXPO_PUBLIC_API_URL=https://api.example.com $(basename "$0") --release
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-url) API_URL="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    --release) BUILD_TYPE=release; shift ;;
    --image) IMAGE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

mkdir -p "$OUTPUT"

echo "==> Building APK (type=$BUILD_TYPE, api=$API_URL)"
echo "==> Output: $OUTPUT"

docker build \
  --no-cache \
  -f "$MOBILE/Dockerfile.apk" \
  --build-arg "EXPO_PUBLIC_API_URL=$API_URL" \
  --build-arg "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$GOOGLE_WEB_CLIENT_ID" \
  --build-arg "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=$GOOGLE_ANDROID_CLIENT_ID" \
  --build-arg "BUILD_TYPE=$BUILD_TYPE" \
  -t "$IMAGE" \
  "$MOBILE"

CONTAINER="$IMAGE-$$"
docker create --name "$CONTAINER" "$IMAGE" >/dev/null
docker cp "$CONTAINER:/output/." "$OUTPUT/"
docker rm "$CONTAINER" >/dev/null

echo ""
echo "Done. APK(s) in $OUTPUT:"
ls -lh "$OUTPUT"/*.apk 2>/dev/null || ls -lh "$OUTPUT/"
