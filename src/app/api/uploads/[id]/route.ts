import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { getViewer } from "@/lib/auth/session";
import { getWorkspaceData } from "@/lib/data/workspace";

const uploadsDirectory = path.join(process.cwd(), ".data", "uploads");

/** Serve a swing upload video to the authenticated coach who owns it. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;

  const data = await getWorkspaceData();
  const upload = data.swingUploads.find((candidate) => candidate.id === id);
  if (!upload || upload.organizationId !== viewer.organizationId) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const fileName = path.basename(upload.filePath);
  const filePath = path.join(uploadsDirectory, fileName);
  if (!filePath.startsWith(uploadsDirectory) || !existsSync(filePath)) {
    return Response.json({ error: "Video file is not available." }, { status: 404 });
  }

  const { size } = statSync(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "content-type": upload.mimeType,
      "content-length": String(size),
      "cache-control": "private, max-age=3600",
    },
  });
}
