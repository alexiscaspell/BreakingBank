#!/usr/bin/env bash
# Print SHA-1/SHA-256 for the APK signing key (Docker/debug builds use android/app/debug.keystore).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="${1:-$ROOT/build/android/breakingbank-release.apk}"
KEYSTORE="${KEYSTORE:-$ROOT/apps/mobile/android/app/debug.keystore}"

print_keystore() {
  local file="$1"
  echo "==> Keystore: $file"
  keytool -list -v -keystore "$file" -storepass android -keypass android 2>/dev/null | grep -E "Alias name:|SHA1:|SHA256:"
}

if [[ -f "$APK" ]] && command -v keytool >/dev/null 2>&1; then
  echo "==> APK: $APK"
  keytool -printcert -jarfile "$APK" 2>/dev/null | grep -E "SHA1:|SHA256:" || true
  echo ""
fi

if [[ -f "$KEYSTORE" ]]; then
  print_keystore "$KEYSTORE"
else
  echo "No local keystore at $KEYSTORE"
  echo "Run ./scripts/build-apk-docker.sh first, or inspect the Docker image:"
  echo "  docker run --rm breakingbank-apk-builder keytool -list -v -keystore /app/android/app/debug.keystore -storepass android | grep SHA"
fi

cat <<'EOF'

Add the SHA-1 to Google Cloud Console:
  APIs & Services → Credentials → Android OAuth client (com.breakingbank.app)

For browser-based sign-in on Android, also add this redirect URI to the Web OAuth client:
  com.breakingbank.app:/oauthredirect
EOF
