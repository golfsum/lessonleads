import "server-only";

import { Resend } from "resend";
import type { CoachProfile, Lead } from "@/lib/domain/types";
import { accountEmail, newLeadEmail, swingUploadEmail } from "@/lib/email/templates";
import { isDemoMode } from "@/lib/demo/store";

function resendReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

async function deliver(to: string, template: { subject: string; html: string; text: string }) {
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
  if (error) throw new Error(error.message);
}

export async function sendNewLeadNotification(input: { lead: Lead; coach: CoachProfile; summary?: string }) {
  if (isDemoMode() || !resendReady()) return { sent: false, reason: "not_configured" } as const;
  const { lead, coach } = input;
  const wantsIt = coach.notificationPrefs.newLead || (coach.notificationPrefs.highIntentLead && lead.intentLevel === "high");
  if (!wantsIt || !coach.email) return { sent: false, reason: "disabled" } as const;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lessonleads.com";
  const template = newLeadEmail({
    coachName: coach.name,
    golferName: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
    email: lead.email,
    phone: lead.phone,
    intentLevel: lead.intentLevel,
    interest: lead.interest,
    summary: input.summary ?? lead.summary,
    leadUrl: `${appUrl}/dashboard/leads/${lead.id}`,
  });
  await deliver(coach.email, template);
  return { sent: true } as const;
}

export async function sendAccountEmail(input: {
  to: string;
  kind: "welcome" | "verification" | "password_reset";
  actionUrl: string;
}) {
  if (isDemoMode() || !resendReady()) return { sent: false, reason: "not_configured" } as const;
  await deliver(input.to, accountEmail(input.kind, input.actionUrl));
  return { sent: true } as const;
}

export async function sendSwingUploadNotification(input: {
  coach: CoachProfile;
  golferName?: string;
  club?: string;
  goal?: string;
  leadId?: string;
}) {
  if (isDemoMode() || !resendReady()) return { sent: false, reason: "not_configured" } as const;
  if (!input.coach.notificationPrefs.swingUpload || !input.coach.email) return { sent: false, reason: "disabled" } as const;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lessonleads.com";
  const template = swingUploadEmail({
    coachName: input.coach.name,
    golferName: input.golferName,
    club: input.club,
    goal: input.goal,
    url: input.leadId ? `${appUrl}/dashboard/leads/${input.leadId}` : `${appUrl}/dashboard/swing-uploads`,
  });
  await deliver(input.coach.email, template);
  return { sent: true } as const;
}
