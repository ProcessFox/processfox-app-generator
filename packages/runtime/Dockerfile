# Frontend image (generator SPA) — built from the monorepo root context.
# Usage: docker build -f packages/runtime/Dockerfile -t processfox-frontend .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/runtime/package.json packages/runtime/package.json
COPY packages/agent/package.json packages/agent/package.json
RUN npm ci
COPY . .
RUN npm run build -w @processfox/runtime

FROM nginx:alpine
COPY packages/runtime/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/runtime/dist /usr/share/nginx/html
EXPOSE 80
