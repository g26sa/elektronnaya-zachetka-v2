import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

export const LOGO_EXTENSIONS = ["png", "jpg", "jpeg", "svg", "webp", "ico"] as const;

/** Путь к файлу в public/ по URL вида /uploads/logo-123.png */
export function resolvePublicFilePath(webPath: string): string {
  const relative = webPath.replace(/^\/+/, "").replace(/\\/g, "/");
  const segments = relative.split("/").filter(Boolean);
  return path.join(process.cwd(), "public", ...segments);
}

export function extensionFromFile(file: File): string | null {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && LOGO_EXTENSIONS.includes(fromName as (typeof LOGO_EXTENSIONS)[number])) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  const mime: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/svg+xml": "svg",
    "image/webp": "webp",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
  };
  const fromMime = mime[file.type];
  return fromMime ?? null;
}

export function isAllowedLogoExtension(ext: string): boolean {
  return LOGO_EXTENSIONS.includes(ext as (typeof LOGO_EXTENSIONS)[number]);
}

export async function ensureUploadsDir(): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function writeLogoFile(buffer: Buffer, ext: string): Promise<string> {
  const uploadDir = await ensureUploadsDir();
  const filename = `logo-${Date.now()}.${ext}`;
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

export async function deleteLogoFileIfLocal(logoUrl: string | null | undefined): Promise<void> {
  if (!logoUrl?.startsWith("/uploads/")) return;
  try {
    await unlink(resolvePublicFilePath(logoUrl));
  } catch {
    /* уже удалён */
  }
}
