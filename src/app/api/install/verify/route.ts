import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { getWorkspaceData } from "@/lib/data/workspace";
import { normalizeWebsiteUrl } from "@/lib/knowledge/scan";
import { hasTrustedOrigin } from "@/lib/security/request";

const schema = z.object({ website: z.string().trim().min(4).max(300) });

/** Fetch the coach's site and check whether the embed script is installed. */
export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const normalized = parsed.success ? normalizeWebsiteUrl(parsed.data.website) : null;
  if (!normalized) return Response.json({ error: "Enter a valid website URL." }, { status: 400 });

  const data = await getWorkspaceData();
  const publicId = data.widget.publicId;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(normalized, {
      headers: { "user-agent": "LessonLeadsBot/1.0 (+https://lessonleads.com/bot)", accept: "text/html" },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      return Response.json({ installed: false, reason: `The site returned HTTP ${response.status}.` });
    }
    const html = (await response.text()).slice(0, 3_000_000);
    const hasScript = /widget\.js/i.test(html) && html.includes("data-coach");
    const hasCorrectId = html.includes(`data-coach="${publicId}"`) || html.includes(`data-coach='${publicId}'`);
    if (hasCorrectId) return Response.json({ installed: true });
    if (hasScript) {
      return Response.json({ installed: false, reason: "A widget script was found, but the data-coach ID doesn't match this account." });
    }
    return Response.json({
      installed: false,
      reason: "We didn't find the widget script on that page. If you just added it, publish your site and try again. Some site builders only inject scripts on the live (published) site.",
    });
  } catch {
    return Response.json({ installed: false, reason: "We couldn't reach that website. Check the URL and try again." });
  }
}
