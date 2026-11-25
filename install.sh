#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PYTHON="${PYTHON:-python3}"
"$PYTHON" -c 'import sys; assert sys.version_info >= (3,11), "Python 3.11+ required"'
[[ -x .venv/bin/python ]] || "$PYTHON" -m venv .venv
.venv/bin/python -m unittest discover -s tests
printf 'DJ-IQ installed. Run ./server.sh --action start\n'
