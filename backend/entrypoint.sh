#!/bin/bash
# Backend container entrypoint.
# Runs three steps in order before handing off to gunicorn:
#   1. Wait for PostgreSQL to be ready
#   2. Apply any pending database migrations
#   3. Start the gunicorn WSGI server

# Exit immediately if any command fails
set -e

echo "Waiting for PostgreSQL at $POSTGRES_HOST:$POSTGRES_PORT..."

# pg_isready checks whether the PostgreSQL server is accepting connections.
# We loop until it returns success (exit code 0) before proceeding.
# Without this, migrate can fail if the DB container hasn't finished starting.
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  echo "PostgreSQL is not ready yet — retrying in 1 second..."
  sleep 1
done

echo "PostgreSQL is ready."

# Apply all pending migrations.
# Django's migrate is idempotent — it checks the django_migrations table and
# only applies migrations that haven't been run yet, so this is safe every boot.
echo "Running database migrations..."
python manage.py migrate --noinput

# If arguments were passed to the entrypoint (e.g. `python manage.py test`),
# run those instead of gunicorn. This lets us reuse the same image for both
# the web server and one-off management commands without a separate Dockerfile.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "Starting gunicorn..."

# exec replaces this shell process with gunicorn so Docker signals (SIGTERM, etc.)
# are forwarded directly to gunicorn rather than being caught by bash
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --timeout 30 \
  --access-logfile - \
  --error-logfile -
