/** Клиент-безопасные хелперы отображения логотипа (без fs). */

/** Стабильный ключ кэша из URL (logo-123.png → 123), одинаковый на SSR и клиенте. */
export function logoCacheKeyFromUrl(logoUrl: string | null | undefined): number {
  if (!logoUrl) return 0;
  const name = logoUrl.split("/").pop()?.split("?")[0] ?? "";
  const match = name.match(/logo-(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function logoDisplaySrc(logoUrl: string, cacheKey?: string | number): string {
  if (!logoUrl) return "";
  const key = cacheKey ?? logoUrl.split("/").pop() ?? "0";
  const sep = logoUrl.includes("?") ? "&" : "?";
  return `${logoUrl}${sep}v=${encodeURIComponent(String(key))}`;
}
