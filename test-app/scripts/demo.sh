#!/usr/bin/env bash
# Install the debug APK (auto-builds if missing).
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install.sh" debug
