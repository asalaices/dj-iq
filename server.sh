#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
case "${1:-}" in
 --action) [[ "${2:-}" == start ]] || { echo 'Only start (foreground) is implemented' >&2; exit 2; };;
 *) echo 'Usage: server.sh --action start' >&2; exit 2;;
esac
exec .venv/bin/python app.py
