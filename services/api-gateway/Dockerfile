# Finatura API Gateway — Dokploy / Docker production
# Multi-stage: Node build → Node alpine runtime
#
# Dokploy: Dockerfile path = services/api-gateway/Dockerfile
#          Context         = services/api-gateway
#          Port            = 3000
# Domain:  api.finatura.app
#
# Varsayılan AUTH_PROVIDER=central — CENTRAL_DATABASE_URL gerekir
# (Dokploy: finatura_pg). Yerel stub: AUTH_PROVIDER=stub override.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV AUTH_PROVIDER=central

RUN apk add --no-cache wget

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

USER node
CMD ["node", "dist/index.js"]
