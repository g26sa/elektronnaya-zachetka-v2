import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Электронная зачётная книжка",
  description: "Цифровой документ студента — оценки, практика, ВКР, экспорт в PDF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
