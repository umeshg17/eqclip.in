#!/usr/bin/env bash
# One-shot PDF build via Docker (wrapper). Same as: ./scripts/resume-preview.sh --docker --once

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/resume-preview.sh" --docker --once
