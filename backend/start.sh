#!/bin/sh

# Stop on errors
set -e

echo "Waiting for PostgreSQL to start..."
# Note: we depend on Postgres to be ready via docker-compose healthcheck, 
# but a short sleep guarantees it's fully accepting connections.
sleep 3

echo "Running complete admin user setup..."
python create_admin.py

echo "Starting Uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
