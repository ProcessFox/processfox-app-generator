# Backend image (generator agent + persistence + export) — built from the
# monorepo root context.
# Usage: docker build -f packages/agent/Dockerfile -t processfox-backend .

FROM node:22-slim AS build
WORKDIR /app
# Raise the V8 heap so the Vite/Rollup bundle (xlsx + docxtemplater inlined)
# doesn't hit the default heap limit on constrained build hosts.
ENV NODE_OPTIONS=--max-old-space-size=4096
# openssl + ca-certificates: Prisma engine download/generate.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/runtime/package.json packages/runtime/package.json
COPY packages/agent/package.json packages/agent/package.json
# `npm install` (not ci): re-resolves platform-specific native optional deps
# (tailwind oxide, lightningcss, rollup) for the build platform. --include=dev
# guarantees build tooling even if NODE_ENV=production is set in the environment.
RUN npm install --include=dev --no-audit --no-fund
COPY . .
# Build the single-file player template (used by the export endpoint) and the
# Prisma client (Postgres store).
RUN npm run build:player -w @processfox/runtime
RUN npx prisma generate --schema packages/agent/prisma/schema.prisma

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
ENV PROCESSFOX_PLAYER_TEMPLATE=/app/packages/runtime/dist-player/player.html
ENV PORT=8787
EXPOSE 8787
# Sync the schema to Postgres, then start the server.
CMD ["sh", "-c", "npm run prisma:push -w @processfox/agent && npm run start -w @processfox/agent"]
