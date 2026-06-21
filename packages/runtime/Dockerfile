# Frontend image (generator SPA + standalone player template) — built from the
# monorepo root context. This is the ONLY image that runs Vite. It builds the SPA
# and the single-file player, and nginx serves the player at /player.html so the
# browser can produce standalone-app exports client-side.
# Usage: docker build -f packages/runtime/Dockerfile -t processfox-frontend .

FROM node:22-slim AS build
WORKDIR /app
# Raise the V8 heap so the Vite/Rollup bundles don't hit the default heap limit
# on constrained build hosts. The two builds below run sequentially (peak = one).
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/runtime/package.json packages/runtime/package.json
COPY packages/agent/package.json packages/agent/package.json
# `npm install` (not ci): re-resolves platform-specific native optional deps
# (tailwind oxide, lightningcss, rollup). --include=dev keeps the build tooling.
RUN npm install --include=dev --no-audit --no-fund
COPY . .
# build:app = SPA (no tsc — that's a CI step). build:player = single-file export
# template. Sequential, so peak memory is one Vite build at a time.
RUN npm run build:app -w @processfox/runtime
RUN npm run build:player -w @processfox/runtime

FROM nginx:alpine
COPY packages/runtime/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/runtime/dist /usr/share/nginx/html
# The standalone player template, served at /player.html for client-side export.
COPY --from=build /app/packages/runtime/dist-player/player.html /usr/share/nginx/html/player.html
EXPOSE 80
