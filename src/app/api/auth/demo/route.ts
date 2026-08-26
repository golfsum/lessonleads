import { NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/session";
import { isDemoMode, resetDemoWorkspace } from "@/lib/demo/store";

export async function POST(request: Request) {
  if (!isDemoMode()) return Response.json({ error: "Demo mode is disabled." }, { status: 404 });
  let fresh = false;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      fresh = form.get("fresh") === "true";
    }
  } catch {
    fresh = false;
  }
  if (fresh) await resetDemoWorkspace();
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const response = NextResponse.redirect(new URL(fresh ? "/onboarding" : "/dashboard", origin), 303);
  response.cookies.set(DEMO_SESSION_COOKIE, "coach_mike_smith", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
