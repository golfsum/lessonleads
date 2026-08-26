import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { applyWebsiteScan, setWebsiteScanStatus } from "@/lib/data/workspace";
import { normalizeWebsiteUrl, scanWebsite } from "@/lib/knowledge/scan";
import { hasTrustedOrigin } from "@/lib/security/request";

const schema = z.object({ website: z.string().trim().min(4).max(300) });

/** Crawl the coach's website and (re)build knowledge sources from it. */
export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const normalized = parsed.success ? normalizeWebsiteUrl(parsed.data.website) : null;
  if (!normalized) return Response.json({ error: "Enter a valid public website URL." }, { status: 400 });

  await setWebsiteScanStatus("scanning", normalized);
  try {
    const scan = await scanWebsite(normalized);
    if (scan.pages.length === 0) {
      const reason = scan.errors[0]?.message;
      await setWebsiteScanStatus("error", normalized, reason ?? "No readable pages found.");
      return Response.json(
        { error: reason ? `We couldn't read the site (${reason}).` : "We couldn't find readable pages on that site." },
        { status: 422 },
      );
    }
    await applyWebsiteScan(scan);
    return Response.json({
      ok: true,
      pagesIndexed: scan.pages.length,
      pages: scan.pages.map((page) => ({ url: page.url, title: page.title, faqCount: page.faqs.length })),
      detected: scan.detected,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    await setWebsiteScanStatus("error", normalized, message);
    return Response.json({ error: "We couldn't scan that website. Check the URL and try again." }, { status: 500 });
  }
}
