import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
  ico: "image/x-icon",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  // Prevent directory traversal
  const safe = segments.map((s) => s.replace(/\.\./g, ""));
  const filePath = path.join(process.cwd(), "public", "uploads", ...safe);

  try {
    const buffer = await readFile(filePath);
    const ext = safe[safe.length - 1].split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
