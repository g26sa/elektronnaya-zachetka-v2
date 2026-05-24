import "../globals.css";

export const metadata = { title: "Документ" };

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white min-h-screen">
      {children}
    </div>
  );
}
