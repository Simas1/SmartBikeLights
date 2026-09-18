#!/usr/bin/env bash
set -euo pipefail
simulator_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$simulator_dir/common/run.py" "$@"
