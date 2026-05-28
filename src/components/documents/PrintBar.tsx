"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, Loader2 } from "lucide-react";

async function savePdf(filename: string, setLoading: (v: boolean) => void) {
  setLoading(true);
  try {
    const path = window.location.pathname + window.location.search;
    const params = new URLSearchParams({ path, name: filename });
    const res = await fetch(`/api/pdf?${params}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Не удалось создать PDF");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename + ".pdf";
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setLoading(false);
  }
}

export function PrintBar({
  children,
  filename = "Документ",
}: {
  children?: React.ReactNode;
  filename?: string;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);

  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-end gap-2 p-3 bg-white border-b">
      {children}

      <Button variant="outline" size="sm" disabled={pdfLoading} onClick={() => savePdf(filename, setPdfLoading)}>
        {pdfLoading
          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          : <FileDown className="h-4 w-4 mr-2" />}
        {pdfLoading ? "Создаём PDF…" : "Сохранить PDF"}
      </Button>

      <Button onClick={() => window.print()} size="sm">
        <Printer className="h-4 w-4 mr-2" />
        Печать
      </Button>
    </div>
  );
}
