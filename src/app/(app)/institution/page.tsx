import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstitutionForm } from "./InstitutionForm";

export default async function InstitutionPage() {
  await requireRole("HEAD");
  const inst = await prisma.institution.findFirst();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Реквизиты учреждения</h1>
        <p className="text-muted-foreground text-sm">Используются в шапке всех документов и отчётов</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Данные учреждения</CardTitle></CardHeader>
        <CardContent>
          <InstitutionForm initial={inst ?? undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
