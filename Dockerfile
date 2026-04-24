# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ─────────────────────────────────────────
FROM node:20-alpine

WORKDIR /usr/src/app

# Run as non-root
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -G appgroup -u 1001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3001

USER appuser

CMD ["node", "dist/main.js"]
