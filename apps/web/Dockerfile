# Finatura marketing site — Dokploy / Docker production image
# Multi-stage: Node (Vite build) → nginx (static SPA)
#
# Dokploy (Application → Dockerfile):
#   Dockerfile path = apps/web/Dockerfile
#   Docker context  = apps/web
#   Port            = 80
#   Health path     = /health

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production

# wget is used by HEALTHCHECK (available on alpine)
RUN apk add --no-cache wget

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
