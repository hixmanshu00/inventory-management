#!/bin/sh
# Container entrypoint: apply migrations, then start the API.
# Run as the app process so a failed migration aborts startup (fail fast) rather
# than serving against an out-of-date schema.
set -e

echo "Running database migrations..."
alembic upgrade head

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Seeding initial data..."
  python -m scripts.seed
fi

echo "Starting API on ${HOST:-0.0.0.0}:${PORT:-8000}..."
exec uvicorn app.main:app --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}"
