#!/usr/bin/env bash
# Yerel PostgreSQL'de database/central/*.sql uygula → pg_dump üret.
# Docker yoksa sistem postgresql-16 kullanır (agent / CI).
#
# Kullanım:
#   bash scripts/build-central-pg-dump.sh
#
# Çıktı:
#   database/central/dumps/finatura_central_full.sql
#   database/central/dumps/finatura_central_full.dump
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL_DIR="${ROOT}/database/central"
OUT_DIR="${SQL_DIR}/dumps"
DB="${POSTGRES_DB:-finatura_central}"
USER_NAME="${POSTGRES_USER:-finatura}"
PASS="${POSTGRES_PASSWORD:-finatura_dev}"
HOST="${PGHOST:-127.0.0.1}"
PORT="${PGPORT:-5432}"

export PGPASSWORD="$PASS"
mkdir -p "$OUT_DIR"

echo "==> Recreate ${DB} on ${HOST}:${PORT}"
if command -v sudo >/dev/null && id postgres >/dev/null 2>&1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${USER_NAME}') THEN
    CREATE ROLE ${USER_NAME} LOGIN PASSWORD '${PASS}' SUPERUSER;
  ELSE
    ALTER ROLE ${USER_NAME} WITH LOGIN PASSWORD '${PASS}' SUPERUSER;
  END IF;
END\$\$;
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE datname='${DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${DB};
CREATE DATABASE ${DB} OWNER ${USER_NAME};
SQL
else
  psql -h "$HOST" -p "$PORT" -U "$USER_NAME" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE datname='${DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${DB};
CREATE DATABASE ${DB} OWNER ${USER_NAME};
SQL
fi

echo "==> Apply central SQL"
for f in $(ls -1 "${SQL_DIR}"/[0-9][0-9]*.sql | sort); do
  echo "    $(basename "$f")"
  psql -h "$HOST" -p "$PORT" -U "$USER_NAME" -d "$DB" -v ON_ERROR_STOP=1 -f "$f" >/dev/null
done

echo "==> pg_dump"
pg_dump -h "$HOST" -p "$PORT" -U "$USER_NAME" -d "$DB" \
  --no-owner --no-acl --clean --if-exists \
  -f "${OUT_DIR}/finatura_central_full.sql"
pg_dump -h "$HOST" -p "$PORT" -U "$USER_NAME" -d "$DB" \
  --no-owner --no-acl -Fc \
  -f "${OUT_DIR}/finatura_central_full.dump"

{
  echo "-- Finatura central full dump (pg_dump)"
  echo "-- Restore: scripts/vps-restore-central-dump.sh"
  echo "-- Target ONLY: finatura_pg / finatura_central"
  echo "-- NEVER: saas_postgres / kargomkapinda_*"
  echo
  cat "${OUT_DIR}/finatura_central_full.sql"
} > "${OUT_DIR}/.tmp.sql"
mv "${OUT_DIR}/.tmp.sql" "${OUT_DIR}/finatura_central_full.sql"

echo "==> Verify users"
psql -h "$HOST" -p "$PORT" -U "$USER_NAME" -d "$DB" -c \
  "SELECT email, phone_digits, tckn, vergi_no FROM public.users ORDER BY email;"

ls -lh "${OUT_DIR}/finatura_central_full.sql" "${OUT_DIR}/finatura_central_full.dump"
echo "Tamam."
