#!/usr/bin/env bash
# Finatura — uzak finatura_pg üzerinde central SQL uygula
#
# Yalnızca VPS'te (Docker erişimi olan kullanıcı) çalıştırın:
#   sudo bash scripts/vps-apply-central-sql.sh
# veya:
#   sudo bash scripts/vps-apply-central-sql.sh 09   # yalnızca 09_*.sql
#
# Güvenlik:
#   - saas_postgres / kargomkapinda_* konteynerlerine DOKUNMAZ
#   - Hedef: finatura_pg (veya FINATURA_PG_CONTAINER)
#   - DB: finatura_central
#
set -euo pipefail

CONTAINER="${FINATURA_PG_CONTAINER:-finatura_pg}"
DB="${POSTGRES_DB:-finatura_central}"
USER_NAME="${POSTGRES_USER:-finatura}"
REPO_DIR="${FINATURA_REPO_DIR:-}"
FILTER="${1:-}" # örn. 09 → yalnızca 09_*.sql

FORBIDDEN_CONTAINERS=(saas_postgres kargomkapinda_db kargomkapinda_pg)

echo "==> Finatura central SQL → ${CONTAINER} / ${DB}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Hata: docker yok." >&2
  exit 1
fi

for c in "${FORBIDDEN_CONTAINERS[@]}"; do
  if [[ "$CONTAINER" == "$c" ]]; then
    echo "Hata: yasaklı konteyner adı: $c" >&2
    exit 1
  fi
done

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Hata: konteyner '${CONTAINER}' bulunamadı." >&2
  echo "Dokploy'da finatura-pg Application'ı deploy edilmiş mi?" >&2
  echo "Mevcut postgres-benzeri konteynerler:" >&2
  docker ps --format '{{.Names}}\t{{.Image}}' | grep -iE 'postgres|pg|finatura' || true
  exit 1
fi

# Repo yolu: arg / env / yaygın Dokploy path / cwd
if [[ -z "$REPO_DIR" ]]; then
  for cand in \
    "$(pwd)" \
    "/opt/berqenas-cloud/projects/finatura" \
    "/etc/dokploy/compose" \
    "$HOME/finatura"; do
    if [[ -d "${cand}/database/central" ]]; then
      REPO_DIR="$cand"
      break
    fi
  done
fi

if [[ -z "${REPO_DIR}" || ! -d "${REPO_DIR}/database/central" ]]; then
  echo "Hata: database/central bulunamadı. FINATURA_REPO_DIR=/path/to/finatura verin." >&2
  exit 1
fi

SQL_DIR="${REPO_DIR}/database/central"
echo "    SQL_DIR=${SQL_DIR}"

mapfile -t FILES < <(ls -1 "${SQL_DIR}"/[0-9][0-9]_*.sql | sort)
if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "Hata: SQL dosyası yok." >&2
  exit 1
fi

if [[ -n "$FILTER" ]]; then
  mapfile -t FILES < <(printf '%s\n' "${FILES[@]}" | grep "/${FILTER}_" || true)
  if [[ ${#FILES[@]} -eq 0 ]]; then
    echo "Hata: filtre '${FILTER}' ile eşleşen SQL yok." >&2
    exit 1
  fi
fi

# Sağlık
docker exec "$CONTAINER" pg_isready -U "$USER_NAME" -d "$DB" >/dev/null

for f in "${FILES[@]}"; do
  base="$(basename "$f")"
  echo "==> ${base}"
  # Konteyner içine kopyala + psql (host volume mount olmayabilir)
  docker cp "$f" "${CONTAINER}:/tmp/${base}"
  docker exec -i "$CONTAINER" \
    psql -v ON_ERROR_STOP=1 -U "$USER_NAME" -d "$DB" -f "/tmp/${base}"
  docker exec "$CONTAINER" rm -f "/tmp/${base}"
done

echo "==> Doğrulama (users kolonları)"
docker exec -i "$CONTAINER" psql -U "$USER_NAME" -d "$DB" -c \
  "SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='users'
   ORDER BY ordinal_position;"

docker exec -i "$CONTAINER" psql -U "$USER_NAME" -d "$DB" -c \
  "SELECT email, phone_digits, tckn, vergi_no
   FROM public.users WHERE deleted_at IS NULL ORDER BY email;"

echo "Tamam. finatura-api'yi AUTH_PROVIDER=central + CENTRAL_DATABASE_URL ile redeploy edin."
echo "Kontrol: curl -sS https://api.finatura.app/ready  → centralDb: true"
