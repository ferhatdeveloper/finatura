# Finatura — VPS (Berqenas / Dokploy) tek seferlik deploy yardımcısı
#
# Çalıştırma (sunucuda, root veya docker grubundaki kullanıcı):
#   curl -fsSL ... | bash
# veya:
#   sudo bash scripts/vps-dokploy-finatura-web.sh
#
# Bu script:
#   - RetailEX / Kargo DB’lerine dokunmaz (postgres yok, host port yok)
#   - finatura.app için konteyneri berqenas_net üzerinde ayağa kaldırır
#   - Traefik/Dokploy domain etiketlerini eklemez — domain Dokploy UI’dan verilmeli
#
# Önerilen yol: Dokploy UI → Compose Path = docker-compose.dokploy.yml
# Bu script, Dokploy dışında acil smoke deploy içindir.

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/berqenas-cloud}"
PROJECT_DIR="${PROJECT_DIR:-${INSTALL_DIR}/projects/finatura}"
REPO_URL="${REPO_URL:-https://github.com/ferhatdeveloper/finatura.git}"
BRANCH="${BRANCH:-main}"
CONTAINER_NAME="finatura_web"
IMAGE_NAME="finatura-web:latest"
NETWORK_NAME="berqenas_net"

echo "==> Finatura marketing web — çakışmasız deploy"
echo "    PROJECT_DIR=${PROJECT_DIR}"
echo "    BRANCH=${BRANCH}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Hata: docker yok." >&2
  exit 1
fi

if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
  echo "Hata: Docker ağı '${NETWORK_NAME}' yok (RetailEX/Dokploy beklenir)." >&2
  exit 1
fi

# Güvenlik: bilinen RetailEX/Kargo konteynerlerine dokunma
for c in saas_postgres kargomkapinda_db retailex_frontend retailex_api_gateway; do
  if docker inspect "$c" >/dev/null 2>&1; then
    echo "    (bilgi) mevcut korunan konteyner: $c — dokunulmayacak"
  fi
done

mkdir -p "$(dirname "${PROJECT_DIR}")"
if [[ -d "${PROJECT_DIR}/.git" ]]; then
  echo "==> git pull ${BRANCH}"
  git -C "${PROJECT_DIR}" fetch origin
  git -C "${PROJECT_DIR}" checkout "${BRANCH}"
  git -C "${PROJECT_DIR}" pull --ff-only origin "${BRANCH}"
else
  echo "==> git clone"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${PROJECT_DIR}"
fi

echo "==> docker build (apps/web)"
docker build -t "${IMAGE_NAME}" -f "${PROJECT_DIR}/apps/web/Dockerfile" "${PROJECT_DIR}/apps/web"

echo "==> recreate ${CONTAINER_NAME} (host port YOK, ağ=${NETWORK_NAME})"
docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --network "${NETWORK_NAME}" \
  --health-cmd='wget -qO- http://127.0.0.1/health || exit 1' \
  --health-interval=30s \
  --health-timeout=5s \
  --health-retries=3 \
  "${IMAGE_NAME}"

echo "==> sağlık"
sleep 2
docker exec "${CONTAINER_NAME}" wget -qO- http://127.0.0.1/health || true
echo
echo "Tamam. Domain için Dokploy → Domains: finatura.app → servis/container port 80"
echo "veya mevcut Traefik’e Host(\`finatura.app\`) kuralı ekleyin."
echo "NOT: :5432 / saas_postgres / kargomkapinda_* değişmedi."
