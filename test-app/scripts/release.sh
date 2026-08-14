#!/usr/bin/env bash
# Install the prebuilt release APK (requires a prior `bundle`).
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install.sh" release
