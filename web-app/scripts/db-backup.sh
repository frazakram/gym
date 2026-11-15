#!/usr/bin/env bash
# Full logical backup of the app database (pg_dump custom format).
#
#   DATABASE_URL=postgres://... scripts/db-backup.sh [output-dir]
#
# Prints the path of the backup file. The URL is never printed (it holds the
# password). pg_dump must be at least the server's major version; set PG_BIN
# to its directory if it is not on PATH (macOS: /opt/homebrew/opt/libpq/bin).
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the database to back up}"
pg_bin="${PG_BIN:+$PG_BIN/}"
output_dir="${1:-backups}"
mkdir -p "$output_dir"

backup_file="$output_dir/gym-$(date -u +%Y%m%dT%H%M%SZ).dump"
"${pg_bin}pg_dump" --format=custom --no-owner --no-privileges --file="$backup_file" "$DATABASE_URL"

# A dump that pg_restore cannot list is not a backup.
"${pg_bin}pg_restore" --list "$backup_file" > /dev/null
echo "$backup_file"
