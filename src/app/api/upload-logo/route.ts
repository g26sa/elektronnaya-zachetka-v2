import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertCan } from "@/lib/rbac";
import {
  deleteLogoFileIfLocal,
  extensionFromFile,
  isAllowedLogoExtension,
  writeLogoFile,
} from "@/lib/institution-logo";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    assertCan(session, "institution:edit");

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    const ext = extensionFromFile(file);
    if (!ext || !isAllowedLogoExtension(ext)) {
      return NextResponse.json(
        { error: "Допустимы PNG, JPG, SVG, WEBP, ICO" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const inst = await prisma.institution.findFirst();
    if (inst?.logoUrl) {
      await deleteLogoFileIfLocal(inst.logoUrl);
    }

    const logoUrl = await writeLogoFile(buffer, ext);

    if (inst) {
      await prisma.institution.update({ where: { id: inst.id }, data: { logoUrl } });
    } else {
      await prisma.institution.create({ data: { name: "Учреждение", logoUrl } });
    }

    revalidatePath("/", "layout");
    revalidatePath("/institution");

    return NextResponse.json({ logoUrl, cacheKey: Date.now() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка загрузки";
    if (message === "Доступ запрещён") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
