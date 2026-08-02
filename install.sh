#!/data/data/com.termux/files/usr/bin/env bash
set -euo pipefail

# vesk-native installer — build the Android test-app and open the package installer.
#
# Usage:
#   ./install.sh                build test-app/, stage the APK, open the installer
#   ./install.sh <project-dir>  build <project-dir>, stage the APK, open the installer
#
# After tapping "Install" on the device, launch the app with:
#   vesk-native run <project-dir>   (or)   ./launch.sh
#
# It runs entirely on-device (Termux). No host/computer needed.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="${1:-$SCRIPT_DIR/test-app}"

echo "==> vesk-native install: $PROJECT"

echo "==> building APK..."
npx tsx "$SCRIPT_DIR/packages/cli-native/src/index.ts" build "$PROJECT"

echo "==> launching package installer..."
npx tsx "$SCRIPT_DIR/packages/cli-native/src/index.ts" install "$PROJECT"

echo ""
echo "==> after installing, open the app with:"
echo "    $SCRIPT_DIR/launch.sh"
