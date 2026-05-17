"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintBar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-end gap-2 p-3 bg-white border-b">
      {children}
      <Button onClick={() => window.print()} size="sm">
        <Printer className="h-4 w-4 mr-2" />
        Печать / PDF
      </Button>
    </div>
  );
}
