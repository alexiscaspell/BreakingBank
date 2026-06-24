#!/usr/bin/env bash
# Build the APK with Docker and install it on the single USB-connected device via adb.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/docker/.env}"
OUTPUT="${OUTPUT:-$ROOT/build/android}"
BUILD_TYPE="${BUILD_TYPE:-release}"
SKIP_BUILD=0
ADB="${ADB:-adb}"
CLI_API_URL="${EXPO_PUBLIC_API_URL:-}"
API_URL="${CLI_API_URL:-http://10.0.2.2:8000}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  API_URL="${EXPO_PUBLIC_API_URL:-$API_URL}"
fi
if [[ -n "$CLI_API_URL" ]]; then
  API_URL="$CLI_API_URL"
fi

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [-- build-apk options]

Build BreakingBank APK in Docker, then install on the only connected USB device.

Options:
  --output DIR      APK output directory (default: $OUTPUT)
  --release         Install release APK (default)
  --debug           Install debug APK
  --skip-build      Skip Docker build; install existing APK from --output
  -h, --help        Show this help

Passes through options to scripts/build-apk-docker.sh (e.g. --api-url, --no-cache).

Requires:
  - docker
  - adb (Android platform-tools)
  - Exactly one device with state "device" (adb devices)

Examples:
  $(basename "$0")
  $(basename "$0") --api-url http://192.168.1.10:8000
  $(basename "$0") --skip-build
EOF
}

INSTALL_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output) OUTPUT="$2"; INSTALL_ARGS+=(--output "$2"); shift 2 ;;
    --release) BUILD_TYPE=release; INSTALL_ARGS+=(--release); shift ;;
    --debug) BUILD_TYPE=debug; INSTALL_ARGS+=(--debug); shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    -h|--help) usage; exit 0 ;;
    --) shift; INSTALL_ARGS+=("$@"); break ;;
    *) INSTALL_ARGS+=("$1"); shift ;;
  esac
done

if ! command -v "$ADB" >/dev/null 2>&1; then
  echo "Error: adb not found (install Android platform-tools)" >&2
  exit 1
fi

mapfile -t DEVICES < <("$ADB" devices | awk 'NR > 1 && $2 == "device" { print $1 }')
if [[ "${#DEVICES[@]}" -eq 0 ]]; then
  echo "Error: no USB device found. Plug in the phone and enable USB debugging." >&2
  "$ADB" devices
  exit 1
fi
if [[ "${#DEVICES[@]}" -gt 1 ]]; then
  echo "Error: expected exactly one device, found ${#DEVICES[@]}:" >&2
  printf '  %s\n' "${DEVICES[@]}" >&2
  echo "Disconnect extras or set ANDROID_SERIAL." >&2
  exit 1
fi

SERIAL="${DEVICES[0]}"
echo "==> Target device: $SERIAL"

if [[ "$API_URL" == *"localhost"* || "$API_URL" == *"127.0.0.1"* || "$API_URL" == *"10.0.2.2"* ]]; then
  echo "Warning: API URL is $API_URL — physical devices cannot reach the emulator host." >&2
  echo "         Use your LAN IP or https://breakingbank-api.toast.com.ar via --api-url or docker/.env" >&2
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  OUTPUT="$OUTPUT" BUILD_TYPE="$BUILD_TYPE" "$SCRIPT_DIR/build-apk-docker.sh" --api-url "$API_URL" "${INSTALL_ARGS[@]}"
fi

if [[ "$BUILD_TYPE" == "release" ]]; then
  APK="$OUTPUT/breakingbank-release.apk"
else
  APK="$OUTPUT/breakingbank-debug.apk"
fi

if [[ ! -f "$APK" ]]; then
  echo "Error: APK not found: $APK" >&2
  exit 1
fi

echo "==> Installing $APK"
"$ADB" -s "$SERIAL" install -r "$APK"
echo "==> Installed on $SERIAL"
