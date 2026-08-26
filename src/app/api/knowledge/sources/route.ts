import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { addScannedPage, deleteSource, getWorkspaceData, resyncSource, setSourceIncluded } from "@/lib/data/workspace";
import { scanSinglePage } from "@/lib/knowledge/scan";
import { hasTrustedOrigin } from "@/lib/security/request";

const addSchema = z.object({ action: z.literal("add_url"), url: z.string().trim().min(4).max(500) });
const resyncSchema = z.object({ action: z.literal("resync"), sourceId: z.string().min(1).max(100) });
const toggleSchema = z.object({ action: z.literal("toggle"), sourceId: z.string().min(1).max(100), includeInAi: z.boolean() });
const deleteSchema = z.object({ action: z.literal("delete"), sourceId: z.string().min(1).max(100) });
const schema = z.discriminatedUnion("action", [addSchema, resyncSchema, toggleSchema, deleteSchema]);

export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const input = parsed.data;

  try {
    if (input.action === "add_url") {
      const page = await scanSinglePage(input.url);
      if (page.text.length < 80) return Response.json({ error: "That page doesn't have enough readable content." }, { status: 422 });
      const source = await addScannedPage(page);
      return Response.json({ ok: true, source });
    }
    if (input.action === "resync") {
      const data = await getWorkspaceData();
      const source = data.knowledgeSources.find((candidate) => candidate.id === input.sourceId);
      if (!source?.url) return Response.json({ error: "This source can't be re-synced." }, { status: 400 });
      const page = await scanSinglePage(source.url);
      await resyncSource(input.sourceId, page);
      return Response.json({ ok: true });
    }
    if (input.action === "toggle") {
      const source = await setSourceIncluded(input.sourceId, input.includeInAi);
      if (!source) return Response.json({ error: "Source not found." }, { status: 404 });
      return Response.json({ ok: true, source });
    }
    const deleted = await deleteSource(input.sourceId);
    if (!deleted) return Response.json({ error: "Source not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (message === "INVALID_URL") return Response.json({ error: "Enter a valid public page URL." }, { status: 400 });
    return Response.json({ error: "We couldn't read that page. Check the URL and try again." }, { status: 500 });
  }
}
