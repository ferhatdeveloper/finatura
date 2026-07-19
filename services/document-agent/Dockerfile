# Finatura Document Agent — OCR
# Dokploy: context = services/document-agent

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
ENV PORT=3300

RUN apk add --no-cache wget

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3300

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3300/health || exit 1

USER node
CMD ["node", "dist/index.js"]
