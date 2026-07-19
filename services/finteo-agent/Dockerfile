# Finatura Finteo Agent — banka poll worker
# Build context: repo root (matching-agent + finteo-agent)

FROM node:20-alpine AS build
WORKDIR /app

COPY services/matching-agent/package.json services/matching-agent/package-lock.json ./services/matching-agent/
COPY services/matching-agent/tsconfig.json ./services/matching-agent/
COPY services/matching-agent/src ./services/matching-agent/src
WORKDIR /app/services/matching-agent
RUN npm ci && npm run build

WORKDIR /app/services/finteo-agent
COPY services/finteo-agent/package.json services/finteo-agent/package-lock.json ./
COPY services/finteo-agent/tsconfig.json ./
COPY services/finteo-agent/src ./src
COPY services/finteo-agent/fixtures ./fixtures
RUN npm ci && npm run build && npm prune --omit=dev

FROM node:20-alpine AS production
WORKDIR /app/services/finteo-agent

ENV NODE_ENV=production

COPY --from=build /app/services/matching-agent /app/services/matching-agent
COPY --from=build /app/services/finteo-agent/package.json ./
COPY --from=build /app/services/finteo-agent/package-lock.json ./
COPY --from=build /app/services/finteo-agent/node_modules ./node_modules
COPY --from=build /app/services/finteo-agent/dist ./dist
COPY --from=build /app/services/finteo-agent/fixtures ./fixtures

USER node
CMD ["node", "dist/index.js"]
