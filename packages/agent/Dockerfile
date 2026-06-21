# Backend image (generator agent + persistence) — built from the monorepo root
# context. No Vite build and no Prisma here: app export is client-side, and V1
# persistence uses the file store (mounted volume). The agent runs via tsx.
# Usage: docker build -f packages/agent/Dockerfile -t processfox-backend .

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/runtime/package.json packages/runtime/package.json
COPY packages/agent/package.json packages/agent/package.json
# Remove the (macOS-generated) lockfile first (npm/cli#4828). --include=dev keeps
# tsx available even though NODE_ENV=production.
RUN rm -f package-lock.json && npm install --include=dev --no-audit --no-fund
COPY . .
# App specs are written here; mount a volume at /data so they survive redeploys.
ENV PROCESSFOX_DATA_DIR=/data
ENV PORT=8787
EXPOSE 8787
CMD ["npm", "run", "start", "-w", "@processfox/agent"]
