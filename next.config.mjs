/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Скрываем служебный индикатор сборки Next.js в левом нижнем углу
  // (он функционален, но не нужен пользователям приложения).
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
};

export default nextConfig;
