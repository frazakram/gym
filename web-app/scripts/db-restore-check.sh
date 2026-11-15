#!/usr/bin/env bash
# Proves a backup restores: restores it into a new, temporary database and
# compares every table's row count with the source database.
#
#   SOURCE_URL=postgres://...          database the backup was taken from (read only)
#   RESTORE_SERVER_URL=postgres://...  a server where a temporary database may be
#                                      created and dropped (connect as a user with
#                                      CREATEDB; never the production server)
#   scripts/db-restore-check.sh <backup-file>
#
# Exit 0: every table restored with the same row count. Exit 1: any difference.
# Run against a quiet source: rows written after the backup show up as a difference.
set -euo pipefail

backup_file="${1:?Usage: scripts/db-restore-check.sh <backup-file>}"
: "${SOURCE_URL:?Set SOURCE_URL to the database the backup was taken from}"
: "${RESTORE_SERVER_URL:?Set RESTORE_SERVER_URL to a server for the temporary database}"
pg_bin="${PG_BIN:+$PG_BIN/}"

scratch_db="gym_restore_check_$(date -u +%Y%m%d%H%M%S)_$$"
# Same server and credentials, different database name.
scratch_url="$(printf '%s' "$RESTORE_SERVER_URL" | sed -E "s#^(postgres(ql)?://[^/]+)/[^?]*#\1/$scratch_db#")"

drop_scratch_db() {
  "${pg_bin}psql" -q "$RESTORE_SERVER_URL" -c "DROP DATABASE IF EXISTS \"$scratch_db\"" > /dev/null
}
trap drop_scratch_db EXIT

"${pg_bin}psql" -q "$RESTORE_SERVER_URL" -c "CREATE DATABASE \"$scratch_db\"" > /dev/null
"${pg_bin}pg_restore" --no-owner --no-privileges --exit-on-error --dbname="$scratch_url" "$backup_file"

# "table count" per line, sorted, for every table in the public schema.
row_counts() {
  local url="$1" table
  for table in $("${pg_bin}psql" -At "$url" -c \
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"); do
    printf '%s %s\n' "$table" "$("${pg_bin}psql" -At "$url" -c "SELECT count(*) FROM public.\"$table\"")"
  done
}

source_counts="$(row_counts "$SOURCE_URL")"
restored_counts="$(row_counts "$scratch_url")"

if [ "$source_counts" = "$restored_counts" ]; then
  echo "Restore check passed: $(printf '%s\n' "$restored_counts" | wc -l | tr -d ' ') tables, row counts match."
  exit 0
fi
echo "Restore check FAILED: row counts differ (source < > restored):" >&2
diff <(printf '%s\n' "$source_counts") <(printf '%s\n' "$restored_counts") >&2 || true
exit 1
