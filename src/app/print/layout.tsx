import "../globals.css";

export const metadata = { title: "Документ" };

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-white">{children}</body>
    </html>
  );
}
