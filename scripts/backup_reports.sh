#!/usr/bin/env bash
# Simple backup script: archives reports/archive into dated tar.gz in backups/
OUT_DIR=${1:-reports/archive}
BACKUP_DIR=${2:-backups}
mkdir -p "$BACKUP_DIR"
TS=$(date +"%Y-%m-%d_%H%M")
TARGET="$BACKUP_DIR/reports_backup_$TS.tar.gz"

tar -czf "$TARGET" -C "$OUT_DIR" .

echo "Backup created: $TARGET"
