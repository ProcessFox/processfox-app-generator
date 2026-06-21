# Backend image (generator agent + persistence) — built from the monorepo root
# context. No Vite build here: app export is client-side (the frontend serves the
# player template), so the backend only needs Node + Prisma.
# Usage: docker build -f packages/agent/Dockerfile -t processfox-backend .

FROM node:22-slim AS build
WORKDIR /app
# openssl + ca-certificates: Prisma engine download/generate.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/runtime/package.json packages/runtime/package.json
COPY packages/agent/package.json packages/agent/package.json
# `npm install` (not ci): re-resolves platform-specific native optional deps for
# the build platform. --include=dev keeps tsx/prisma even if NODE_ENV=production.
RUN npm install --include=dev --no-audit --no-fund
COPY . .
# Generate the Prisma client (Postgres store).
RUN npx prisma generate --schema packages/agent/prisma/schema.prisma

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
ENV PORT=8787
EXPOSE 8787
# Sync the schema to Postgres, then start the server.
CMD ["sh", "-c", "npm run prisma:push -w @processfox/agent && npm run start -w @processfox/agent"]
