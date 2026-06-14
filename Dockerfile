# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# ---- зависимости ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- сборка ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Фиктивный URL только для генерации клиента и сборки (реальный задаётся в compose)
ENV DATABASE_URL="sqlserver://localhost:1433;database=ezk;trustServerCertificate=true"
RUN npx prisma generate
RUN npm run build

# ---- миграция/сидинг (одноразовый job) ----
FROM builder AS migrator
COPY docker/migrate.sh /app/migrate.sh
RUN chmod +x /app/migrate.sh
ENTRYPOINT ["/app/migrate.sh"]

# ---- продакшен ----
FROM base AS runner
ENV NODE_ENV=production
# Chromium нужен для генерации PDF (см. src/app/api/pdf/route.ts)
RUN apk add --no-cache chromium
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
