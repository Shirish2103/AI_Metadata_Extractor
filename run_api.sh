#!/usr/bin/env bash
# Start the ScriptTagger FastAPI service.
set -e
cd "$(dirname "$0")"
exec env PYTHONPATH="$PWD" ./.venv/bin/python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 "$@"