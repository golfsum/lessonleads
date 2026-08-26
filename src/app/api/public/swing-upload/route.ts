import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getChatContext, recordWidgetEvent, saveSwingUpload } from "@/lib/data/workspace";
import { getViewer } from "@/lib/auth/session";
import { hasPlanFeature } from "@/lib/billing/plans";
import { sendSwingUploadNotification } from "@/lib/email/send";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { requestFingerprint } from "@/lib/security/request";

const MAX_BYTES = 120 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/3gpp"]);
const EXTENSIONS: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-m4v": ".m4v",
  "video/3gpp": ".3gp",
};

const uploadsDirectory = path.join(process.cwd(), ".data", "uploads");

export async function POST(request: Request) {
  const fingerprint = requestFingerprint(request);
  const rate = checkRateLimit(`swing:${fingerprint}`, 3, 10 * 60_000);
  if (!rate.allowed) return Response.json({ error: "Too many uploads. Try again later." }, { status: 429 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }

  const coachId = String(form.get("coachId") ?? "");
  const visitorId = String(form.get("visitorId") ?? "");
  const sessionId = String(form.get("sessionId") ?? "");
  const conversationId = String(form.get("conversationId") ?? "") || undefined;
  const preview = form.get("preview") === "true";
  const file = form.get("file");

  if (!coachId || visitorId.length < 8 || sessionId.length < 8 || !(file instanceof File)) {
    return Response.json({ error: "Missing upload details." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return Response.json({ error: "Video must be under 120 MB." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: "Upload a video file (MP4, MOV, or WebM)." }, { status: 400 });
  }

  const context = await getChatContext(coachId);
  if (!context) return Response.json({ error: "Widget not found." }, { status: 404 });
  if (preview && (await getViewer())) {
    return Response.json({ uploadId: "preview" }, { status: 201 });
  }
  if (!hasPlanFeature(context.publicWidget.plan, "swingUploads")) {
    return Response.json({ error: "Swing uploads are not enabled for this coach." }, { status: 403 });
  }
  const widget = context.publicWidget;

  const uploadId = randomUUID();
  const extension = EXTENSIONS[file.type] ?? ".mp4";
  const relativePath = `${uploadId}${extension}`;
  await mkdir(uploadsDirectory, { recursive: true });
  await writeFile(path.join(uploadsDirectory, relativePath), Buffer.from(await file.arrayBuffer()));

  const clean = (key: string) => {
    const value = String(form.get(key) ?? "").trim().slice(0, 120);
    return value || undefined;
  };

  try {
    const upload = await saveSwingUpload({
      widgetPublicId: coachId,
      conversationId,
      visitorId,
      sessionId,
      fileName: file.name.slice(0, 160) || `swing${extension}`,
      filePath: relativePath,
      mimeType: file.type,
      sizeBytes: file.size,
      club: clean("club"),
      typicalMiss: clean("typicalMiss"),
      handicap: clean("handicap"),
      goal: clean("goal"),
    });
    await recordWidgetEvent({
      widgetId: widget.widget.id,
      name: "swing_uploaded",
      sessionId,
      conversationId,
      leadId: upload.leadId,
    });
    const lead = context.data.leads.find((candidate) => candidate.id === upload.leadId);
    void sendSwingUploadNotification({
      coach: context.data.coach,
      golferName: lead ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") : undefined,
      club: upload.club,
      goal: upload.goal,
      leadId: upload.leadId,
    }).catch(() => {});
    return Response.json({ uploadId: upload.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "WIDGET_NOT_FOUND") return Response.json({ error: "Widget not found." }, { status: 404 });
    return Response.json({ error: "We could not save your video. Please try again." }, { status: 500 });
  }
}
