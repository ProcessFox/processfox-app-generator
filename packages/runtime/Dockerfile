# Frontend image (generator SPA) — built from the monorepo root context.
# Usage: docker build -f packages/runtime/Dockerfile -t processfox-frontend .

FROM node:22-slim AS build
WORKDIR /app
# Raise the V8 heap so the Vite/Rollup bundle doesn't hit the default heap limit
# on constrained build hosts.
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/runtime/package.json packages/runtime/package.json
COPY packages/agent/package.json packages/agent/package.json
# `npm install` (not ci): re-resolves platform-specific native optional deps
# (tailwind oxide, lightningcss, rollup) for the build platform. --include=dev
# guarantees build tooling even if NODE_ENV=production is set in the environment.
RUN npm install --include=dev --no-audit --no-fund
COPY . .
RUN npm run build -w @processfox/runtime

FROM nginx:alpine
COPY packages/runtime/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/runtime/dist /usr/share/nginx/html
EXPOSE 80
