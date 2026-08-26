import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { addContentItems, getWorkspaceData } from "@/lib/data/workspace";
import { hasPlanFeature } from "@/lib/billing/plans";
import {
  categorizeGolfVideo,
  fetchChannelVideos,
  fetchVideoMetadata,
  fetchVideoTranscript,
  parseYoutubeUrl,
} from "@/lib/knowledge/youtube";
import { hasTrustedOrigin } from "@/lib/security/request";

const previewSchema = z.object({ action: z.literal("preview"), url: z.string().trim().min(4).max(500) });
const importSchema = z.object({
  action: z.literal("import"),
  videos: z
    .array(z.object({ videoId: z.string().min(4).max(40), title: z.string().trim().min(1).max(300), thumbnailUrl: z.string().max(500).optional() }))
    .min(1)
    .max(20),
});
const schema = z.discriminatedUnion("action", [previewSchema, importSchema]);

export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  if (parsed.data.action === "import") {
    const workspace = await getWorkspaceData();
    if (!hasPlanFeature(workspace.subscription.plan, "youtubeImport")) {
      return Response.json({ error: "YouTube import is included with Pro." }, { status: 403 });
    }
  }

  if (parsed.data.action === "preview") {
    const target = parseYoutubeUrl(parsed.data.url);
    if (!target) return Response.json({ error: "Paste a YouTube video or channel URL." }, { status: 400 });
    if (target.kind === "video") {
      const video = await fetchVideoMetadata(target.videoId);
      if (!video) return Response.json({ error: "We couldn't read that video. Check the URL." }, { status: 422 });
      return Response.json({ videos: [video] });
    }
    const videos = await fetchChannelVideos(target.url);
    if (videos.length === 0) {
      return Response.json({ error: "We couldn't list videos from that channel. Try pasting individual video URLs." }, { status: 422 });
    }
    return Response.json({ videos });
  }

  // Import: gather transcripts where available (never fabricated) and index.
  const items = await Promise.all(
    parsed.data.videos.map(async (video) => {
      const transcript = await fetchVideoTranscript(video.videoId);
      return {
        type: "youtube" as const,
        title: video.title,
        description: transcript ? transcript.slice(0, 4000) : undefined,
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
        thumbnailUrl: video.thumbnailUrl || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        categories: categorizeGolfVideo(video.title, transcript ?? ""),
        transcriptAvailable: Boolean(transcript),
        includeInAi: true,
        active: true,
      };
    }),
  );
  const created = await addContentItems(items);
  return Response.json({ ok: true, imported: created.length, skippedDuplicates: items.length - created.length }, { status: 201 });
}
