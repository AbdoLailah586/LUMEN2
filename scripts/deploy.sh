#!/bin/bash
set -e

echo "Deploying LUMEN Production Stack..."

# Pull latest images if hosted remotely, or build locally
docker-compose -f docker-compose.prod.yml build

# Apply migrations
echo "Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm api alembic upgrade head

# Up services safely
docker-compose -f docker-compose.prod.yml up -d

echo "LUMEN Deployed Successfully."
