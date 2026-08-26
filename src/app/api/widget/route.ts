import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { saveWidget } from "@/lib/data/workspace";
import { hasTrustedOrigin } from "@/lib/security/request";

const color = z.string().regex(/^#[0-9a-f]{6}$/i);

const menuItem = z.object({
  id: z.string().min(1).max(80),
  key: z.enum(["ask", "lessons", "videos", "coach", "drills", "resources", "faq", "swing", "contact", "custom"]),
  title: z.string().trim().min(1).max(40),
  icon: z.enum(["chat", "flag", "video", "person", "target", "book", "question", "upload", "mail", "link"]),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0).max(100),
  ctaLabel: z.string().trim().max(60).optional(),
  externalUrl: z.url().max(500).optional(),
});

const theme = z.object({
  assistantName: z.string().trim().min(2).max(60).optional(),
  welcomeMessage: z.string().trim().min(4).max(400).optional(),
  launcherText: z.string().trim().max(48).optional(),
  launcherIcon: z.enum(["chat", "flag", "golf", "help"]).optional(),
  launcherStyle: z.enum(["icon", "icon_text", "text"]).optional(),
  position: z.enum(["bottom_right", "bottom_left"]).optional(),
  size: z.enum(["compact", "standard", "large"]).optional(),
  primaryColor: color.optional(),
  accentColor: color.optional(),
  backgroundColor: color.optional(),
  textColor: color.optional(),
  buttonColor: color.optional(),
  borderRadius: z.number().int().min(0).max(24).optional(),
  appearance: z.enum(["light", "dark"]).optional(),
  logoUrl: z.union([z.url().max(500), z.literal("")]).optional(),
  coachAvatarUrl: z.union([z.url().max(500), z.literal("")]).optional(),
  assistantAvatarUrl: z.union([z.url().max(500), z.literal("")]).optional(),
  suggestedQuestions: z.array(z.string().trim().min(3).max(160)).max(6).optional(),
});

const schema = z.object({
  theme: theme.optional(),
  menu: z.array(menuItem).max(12).optional(),
  status: z.enum(["draft", "active", "disabled"]).optional(),
  allowedOrigins: z.array(z.string().trim().min(3).max(200)).max(10).optional(),
  defaultSectionKey: z.enum(["ask", "lessons", "videos", "coach", "drills", "resources", "faq", "swing", "contact", "custom"]).optional(),
});

export async function PUT(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid widget configuration." }, { status: 400 });
  if (parsed.data.menu && !parsed.data.menu.some((item) => item.enabled && item.key === "ask")) {
    return Response.json({ error: "The Ask section must stay enabled." }, { status: 400 });
  }
  const cleanedTheme = parsed.data.theme
    ? {
        ...parsed.data.theme,
        logoUrl: parsed.data.theme.logoUrl === "" ? undefined : parsed.data.theme.logoUrl,
        coachAvatarUrl: parsed.data.theme.coachAvatarUrl === "" ? undefined : parsed.data.theme.coachAvatarUrl,
        assistantAvatarUrl: parsed.data.theme.assistantAvatarUrl === "" ? undefined : parsed.data.theme.assistantAvatarUrl,
      }
    : undefined;
  const widget = await saveWidget({ ...parsed.data, theme: cleanedTheme });
  return Response.json({ widget });
}
