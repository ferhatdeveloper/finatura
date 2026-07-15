# Finatura marketing site — Dokploy / Docker production image
# Multi-stage: Node (Vite build) → nginx (static SPA)
#
# Dokploy: Dockerfile path = apps/web/Dockerfile
#          Docker context  = apps/web
#          Port            = 80

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Flutter app host for Giriş / Kayıt CTAs (build-time; Vite embeds it)
ARG VITE_APP_URL=https://login.finatura.app
ENV VITE_APP_URL=$VITE_APP_URL

RUN npm run build

FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
