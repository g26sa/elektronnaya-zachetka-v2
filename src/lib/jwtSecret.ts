const DEV_FALLBACK = "dev-only-please-change-in-production-32-chars-min";

function resolveJwtSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET?.trim();
  if (raw && raw.length >= 32) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET обязателен в production (минимум 32 символа). Задайте в .env"
    );
  }
  if (!raw) {
    console.warn("[auth] JWT_SECRET не задан — используется dev-ключ только для разработки");
  }
  return new TextEncoder().encode(raw || DEV_FALLBACK);
}

export const jwtSecret = resolveJwtSecret();
