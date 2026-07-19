#!/usr/bin/env bash
# Finatura Android release APK (production API).
#
# Önkoşul: Flutter + Android SDK (ANDROID_HOME).
# Çıktı: apps/mobile/dist/finatura-<version>-release.apk
#
# Kullanım:
#   bash scripts/build-mobile-apk.sh
#   API_BASE_URL=https://api.finatura.app bash scripts/build-mobile-apk.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="${ROOT}/apps/mobile"
OUT_DIR="${MOBILE}/dist"
API_BASE_URL="${API_BASE_URL:-https://api.finatura.app}"
DOC_URL="${DOCUMENT_AGENT_BASE_URL:-$API_BASE_URL}"

if ! command -v flutter >/dev/null 2>&1; then
  echo "flutter bulunamadı. PATH'e ekleyin veya Flutter kurun." >&2
  exit 1
fi

VERSION="$(grep -E '^version:' "${MOBILE}/pubspec.yaml" | head -1 | awk '{print $2}' | cut -d+ -f1)"
OUT_NAME="finatura-${VERSION}-release.apk"

echo "==> pub get"
(cd "$MOBILE" && flutter pub get)

echo "==> build apk (API=${API_BASE_URL})"
(cd "$MOBILE" && flutter build apk --release \
  --dart-define=API_BASE_URL="${API_BASE_URL}" \
  --dart-define=DOCUMENT_AGENT_BASE_URL="${DOC_URL}")

mkdir -p "$OUT_DIR"
cp "${MOBILE}/build/app/outputs/flutter-apk/app-release.apk" "${OUT_DIR}/${OUT_NAME}"
sha256sum "${OUT_DIR}/${OUT_NAME}"
ls -lh "${OUT_DIR}/${OUT_NAME}"
echo "Tamam: ${OUT_DIR}/${OUT_NAME}"
