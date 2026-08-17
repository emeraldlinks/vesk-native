#!/usr/bin/env bash
# vesk-native aero-app installer — debug | release.
# Builds the variant if needed (debug auto-builds; release requires a prior
# `bundle` and never builds silently), stages the APK into Termux's home, and
# hands it to the Android system installer via Termux's TermuxOpenReceiver
# provider (content://com.termux.files).
set -euo pipefail

VARIANT="${1:-debug}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

case "$VARIANT" in
  debug | release) ;;
  *) echo "usage: install.sh [debug|release]" >&2; exit 2 ;;
esac

CLI="npx tsx ../packages/cli-native/src/index.ts"
APK="app/build/outputs/apk/$VARIANT/app-$VARIANT.apk"
NAME="aero-$VARIANT.apk"

if [ ! -f "$APK" ]; then
  if [ "$VARIANT" = "release" ]; then
    echo "[install] release APK not found at $APK" >&2
    echo "[install] build it first with: npx tsx ../packages/cli-native/src/index.ts bundle" >&2
    exit 1
  fi
  echo "[install] APK missing — building first"
  $CLI build
fi

if [ ! -f "$APK" ]; then
  echo "[install] build did not produce an APK" >&2
  exit 1
fi

# Termux host detection + staging (mirrors the removed CLI stageApk).
PREFIX_PATH="${PREFIX:-/data/data/com.termux/files/usr}"
TERMUX_BIN="$PREFIX_PATH/bin"
TERMUX_HOME_PATH="${TERMUX_HOME:-$(dirname "$PREFIX_PATH")/home}"

if [ -x "$TERMUX_BIN/am" ] && [ -d "$TERMUX_HOME_PATH" ]; then
  cp "$APK" "$TERMUX_HOME_PATH/$NAME"
  echo "[install] APK staged at $TERMUX_HOME_PATH/$NAME"
  echo ""
  echo "[install] launching the system package installer..."
  # The system installer cannot read Termux's private storage directly, so we
  # hand it a content:// URI served by Termux's TermuxOpenReceiver provider
  # (authority com.termux.files) and grant read permission on the intent.
  "$TERMUX_BIN/am" start --user 0 \
    -a android.intent.action.VIEW \
    -d "content://com.termux.files$TERMUX_HOME_PATH/$NAME" \
    -t application/vnd.android.package-archive \
    --grant-read-uri-permission || true
else
  echo "[install] Termux 'am' not usable — copy the APK from $APK to shared storage first" >&2
fi

APPID="$(grep -m1 "appId:" veskconfig.ts | tr -d " ',;" | sed 's/^appId://')"
echo ""
echo "[install] after installing, launch the app with:"
echo "          $TERMUX_BIN/am start --user 0 -n $APPID/.MainActivity"