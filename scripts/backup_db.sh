#!/bin/bash
set -e

# Configuration
DB_CONTAINER="lumen_postgres"
DB_USER=${POSTGRES_USER:-lumen_admin}
DB_NAME=${POSTGRES_DB:-lumen_prod}
BACKUP_DIR="./backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
docker exec -t $DB_CONTAINER pg_dumpall -c -U $DB_USER | gzip > $BACKUP_FILE

echo "Backup completed: $BACKUP_FILE"

# Retention Policy: keep last 30 backups
ls -dt $BACKUP_DIR/* | tail -n +31 | xargs -d '\n' rm -f --

echo "Backup rotation complete."
