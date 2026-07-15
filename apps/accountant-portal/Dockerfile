# Finatura Mali Müşavir Portalı — Dokploy / Docker production image
# Multi-stage: Node (Vite build) → nginx (static SPA)
#
# Dokploy: Dockerfile path = apps/accountant-portal/Dockerfile
#          Docker context  = apps/accountant-portal
#          Port            = 80
# Domain:  mm.finatura.app

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Production API Gateway (override with --build-arg)
ARG VITE_API_GATEWAY_URL=https://api.finatura.app
ARG VITE_AUTH_MODE=auto
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
ENV VITE_AUTH_MODE=$VITE_AUTH_MODE

RUN npm run build

FROM nginx:1.27-alpine AS production
RUN apk add --no-cache wget

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
