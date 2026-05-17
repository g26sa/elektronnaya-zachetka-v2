import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { renderTemplate } from "@/lib/template";
import { buildStudentContext } from "@/lib/templateContext";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params; // не используется — превью применяется к произвольному студенту
  const session = await getSession();
  assertCan(session, "template:edit");

  const body = (await req.json()) as { content?: string; studentId?: string };
  if (!body.content) return NextResponse.json({ error: "no content" }, { status: 400 });
  if (!body.studentId) return NextResponse.json({ html: "<p>Нет студента для предпросмотра</p>" });

  try {
    const ctx = await buildStudentContext(body.studentId);
    const html = renderTemplate(body.content, ctx as unknown as Record<string, unknown>);
    return NextResponse.json({ html });
  } catch (e) {
    return NextResponse.json(
      { html: `<pre style="color:#b91c1c">${(e as Error).message}</pre>` },
      { status: 200 }
    );
  }
}
