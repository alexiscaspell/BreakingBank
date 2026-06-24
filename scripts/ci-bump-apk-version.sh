#!/usr/bin/env bash
# Updates apps/mobile app.json + package.json from a semver string.
# Writes versionCode for Android (major*10000 + minor*100 + patch).
set -euo pipefail

VERSION="${1:?Usage: ci-bump-apk-version.sh <semver>}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_JSON="$ROOT/apps/mobile/app.json"
PKG_JSON="$ROOT/apps/mobile/package.json"

IFS=. read -r MAJOR MINOR PATCH <<<"$VERSION"
MAJOR=${MAJOR:-0}
MINOR=${MINOR:-0}
PATCH=${PATCH:-0}
VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

tmp="$(mktemp)"
jq --arg v "$VERSION" --argjson code "$VERSION_CODE" \
  '.expo.version = $v | .expo.android.versionCode = $code' \
  "$APP_JSON" >"$tmp"
mv "$tmp" "$APP_JSON"

tmp="$(mktemp)"
jq --arg v "$VERSION" '.version = $v' "$PKG_JSON" >"$tmp"
mv "$tmp" "$PKG_JSON"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "version=$VERSION" >>"$GITHUB_OUTPUT"
  echo "version_code=$VERSION_CODE" >>"$GITHUB_OUTPUT"
fi

echo "Set app version to $VERSION (versionCode $VERSION_CODE)"
