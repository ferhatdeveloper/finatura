# Finatura Flutter Web — Dokploy / Docker production image
# Multi-stage: Flutter (build web) → nginx (static SPA)
#
# Dokploy: Dockerfile path = apps/mobile/Dockerfile
#          Docker context  = apps/mobile
#          Port            = 80
# Hosts:   app.finatura.app  +  login.finatura.app  (aynı image)

FROM ghcr.io/cirruslabs/flutter:3.35.7 AS build
WORKDIR /app

RUN flutter config --enable-web

COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

COPY . .

# Production API Gateway (override with --build-arg API_BASE_URL=…)
ARG API_BASE_URL=https://api.finatura.app
RUN flutter build web --release --base-href / \
  --dart-define=API_BASE_URL=${API_BASE_URL}

FROM nginx:1.27-alpine AS production
RUN apk add --no-cache wget
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/web /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
