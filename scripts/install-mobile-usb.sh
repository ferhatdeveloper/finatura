#!/usr/bin/env bash
# USB bağlı telefona Finatura APK kur (yerel makinede çalıştır).
#
# Önkoşul:
#   - USB debugging açık, telefon bu bilgisayara bağlı
#   - adb PATH'te (Android platform-tools)
#   - APK: apps/mobile/dist/finatura-*-release.apk  veya önce build
#
# Kullanım:
#   bash scripts/install-mobile-usb.sh
#   bash scripts/install-mobile-usb.sh --build
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="${ROOT}/apps/mobile"
DIST="${MOBILE}/dist"
DO_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --build|-b) DO_BUILD=true ;;
  esac
done

if ! command -v adb >/dev/null 2>&1; then
  echo "adb bulunamadı. Android platform-tools kurun ve PATH'e ekleyin." >&2
  exit 1
fi

adb start-server >/dev/null
DEVICES="$(adb devices | awk 'NR>1 && $2=="device" {print $1}')"
COUNT="$(echo "$DEVICES" | grep -c . || true)"

if [ "${COUNT}" -eq 0 ]; then
  echo "USB telefon görünmüyor." >&2
  echo "Kontrol: kablo, USB debugging, telefonda 'Bu bilgisayara izin ver'." >&2
  adb devices -l >&2
  exit 1
fi

if [ "${COUNT}" -gt 1 ]; then
  echo "Birden fazla cihaz var; ilki kullanılacak:" >&2
  echo "$DEVICES" >&2
fi

SERIAL="$(echo "$DEVICES" | head -1)"
echo "==> Cihaz: ${SERIAL}"

APK="$(ls -1t "${DIST}"/finatura-*-release.apk 2>/dev/null | head -1 || true)"
if [ "$DO_BUILD" = true ] || [ -z "${APK}" ]; then
  echo "==> APK yok veya --build: derleniyor…"
  bash "${ROOT}/scripts/build-mobile-apk.sh"
  APK="$(ls -1t "${DIST}"/finatura-*-release.apk | head -1)"
fi

echo "==> Kurulum: ${APK}"
adb -s "$SERIAL" install -r "$APK"
echo "==> Açılıyor…"
adb -s "$SERIAL" shell monkey -p com.finatura.finatura_mobile -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
echo "Tamam. Giriş: demo@finatura.app / demo1234"
