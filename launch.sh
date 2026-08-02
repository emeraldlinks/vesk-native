#!/data/data/com.termux/files/usr/bin/env bash
set -euo pipefail

# Launch the last-installed vesk-native demo app.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="${1:-$SCRIPT_DIR/test-app}"

APP_ID="$(node -e 'console.log(require(process.argv[1]).appId)' "$PROJECT/veskconfig.json")"

echo "==> launching $APP_ID"
exec /data/data/com.termux/files/usr/bin/am start --user 0 -n "$APP_ID/.MainActivity"
