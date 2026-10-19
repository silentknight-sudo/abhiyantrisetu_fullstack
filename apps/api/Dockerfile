# Abhiyantri Setu API and worker image. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t setu-api .
# Run:      node dist/main.js        (default: HTTP API on $PORT)
# Worker:   node dist/worker.js      (BullMQ jobs; needs REDIS_URL)
# Migrate:  node dist/db/migrate.js  (one-off task before each release)

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY . .
# Only the API and the shared packages it depends on.
RUN pnpm install --frozen-lockfile --filter "@setu/api..."
# pnpm runs the filtered builds in dependency order: shared packages first, then the API.
RUN pnpm --filter "@setu/api..." run build
RUN pnpm --filter @setu/api deploy --prod --legacy /out

FROM node:22-alpine
ENV NODE_ENV=production PORT=4000
WORKDIR /app
RUN addgroup -S setu && adduser -S setu -G setu
COPY --from=build --chown=setu:setu /out/package.json ./package.json
COPY --from=build --chown=setu:setu /out/node_modules ./node_modules
COPY --from=build --chown=setu:setu /out/dist ./dist
COPY --from=build --chown=setu:setu /out/drizzle ./drizzle
USER setu
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/v1/health" >/dev/null || exit 1
CMD ["node", "dist/main.js"]
