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
RUN flutter build web --release --base-href /

FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/web /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
