# Finatura e-Invoice Integrator
# Build context: repo root (packages/invoice-transformers + service)

FROM node:20-alpine AS build
WORKDIR /app

COPY packages/invoice-transformers/package.json packages/invoice-transformers/package-lock.json ./packages/invoice-transformers/
COPY packages/invoice-transformers/tsconfig.json ./packages/invoice-transformers/
COPY packages/invoice-transformers/src ./packages/invoice-transformers/src
WORKDIR /app/packages/invoice-transformers
RUN npm ci && npm run build

WORKDIR /app/services/einvoice-integrator
COPY services/einvoice-integrator/package.json services/einvoice-integrator/package-lock.json ./
COPY services/einvoice-integrator/tsconfig.json ./
COPY services/einvoice-integrator/src ./src
RUN npm ci && npm run build && npm prune --omit=dev

FROM node:20-alpine AS production
WORKDIR /app/services/einvoice-integrator

ENV NODE_ENV=production
ENV PORT=3400

RUN apk add --no-cache wget

COPY --from=build /app/packages/invoice-transformers /app/packages/invoice-transformers
COPY --from=build /app/services/einvoice-integrator/package.json ./
COPY --from=build /app/services/einvoice-integrator/package-lock.json ./
COPY --from=build /app/services/einvoice-integrator/node_modules ./node_modules
COPY --from=build /app/services/einvoice-integrator/dist ./dist

EXPOSE 3400

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3400/health || exit 1

USER node
CMD ["node", "dist/index.js"]
