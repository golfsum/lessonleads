type EmailTemplate = { subject: string; html: string; text: string };

function shell(title: string, body: string, action?: { label: string; url: string }) {
  const button = action ? `<p style="margin:28px 0"><a href="${action.url}" style="background:#1b552c;border-radius:8px;color:#fff;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">${action.label}</a></p>` : "";
  return `<!doctype html><html><body style="background:#f8f5ef;color:#102e24;font-family:Arial,sans-serif;margin:0;padding:32px"><div style="background:#fff;border:1px solid #dedfdc;border-radius:12px;margin:auto;max-width:600px;padding:32px"><p style="color:#1b552c;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase">LessonLeads</p><h1 style="font-family:Georgia,serif;font-size:31px;line-height:1.1">${title}</h1>${body}${button}<p style="border-top:1px solid #e7e8e5;color:#69736c;font-size:11px;margin-top:30px;padding-top:18px">Turn your golf website traffic into booked lessons.</p></div></body></html>`;
}

function row(label: string, value: string) {
  return `<tr><td style="color:#69736c;padding:6px 12px 6px 0;vertical-align:top">${label}</td><td style="font-weight:700;padding:6px 0">${value}</td></tr>`;
}

export function newLeadEmail(input: {
  coachName: string;
  golferName: string;
  email: string;
  phone?: string;
  intentLevel: string;
  interest?: string;
  summary?: string;
  leadUrl: string;
}): EmailTemplate {
  const intentLabel = input.intentLevel.charAt(0).toUpperCase() + input.intentLevel.slice(1);
  const rows = [
    row("Intent", intentLabel),
    input.interest ? row("Interest", input.interest) : "",
    row("Email", input.email),
    input.phone ? row("Phone", input.phone) : "",
  ].join("");
  const summaryBlock = input.summary
    ? `<p style="background:#f4f6f2;border-left:3px solid #1b552c;border-radius:0 8px 8px 0;font-size:14px;line-height:1.5;margin:20px 0;padding:14px 16px">${input.summary}</p>`
    : "";
  const html = shell(
    "A new lead from your website widget.",
    `<p>Hi ${input.coachName},</p><p><strong>${input.golferName}</strong> just shared their contact details in your widget.</p>${summaryBlock}<table style="border-collapse:collapse;font-size:14px">${rows}</table>`,
    { label: "View lead and conversation", url: input.leadUrl },
  );
  return {
    subject: `New ${input.intentLevel === "high" ? "high-intent " : ""}lead: ${input.golferName}`,
    html,
    text: `${input.golferName} became a lead through your widget. Intent: ${intentLabel}.${input.interest ? ` Interest: ${input.interest}.` : ""} Email: ${input.email}.${input.summary ? ` Summary: ${input.summary}` : ""} View: ${input.leadUrl}`,
  };
}

export function swingUploadEmail(input: { coachName: string; golferName?: string; club?: string; goal?: string; url: string }): EmailTemplate {
  const who = input.golferName ?? "A visitor";
  const detail = [input.club, input.goal].filter(Boolean).join(" — ");
  const html = shell(
    "New swing video uploaded.",
    `<p>Hi ${input.coachName},</p><p><strong>${who}</strong> uploaded a swing video through your widget.${detail ? ` (${detail})` : ""}</p>`,
    { label: "Watch the swing", url: input.url },
  );
  return { subject: `New swing upload${input.golferName ? ` from ${input.golferName}` : ""}`, html, text: `${who} uploaded a swing video.${detail ? ` ${detail}.` : ""} View: ${input.url}` };
}

export function accountEmail(kind: "welcome" | "verification" | "password_reset" | "subscription_confirmation" | "subscription_cancellation" | "usage_warning", actionUrl: string): EmailTemplate {
  const content = {
    welcome: ["Welcome to LessonLeads", "Your workspace is ready. Connect your website, review what the assistant learned, and install the widget."],
    verification: ["Verify your email", "Confirm your email address to protect your LessonLeads account."],
    password_reset: ["Reset your password", "Use the secure link below to choose a new password."],
    subscription_confirmation: ["Your paid plan is active", "Your widget now runs on the limits and features of your new plan."],
    subscription_cancellation: ["Your subscription was canceled", "Your account will return to the Free plan according to the billing period shown in Stripe."],
    usage_warning: ["Your widget is near this month's limit", "Upgrade to Solo for $29/month so new golfers can keep talking with your assistant."],
  } as const;
  const [title, copy] = content[kind];
  return { subject: title, html: shell(title, `<p>${copy}</p>`, { label: "Open LessonLeads", url: actionUrl }), text: `${title}. ${copy} ${actionUrl}` };
}
