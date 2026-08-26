import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { recordBookingClick } from "@/lib/data/workspace";
import { safeBookingUrl } from "@/lib/security/request";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await recordBookingClick(token);
  if (!result) notFound();
  const destination = safeBookingUrl(result.destination);
  if (!destination) notFound();
  return NextResponse.redirect(destination);
}
