# Backend image (generator agent + persistence + export) — built from the
# monorepo root context.
# Usage: docker build -f packages/agent/Dockerfile -t processfox-backend .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/runtime/package.json packages/runtime/package.json
COPY packages/agent/package.json packages/agent/package.json
RUN npm ci
COPY . .
# Build the single-file player template (used by the export endpoint) and the
# Prisma client (Postgres store).
RUN npm run build:player -w @processfox/runtime
RUN npx prisma generate --schema packages/agent/prisma/schema.prisma

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
ENV PROCESSFOX_PLAYER_TEMPLATE=/app/packages/runtime/dist-player/player.html
ENV PORT=8787
EXPOSE 8787
# Sync the schema to Postgres, then start the server.
CMD ["sh", "-c", "npm run prisma:push -w @processfox/agent && npm run start -w @processfox/agent"]
