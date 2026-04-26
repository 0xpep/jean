#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${ROOT_DIR}"

echo "Starting Tauri dev in headless mode..."
JEAN_HEADLESS=1 tauri dev --config src-tauri/tauri.conf.dev.json
