/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Скрываем служебный индикатор сборки Next.js в левом нижнем углу
  // (он функционален, но не нужен пользователям приложения).
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  // Автономная сборка для Docker (копирует только нужные node_modules в .next/standalone)
  output: "standalone",
  // Без этого в standalone-сборке отсутствует бинарник Prisma Query Engine
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
