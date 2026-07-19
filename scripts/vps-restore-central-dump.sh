#!/usr/bin/env bash
# finatura_pg üzerine pg_dump restore (SQL erişimi yoksa / uzak iç ağ).
#
# KURAL: agent bu ortamdan çalıştırır (SSH ile VPS veya docker exec).
# Yalnızca finatura_pg — RetailEX/Kargo YASAK.
#
# Kullanım (VPS'te):
#   sudo bash scripts/vps-restore-central-dump.sh
#   sudo FINATURA_REPO_DIR=/path/to/finatura bash scripts/vps-restore-central-dump.sh
#
set -euo pipefail

CONTAINER="${FINATURA_PG_CONTAINER:-finatura_pg}"
DB="${POSTGRES_DB:-finatura_central}"
USER_NAME="${POSTGRES_USER:-finatura}"
REPO_DIR="${FINATURA_REPO_DIR:-}"
DUMP_SQL=""
DUMP_CUSTOM=""

FORBIDDEN=(saas_postgres kargomkapinda_db kargomkapinda_pg)

echo "==> Restore dump → ${CONTAINER} / ${DB}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Hata: docker yok." >&2
  exit 1
fi

for c in "${FORBIDDEN[@]}"; do
  if [[ "$CONTAINER" == "$c" ]]; then
    echo "Hata: yasaklı konteyner: $c" >&2
    exit 1
  fi
done

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Hata: '${CONTAINER}' yok. Önce finatura-pg deploy edin." >&2
  docker ps --format '{{.Names}}\t{{.Image}}' | grep -iE 'postgres|pg|finatura' || true
  exit 1
fi

if [[ -z "$REPO_DIR" ]]; then
  for cand in "$(pwd)" "/opt/berqenas-cloud/projects/finatura" "$HOME/finatura"; do
    if [[ -f "${cand}/database/central/dumps/finatura_central_full.sql" ]]; then
      REPO_DIR="$cand"
      break
    fi
  done
fi

DUMP_SQL="${REPO_DIR}/database/central/dumps/finatura_central_full.sql"
DUMP_CUSTOM="${REPO_DIR}/database/central/dumps/finatura_central_full.dump"

if [[ ! -f "$DUMP_SQL" ]]; then
  echo "Hata: dump yok: $DUMP_SQL" >&2
  echo "Önce: bash scripts/build-central-pg-dump.sh" >&2
  exit 1
fi

docker exec "$CONTAINER" pg_isready -U "$USER_NAME" -d "$DB" >/dev/null

echo "==> Restore plain SQL dump (clean+if-exists)"
docker cp "$DUMP_SQL" "${CONTAINER}:/tmp/finatura_central_full.sql"
docker exec -i "$CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$USER_NAME" -d "$DB" \
  -f /tmp/finatura_central_full.sql
docker exec "$CONTAINER" rm -f /tmp/finatura_central_full.sql

if [[ -f "$DUMP_CUSTOM" ]]; then
  echo "    (custom .dump da mevcut; plain SQL restore tamamlandı)"
fi

echo "==> Doğrulama"
docker exec -i "$CONTAINER" psql -U "$USER_NAME" -d "$DB" -c \
  "SELECT email, phone_digits, tckn, vergi_no FROM public.users WHERE deleted_at IS NULL ORDER BY email;"

echo "Tamam. API: AUTH_PROVIDER=central + CENTRAL_DATABASE_URL → finatura_pg"
