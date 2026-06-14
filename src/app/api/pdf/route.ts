import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import path from "path";

function findBrowser(): string | null {
  const la = process.env.LOCALAPPDATA ?? "";
  const pf = process.env.ProgramFiles ?? "C:\\Program Files";
  const pf86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";

  const candidates = [
    path.join(pf, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(la, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(la, "Microsoft", "Edge", "Application", "msedge.exe"),
    ...(process.env.CHROME_PATH ? [process.env.CHROME_PATH] : []),
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  for (const p of candidates) {
    try { if (existsSync(p)) return p; } catch { /* skip */ }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const pagePath = searchParams.get("path");
  if (!pagePath) return NextResponse.json({ error: "path required" }, { status: 400 });
  const nameParam = searchParams.get("name");

  const executablePath = findBrowser();
  if (!executablePath) {
    return NextResponse.json(
      { error: "Браузер (Chrome/Edge) не найден на сервере." },
      { status: 500 }
    );
  }

  const origin = req.nextUrl.origin;
  const targetUrl = `${origin}${pagePath}`;
  const cookies = req.headers.get("cookie") ?? "";

  try {
    const puppeteer = await import("puppeteer-core");
    const browser = await (puppeteer as any).launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();

    // Forward auth cookies
    if (cookies) {
      const hostname = req.nextUrl.hostname;
      const cookieList = cookies.split(";").flatMap((c) => {
        const eqIdx = c.indexOf("=");
        if (eqIdx < 0) return [];
        const name = c.slice(0, eqIdx).trim();
        const value = c.slice(eqIdx + 1).trim();
        return [{ name, value, domain: hostname, path: "/" }];
      });
      if (cookieList.length > 0) await page.setCookie(...cookieList);
    }

    await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 30000 });

    // Hide toolbar before PDF
    await page.addStyleTag({ content: ".no-print { display: none !important; }" });

    const rawName = nameParam || (await page.title()) || "Документ";
    const safeName = rawName.replace(/[\\/:*?"<>|]/g, "_").trim();

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await browser.close();

    const filename = encodeURIComponent(safeName + ".pdf");
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (e) {
    console.error("[PDF API]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
