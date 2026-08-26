import { getPublicWidget } from "@/lib/data/workspace";
import { widgetOriginAllowed } from "@/lib/security/origins";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "cache-control": "public, max-age=60, stale-while-revalidate=300",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Public widget configuration consumed by the embed script (launcher theme)
 * and the widget iframe. Contains only publish-safe data.
 */
export async function GET(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const data = await getPublicWidget(publicId);
  if (!data) return Response.json({ error: "Widget not found." }, { status: 404, headers: CORS_HEADERS });
  if (
    data.widget.allowedOrigins.length > 0 &&
    !widgetOriginAllowed({
      origin: request.headers.get("origin"),
      referrer: request.headers.get("referer"),
      allowedOrigins: data.widget.allowedOrigins,
    })
  ) {
    return Response.json({ error: "This widget is not enabled for this website." }, { status: 403, headers: CORS_HEADERS });
  }
  return Response.json(data, { headers: CORS_HEADERS });
}
