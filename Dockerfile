# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package.json ./
RUN yarn install

COPY . .
RUN npm run build

# ── Production stage ─────────────────────────────────────────
FROM node:22-alpine

WORKDIR /usr/src/app

# Run as non-root
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -G appgroup -u 1001

COPY package.json ./
RUN yarn install --production && yarn cache clean

COPY --from=builder /usr/src/app/dist ./dist
COPY sql ./sql

ENV NODE_ENV=production

EXPOSE 3001

USER appuser

# Migrations run automatically on app start via migrationsRun: true
CMD ["node", "dist/src/main.js"]