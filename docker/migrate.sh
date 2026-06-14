#!/bin/sh
set -e

MASTER_URL="sqlserver://db:1433;user=sa;password=${DB_PASSWORD};trustServerCertificate=true;encrypt=true"

echo "==> Создание базы данных ezk (если не существует)..."
printf "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ezk') CREATE DATABASE ezk;" \
  | npx prisma db execute --url "$MASTER_URL" --stdin

echo "==> Применение схемы Prisma (db push)..."
npx prisma db push --skip-generate --accept-data-loss

if [ "$SEED" = "1" ]; then
  echo "==> Заполнение демо-данными (seed)..."
  npm run db:seed
fi

echo "==> Миграция завершена."
