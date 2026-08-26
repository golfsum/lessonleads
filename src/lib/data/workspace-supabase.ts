import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type {
  addDemoContentItems,
  addDemoManualKnowledge,
  addDemoScannedPage,
  appendDemoConversationTurn,
  applyDemoWebsiteScan,
  captureDemoLead,
  countDemoConversationsThisMonth,
  countDemoLeadsThisMonth,
  countRecentDemoLeads,
  deleteDemoContentItem,
  deleteDemoFaq,
  deleteDemoService,
  deleteDemoSource,
  getDemoChatContext,
  getDemoConversation,
  getDemoPublicWidget,
  readDemoWorkspace,
  recordDemoBookingClick,
  recordDemoEvent,
  resyncDemoSource,
  saveDemoOnboarding,
  saveDemoSwingUpload,
  saveDemoWidget,
  setDemoSourceIncluded,
  setDemoWebsiteScanStatus,
  updateDemoCoachProfile,
  updateDemoContentItem,
  updateDemoConversationSummary,
  updateDemoLeadNotes,
  updateDemoLeadStatus,
  upsertDemoFaq,
  upsertDemoService,
} from "@/lib/demo/store";
import { getViewer } from "@/lib/auth/session";
import { chunkText } from "@/lib/knowledge/chunk";
import type { ScannedPage } from "@/lib/knowledge/scan";
import { slugify } from "@/lib/domain/format";
import { firstNameFrom } from "@/lib/domain/defaults";
import { intentLevelForScore, type ChatMessage, type LeadActivity, type WorkspaceData } from "@/lib/domain/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  mapChunk,
  mapCoach,
  mapContent,
  mapConversation,
  mapEvent,
  mapFaq,
  mapLead,
  mapOrganization,
  mapService,
  mapSource,
  mapSubscription,
  mapUpload,
  mapWebsite,
  mapWidget,
  toPublicWidget,
} from "./mappers";

type Mirror<T extends (...args: never[]) => unknown> = (...args: Parameters<T>) => ReturnType<T>;

async function scoped() {
  const viewer = await getViewer();
  if (!viewer || viewer.demo) throw new Error("UNAUTHENTICATED");
  const supabase = await createSupabaseServerClient();
  return { supabase, orgId: viewer.organizationId, viewer };
}

function admin() {
  return createSupabaseAdminClient();
}

function throwIf(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function publicIdSafe(value: string) {
  return /^[a-zA-Z0-9_-]{2,80}$/.test(value);
}

async function loadWorkspace(orgId: string, client: ReturnType<typeof admin>): Promise<WorkspaceData> {
  const [
    orgRes,
    coachRes,
    websiteRes,
    servicesRes,
    widgetRes,
    leadsRes,
    conversationsRes,
    sourcesRes,
    chunksRes,
    faqsRes,
    contentRes,
    uploadsRes,
    eventsRes,
    subRes,
  ] = await Promise.all([
    client.from("organizations").select("*").eq("id", orgId).single(),
    client.from("coach_profiles").select("*").eq("organization_id", orgId).limit(1).maybeSingle(),
    client.from("websites").select("*").eq("organization_id", orgId).maybeSingle(),
    client.from("services").select("*").eq("organization_id", orgId).order("sort_order"),
    client.from("widgets").select("*").eq("organization_id", orgId).limit(1).maybeSingle(),
    client.from("leads").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
    client.from("conversations").select("*").eq("organization_id", orgId).order("last_message_at", { ascending: false }),
    client.from("knowledge_sources").select("*").eq("organization_id", orgId).order("updated_at", { ascending: false }),
    client.from("knowledge_chunks").select("*").eq("organization_id", orgId),
    client.from("faqs").select("*").eq("organization_id", orgId).order("sort_order"),
    client.from("content_items").select("*").eq("organization_id", orgId).order("sort_order"),
    client.from("swing_uploads").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
    client.from("widget_events").select("*").eq("organization_id", orgId).order("occurred_at", { ascending: true }),
    client.from("subscriptions").select("*").eq("organization_id", orgId).maybeSingle(),
  ]);

  throwIf(orgRes.error, "organization");
  throwIf(coachRes.error, "coach");
  throwIf(widgetRes.error, "widget");
  if (!orgRes.data || !coachRes.data || !widgetRes.data) throw new Error("Workspace is incomplete.");

  const first = firstNameFrom(String(coachRes.data.name));
  return {
    organization: mapOrganization(orgRes.data),
    coach: mapCoach(coachRes.data),
    services: (servicesRes.data ?? []).map(mapService),
    widget: mapWidget(widgetRes.data, first),
    leads: (leadsRes.data ?? []).map(mapLead),
    conversations: (conversationsRes.data ?? []).map(mapConversation),
    knowledgeSources: (sourcesRes.data ?? []).map(mapSource),
    knowledgeChunks: (chunksRes.data ?? []).map(mapChunk),
    faqs: (faqsRes.data ?? []).map(mapFaq),
    contentItems: (contentRes.data ?? []).map(mapContent),
    swingUploads: (uploadsRes.data ?? []).map(mapUpload),
    events: (eventsRes.data ?? []).map(mapEvent),
    subscription: mapSubscription(subRes.data, orgId),
    website: mapWebsite(websiteRes.data),
    demo: false,
  };
}

async function findPublicWidgetRow(publicIdOrSlug: string) {
  if (!publicIdSafe(publicIdOrSlug)) return null;
  const supabase = admin();
  const { data, error } = await supabase
    .from("widgets")
    .select("*")
    .or(`public_id.eq.${publicIdOrSlug},slug.eq.${publicIdOrSlug}`)
    .eq("status", "active")
    .maybeSingle();
  throwIf(error, "public widget");
  return data;
}

export const getSupabaseWorkspaceData: Mirror<typeof readDemoWorkspace> = async () => {
  const { orgId } = await scoped();
  return loadWorkspace(orgId, admin());
};

export const saveSupabaseOnboarding: Mirror<typeof saveDemoOnboarding> = async (input) => {
  const { supabase, orgId } = await scoped();
  const first = firstNameFrom(input.coachName);
  const { error: coachError } = await supabase
    .from("coach_profiles")
    .update({
      name: input.coachName,
      business_name: input.businessName,
      email: input.email,
      website: input.website ?? null,
      location: input.location,
      timezone: input.timezone,
      booking_provider: input.bookingProvider,
      booking_url: input.bookingUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId);
  throwIf(coachError, "onboarding profile");
  await supabase.from("organizations").update({ name: input.businessName, updated_at: new Date().toISOString() }).eq("id", orgId);

  const { data: widget, error: widgetError } = await supabase.from("widgets").select("*").eq("organization_id", orgId).maybeSingle();
  throwIf(widgetError, "onboarding widget");
  if (widget) {
    const current = mapWidget(widget, first);
    const menu = current.menu.map((item) => ({
      ...item,
      enabled: item.key === "ask" ? true : input.enabledSections.includes(item.key),
      title: item.key === "ask" ? `Ask ${first}` : item.key === "coach" ? `About ${first}` : item.title,
    }));
    await supabase
      .from("widgets")
      .update({
        status: "active",
        menu,
        theme: {
          ...current.theme,
          assistantName: input.assistantName || `Ask ${first}`,
          welcomeMessage: input.welcomeMessage || current.theme.welcomeMessage,
          launcherText: `Ask Coach ${first}`,
          primaryColor: input.primaryColor || current.theme.primaryColor,
          buttonColor: input.primaryColor || current.theme.buttonColor,
          logoUrl: input.logoUrl !== undefined ? (input.logoUrl.trim() ? input.logoUrl.trim() : undefined) : current.theme.logoUrl,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", widget.id)
      .eq("organization_id", orgId);
  }
  if (input.website) {
    await supabase.from("websites").upsert({ organization_id: orgId, url: input.website });
  }
  return loadWorkspace(orgId, admin());
};

export const upsertSupabaseService: Mirror<typeof upsertDemoService> = async (input) => {
  const { supabase, orgId } = await scoped();
  const { data: coach } = await supabase.from("coach_profiles").select("id").eq("organization_id", orgId).maybeSingle();
  if (!coach) throw new Error("Coach profile missing.");
  if (input.id) {
    const { data, error } = await supabase
      .from("services")
      .update({
        name: input.name,
        description: input.description,
        price_cents: input.priceCents,
        price_label: input.priceLabel ?? null,
        duration_minutes: input.durationMinutes,
        mode: input.mode,
        location: input.location ?? null,
        booking_url: input.bookingUrl ?? null,
        cta_label: input.ctaLabel ?? null,
        featured: input.featured,
        best_for: input.bestFor,
        active: input.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    throwIf(error, "update service");
    return mapService(data);
  }
  const { count } = await supabase.from("services").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  const { data, error } = await supabase
    .from("services")
    .insert({
      organization_id: orgId,
      coach_id: coach.id,
      name: input.name,
      slug: `${slugify(input.name)}-${Date.now().toString(36)}`,
      description: input.description,
      price_cents: input.priceCents,
      price_label: input.priceLabel ?? null,
      duration_minutes: input.durationMinutes,
      mode: input.mode,
      location: input.location ?? null,
      booking_url: input.bookingUrl ?? null,
      cta_label: input.ctaLabel ?? null,
      featured: input.featured,
      best_for: input.bestFor,
      active: input.active,
      sort_order: (count ?? 0) + 1,
    })
    .select("*")
    .single();
  throwIf(error, "create service");
  return mapService(data);
};

export const deleteSupabaseService: Mirror<typeof deleteDemoService> = async (serviceId) => {
  const { supabase, orgId } = await scoped();
  const { error, count } = await supabase.from("services").delete({ count: "exact" }).eq("id", serviceId).eq("organization_id", orgId);
  throwIf(error, "delete service");
  return (count ?? 0) > 0;
};

export const saveSupabaseWidget: Mirror<typeof saveDemoWidget> = async (input) => {
  const { supabase, orgId } = await scoped();
  const { data: current, error: readError } = await supabase.from("widgets").select("*").eq("organization_id", orgId).maybeSingle();
  throwIf(readError, "read widget");
  if (!current) throw new Error("Widget missing.");
  const first = firstNameFrom("Coach");
  const mapped = mapWidget(current, first);
  const { data, error } = await supabase
    .from("widgets")
    .update({
      theme: input.theme ? { ...mapped.theme, ...input.theme } : mapped.theme,
      menu: input.menu ?? mapped.menu,
      status: input.status ?? mapped.status,
      allowed_origins: input.allowedOrigins ?? mapped.allowedOrigins,
      default_section_key: input.defaultSectionKey ?? mapped.defaultSectionKey,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .eq("organization_id", orgId)
    .select("*")
    .single();
  throwIf(error, "save widget");
  return mapWidget(data, first);
};

export const updateSupabaseCoachProfile: Mirror<typeof updateDemoCoachProfile> = async (input) => {
  const { supabase, orgId } = await scoped();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name) patch.name = input.name;
  if (input.businessName) patch.business_name = input.businessName;
  if (input.email) patch.email = input.email;
  if (input.phone !== undefined) patch.phone = input.phone ?? null;
  if (input.website !== undefined) patch.website = input.website ?? null;
  if (input.location) patch.location = input.location;
  if (input.timezone) patch.timezone = input.timezone;
  if (input.title) patch.title = input.title;
  if (input.credentials) patch.credentials = input.credentials;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.philosophy !== undefined) patch.philosophy = input.philosophy;
  if (input.teachingFocus) patch.teaching_focus = input.teachingFocus;
  if (input.socialLinks) patch.social_links = input.socialLinks;
  if (input.bookingProvider) patch.booking_provider = input.bookingProvider;
  if (input.bookingUrl !== undefined) patch.booking_url = input.bookingUrl;
  if (input.profilePhotoUrl !== undefined) patch.profile_photo_url = input.profilePhotoUrl ?? null;
  if (input.notificationPrefs) patch.notification_prefs = input.notificationPrefs;
  const { data, error } = await supabase.from("coach_profiles").update(patch).eq("organization_id", orgId).select("*").single();
  throwIf(error, "update profile");
  return mapCoach(data);
};

export const updateSupabaseLeadStatus: Mirror<typeof updateDemoLeadStatus> = async (leadId, status) => {
  const { supabase, orgId } = await scoped();
  const { data: current, error: readError } = await supabase.from("leads").select("*").eq("id", leadId).eq("organization_id", orgId).maybeSingle();
  throwIf(readError, "lead");
  if (!current) return null;
  const lead = mapLead(current);
  const now = new Date().toISOString();
  const activity: LeadActivity[] = [
    ...lead.activity,
    { id: randomUUID(), type: "status_changed", label: `Status changed to ${status.replaceAll("_", " ")}`, occurredAt: now },
  ];
  const { data, error } = await supabase
    .from("leads")
    .update({ status, activity, updated_at: now })
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .select("*")
    .single();
  throwIf(error, "lead status");
  return mapLead(data);
};

export const updateSupabaseLeadNotes: Mirror<typeof updateDemoLeadNotes> = async (leadId, notes) => {
  const { supabase, orgId } = await scoped();
  const { data, error } = await supabase
    .from("leads")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .select("*")
    .maybeSingle();
  throwIf(error, "lead notes");
  return data ? mapLead(data) : null;
};

async function writeScannedPage(
  client: ReturnType<typeof admin>,
  orgId: string,
  coachId: string,
  page: ScannedPage,
) {
  const now = new Date().toISOString();
  const type = page.looksLikeFaq && page.faqs.length > 0 ? "faq" : "website_page";
  const { data: existing } = await client.from("knowledge_sources").select("*").eq("organization_id", orgId).eq("url", page.url).maybeSingle();
  let sourceId: string;
  if (existing) {
    sourceId = existing.id;
    await client
      .from("knowledge_sources")
      .update({ title: page.title, type, status: "synced", last_synced_at: now, updated_at: now, error: null })
      .eq("id", sourceId)
      .eq("organization_id", orgId);
    await client.from("knowledge_chunks").delete().eq("source_id", sourceId).eq("organization_id", orgId);
  } else {
    const { data, error } = await client
      .from("knowledge_sources")
      .insert({
        organization_id: orgId,
        coach_id: coachId,
        type,
        title: page.title,
        url: page.url,
        status: "synced",
        include_in_ai: true,
        last_synced_at: now,
      })
      .select("id")
      .single();
    throwIf(error, "source");
    if (!data) throw new Error("source: insert returned no row");
    sourceId = data.id;
  }
  const chunks = chunkText(page.text).map((content, index) => ({
    organization_id: orgId,
    coach_id: coachId,
    source_id: sourceId,
    source_type: type,
    title: page.title,
    url: page.url,
    content,
    position: index,
  }));
  if (chunks.length > 0) {
    const { error } = await client.from("knowledge_chunks").insert(chunks);
    throwIf(error, "chunks");
  }
  if (page.faqs.length > 0) {
    await client.from("faqs").delete().eq("source_id", sourceId).eq("organization_id", orgId);
    const { error } = await client.from("faqs").insert(
      page.faqs.map((faq, index) => ({
        organization_id: orgId,
        source_id: sourceId,
        question: faq.question,
        answer: faq.answer,
        enabled: true,
        sort_order: index + 1,
      })),
    );
    throwIf(error, "faqs");
  }
}

export const applySupabaseWebsiteScan: Mirror<typeof applyDemoWebsiteScan> = async (scan) => {
  const { orgId } = await scoped();
  const client = admin();
  const { data: coach } = await client.from("coach_profiles").select("id, social_links").eq("organization_id", orgId).maybeSingle();
  if (!coach) throw new Error("Coach profile missing.");
  await client.from("websites").upsert({
    organization_id: orgId,
    url: scan.baseUrl,
    scan_status: "scanned",
    last_scan_at: new Date().toISOString(),
    pages_found: scan.pages.length,
    error: null,
  });
  await client.from("coach_profiles").update({ website: scan.baseUrl, updated_at: new Date().toISOString() }).eq("organization_id", orgId);
  const socials = { ...(coach.social_links as Record<string, string> | null), ...scan.detected.socialLinks };
  await client.from("coach_profiles").update({ social_links: socials }).eq("organization_id", orgId);
  for (const page of scan.pages) {
    await writeScannedPage(client, orgId, coach.id, page);
  }
  const { data } = await client.from("knowledge_sources").select("*").eq("organization_id", orgId);
  return (data ?? []).map(mapSource).filter((source) => source.type === "website_page" || source.type === "faq");
};

export const setSupabaseWebsiteScanStatus: Mirror<typeof setDemoWebsiteScanStatus> = async (status, url, error) => {
  const { supabase, orgId } = await scoped();
  const patch: Record<string, unknown> = { scan_status: status, error: error ?? null };
  if (url) patch.url = url;
  await supabase.from("websites").upsert({ organization_id: orgId, ...patch, pages_found: 0 });
  const { data } = await supabase.from("websites").select("*").eq("organization_id", orgId).maybeSingle();
  return mapWebsite(data);
};

export const addSupabaseScannedPage: Mirror<typeof addDemoScannedPage> = async (page) => {
  const { orgId } = await scoped();
  const client = admin();
  const { data: coach } = await client.from("coach_profiles").select("id").eq("organization_id", orgId).maybeSingle();
  if (!coach) throw new Error("Coach profile missing.");
  await writeScannedPage(client, orgId, coach.id, page);
  const { data } = await client.from("knowledge_sources").select("*").eq("organization_id", orgId).eq("url", page.url).maybeSingle();
  return mapSource(data!);
};

export const resyncSupabaseSource: Mirror<typeof resyncDemoSource> = async (sourceId, page) => {
  const { orgId } = await scoped();
  const client = admin();
  const { data: source } = await client.from("knowledge_sources").select("*").eq("id", sourceId).eq("organization_id", orgId).maybeSingle();
  if (!source) return null;
  await writeScannedPage(client, orgId, source.coach_id, page);
  const { data } = await client.from("knowledge_sources").select("*").eq("organization_id", orgId).eq("url", page.url).maybeSingle();
  return data ? mapSource(data) : null;
};

export const addSupabaseManualKnowledge: Mirror<typeof addDemoManualKnowledge> = async (input) => {
  const { supabase, orgId } = await scoped();
  const { data: coach } = await supabase.from("coach_profiles").select("id").eq("organization_id", orgId).maybeSingle();
  if (!coach) throw new Error("Coach profile missing.");
  const now = new Date().toISOString();
  const { data: source, error } = await supabase
    .from("knowledge_sources")
    .insert({
      organization_id: orgId,
      coach_id: coach.id,
      type: "manual",
      title: input.title,
      status: "synced",
      include_in_ai: true,
      last_synced_at: now,
    })
    .select("*")
    .single();
  throwIf(error, "manual source");
  const chunks = chunkText(input.content).map((content, index) => ({
    organization_id: orgId,
    coach_id: coach.id,
    source_id: source.id,
    source_type: "manual",
    title: input.title,
    content,
    position: index,
  }));
  if (chunks.length) await supabase.from("knowledge_chunks").insert(chunks);
  return mapSource(source);
};

export const setSupabaseSourceIncluded: Mirror<typeof setDemoSourceIncluded> = async (sourceId, includeInAi) => {
  const { supabase, orgId } = await scoped();
  const { data, error } = await supabase
    .from("knowledge_sources")
    .update({ include_in_ai: includeInAi, status: includeInAi ? "synced" : "disabled", updated_at: new Date().toISOString() })
    .eq("id", sourceId)
    .eq("organization_id", orgId)
    .select("*")
    .maybeSingle();
  throwIf(error, "source include");
  return data ? mapSource(data) : null;
};

export const deleteSupabaseSource: Mirror<typeof deleteDemoSource> = async (sourceId) => {
  const { supabase, orgId } = await scoped();
  const { count, error } = await supabase.from("knowledge_sources").delete({ count: "exact" }).eq("id", sourceId).eq("organization_id", orgId);
  throwIf(error, "delete source");
  return (count ?? 0) > 0;
};

export const upsertSupabaseFaq: Mirror<typeof upsertDemoFaq> = async (input) => {
  const { supabase, orgId } = await scoped();
  if (input.id) {
    const { data, error } = await supabase
      .from("faqs")
      .update({ question: input.question, answer: input.answer, enabled: input.enabled })
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    throwIf(error, "update faq");
    return mapFaq(data);
  }
  const { count } = await supabase.from("faqs").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  const { data, error } = await supabase
    .from("faqs")
    .insert({
      organization_id: orgId,
      question: input.question,
      answer: input.answer,
      enabled: input.enabled,
      sort_order: (count ?? 0) + 1,
    })
    .select("*")
    .single();
  throwIf(error, "create faq");
  return mapFaq(data);
};

export const deleteSupabaseFaq: Mirror<typeof deleteDemoFaq> = async (faqId) => {
  const { supabase, orgId } = await scoped();
  const { count, error } = await supabase.from("faqs").delete({ count: "exact" }).eq("id", faqId).eq("organization_id", orgId);
  throwIf(error, "delete faq");
  return (count ?? 0) > 0;
};

export const addSupabaseContentItems: Mirror<typeof addDemoContentItems> = async (items) => {
  const { supabase, orgId } = await scoped();
  const { data: coach } = await supabase.from("coach_profiles").select("id").eq("organization_id", orgId).maybeSingle();
  if (!coach) throw new Error("Coach profile missing.");
  const { data: existing } = await supabase.from("content_items").select("url, sort_order").eq("organization_id", orgId);
  const urls = new Set((existing ?? []).map((row) => row.url));
  const start = (existing ?? []).reduce((max, row) => Math.max(max, Number(row.sort_order ?? 0)), 0);
  const created = [];
  let index = 0;
  for (const item of items) {
    if (urls.has(item.url)) continue;
    const { data, error } = await supabase
      .from("content_items")
      .insert({
        organization_id: orgId,
        coach_id: coach.id,
        type: item.type,
        title: item.title,
        description: item.description ?? null,
        url: item.url,
        thumbnail_url: item.thumbnailUrl ?? null,
        categories: item.categories,
        transcript_available: item.transcriptAvailable,
        include_in_ai: item.includeInAi,
        active: item.active,
        sort_order: start + index + 1,
      })
      .select("*")
      .single();
    throwIf(error, "content");
    created.push(mapContent(data));
    await supabase.from("knowledge_sources").insert({
      organization_id: orgId,
      coach_id: coach.id,
      type: "youtube_video",
      title: item.title,
      url: item.url,
      status: "synced",
      include_in_ai: item.includeInAi,
      last_synced_at: new Date().toISOString(),
    });
    const { data: sourceRow } = await supabase.from("knowledge_sources").select("id").eq("organization_id", orgId).eq("url", item.url).maybeSingle();
    if (sourceRow) {
      const text = [item.title, item.description ?? ""].filter(Boolean).join("\n");
      await supabase.from("knowledge_chunks").insert(
        chunkText(text).map((content, chunkIndex) => ({
          organization_id: orgId,
          coach_id: coach.id,
          source_id: sourceRow.id,
          source_type: "youtube_video",
          title: item.title,
          url: item.url,
          category: item.categories[0] ?? null,
          content,
          position: chunkIndex,
        })),
      );
    }
    index += 1;
  }
  return created;
};

export const updateSupabaseContentItem: Mirror<typeof updateDemoContentItem> = async (input) => {
  const { supabase, orgId } = await scoped();
  const patch: Record<string, unknown> = {};
  if (input.title) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.categories) patch.categories = input.categories;
  if (input.includeInAi !== undefined) patch.include_in_ai = input.includeInAi;
  if (input.active !== undefined) patch.active = input.active;
  const { data, error } = await supabase.from("content_items").update(patch).eq("id", input.id).eq("organization_id", orgId).select("*").maybeSingle();
  throwIf(error, "update content");
  if (!data) return null;
  if (input.includeInAi !== undefined) {
    await supabase
      .from("knowledge_sources")
      .update({ include_in_ai: input.includeInAi, status: input.includeInAi ? "synced" : "disabled" })
      .eq("organization_id", orgId)
      .eq("url", data.url);
  }
  return mapContent(data);
};

export const deleteSupabaseContentItem: Mirror<typeof deleteDemoContentItem> = async (contentId) => {
  const { supabase, orgId } = await scoped();
  const { data } = await supabase.from("content_items").select("url").eq("id", contentId).eq("organization_id", orgId).maybeSingle();
  const { count, error } = await supabase.from("content_items").delete({ count: "exact" }).eq("id", contentId).eq("organization_id", orgId);
  throwIf(error, "delete content");
  if (data?.url) await supabase.from("knowledge_sources").delete().eq("organization_id", orgId).eq("url", data.url);
  return (count ?? 0) > 0;
};

export const getSupabasePublicWidget: Mirror<typeof getDemoPublicWidget> = async (publicIdOrSlug) => {
  const widget = await findPublicWidgetRow(publicIdOrSlug);
  if (!widget) return null;
  const data = await loadWorkspace(widget.organization_id, admin());
  return toPublicWidget(data);
};

export const getSupabaseChatContext: Mirror<typeof getDemoChatContext> = async (publicIdOrSlug) => {
  const widget = await findPublicWidgetRow(publicIdOrSlug);
  if (!widget) return null;
  const data = await loadWorkspace(widget.organization_id, admin());
  const includedSourceIds = new Set(
    data.knowledgeSources.filter((source) => source.includeInAi && source.status !== "disabled").map((source) => source.id),
  );
  return {
    data,
    publicWidget: toPublicWidget(data),
    includedChunks: data.knowledgeChunks.filter((chunk) => includedSourceIds.has(chunk.sourceId)),
  };
};

export const getSupabaseConversation: Mirror<typeof getDemoConversation> = async (conversationId) => {
  if (!/^[0-9a-f-]{16,}$/i.test(conversationId)) return null;
  const { data, error } = await admin().from("conversations").select("*").eq("id", conversationId).maybeSingle();
  throwIf(error, "conversation");
  return data ? mapConversation(data) : null;
};

export const appendSupabaseConversationTurn: Mirror<typeof appendDemoConversationTurn> = async (input) => {
  const client = admin();
  const { data: widget } = await client.from("widgets").select("id, organization_id").eq("id", input.widgetId).maybeSingle();
  if (!widget) throw new Error("WIDGET_NOT_FOUND");
  const orgId = widget.organization_id as string;
  const now = new Date().toISOString();
  let conversation = null;
  if (input.conversationId) {
    const { data: existing } = await client
      .from("conversations")
      .select("*")
      .eq("id", input.conversationId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (existing) conversation = mapConversation(existing);
  }

  const visitorMessage: ChatMessage = { ...input.visitorMessage, id: randomUUID(), conversationId: "", createdAt: now };
  const assistantMessage: ChatMessage = { ...input.assistantMessage, id: randomUUID(), conversationId: "", createdAt: now };

  if (!conversation) {
    const { data, error } = await client
      .from("conversations")
      .insert({
        organization_id: orgId,
        widget_id: input.widgetId,
        visitor_id: input.visitorId,
        session_id: input.sessionId,
        messages: [],
        profile: input.profileUpdates,
        intent_score: input.intentScore,
        intent_level: intentLevelForScore(input.intentScore),
        recommended_service_id: input.recommendedServiceId ?? null,
        page: input.page ?? null,
        referrer: input.referrer ?? null,
        utm: input.utm ?? null,
        device: input.device ?? null,
        preview: input.preview === true,
      })
      .select("*")
      .single();
    throwIf(error, "create conversation");
    conversation = mapConversation(data);
  }

  visitorMessage.conversationId = conversation.id;
  assistantMessage.conversationId = conversation.id;
  const messages = [...conversation.messages, visitorMessage, assistantMessage];
  const profile = { ...conversation.profile, ...input.profileUpdates };
  const { data: saved, error: saveError } = await client
    .from("conversations")
    .update({
      messages,
      profile,
      intent_score: input.intentScore,
      intent_level: intentLevelForScore(input.intentScore),
      recommended_service_id: input.recommendedServiceId ?? conversation.recommendedServiceId ?? null,
      last_message_at: now,
    })
    .eq("id", conversation.id)
    .eq("organization_id", orgId)
    .select("*")
    .single();
  throwIf(saveError, "append conversation");
  const mapped = mapConversation(saved);
  if (mapped.leadId) {
    await client
      .from("leads")
      .update({
        intent_score: mapped.intentScore,
        intent_level: mapped.intentLevel,
        recommended_service_id: mapped.recommendedServiceId ?? null,
        updated_at: now,
      })
      .eq("id", mapped.leadId)
      .eq("organization_id", orgId);
  }
  return { conversation: mapped, assistantMessage };
};

export const updateSupabaseConversationSummary: Mirror<typeof updateDemoConversationSummary> = async (conversationId, summary) => {
  const client = admin();
  const { data, error } = await client.from("conversations").update({ summary }).eq("id", conversationId).select("*").maybeSingle();
  throwIf(error, "summary");
  if (!data) return null;
  const conversation = mapConversation(data);
  if (conversation.leadId) {
    await client.from("leads").update({ summary, updated_at: new Date().toISOString() }).eq("id", conversation.leadId).eq("organization_id", conversation.organizationId);
  }
  return conversation;
};

export const captureSupabasePublicLead: Mirror<typeof captureDemoLead> = async (input) => {
  const widget = await findPublicWidgetRow(input.widgetPublicId);
  if (!widget) throw new Error("WIDGET_NOT_FOUND");
  const client = admin();
  const orgId = widget.organization_id as string;
  const { data: existing } = await client.from("leads").select("*").eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (existing) return { lead: mapLead(existing), duplicate: true };

  const conversation = input.conversationId
    ? (await client.from("conversations").select("*").eq("id", input.conversationId).eq("organization_id", orgId).maybeSingle()).data
    : null;
  const mappedConversation = conversation ? mapConversation(conversation) : null;
  const now = new Date().toISOString();
  const token = createHash("sha256").update(`${randomUUID()}:${input.email}`).digest("hex");
  const activity: LeadActivity[] = [
    ...(mappedConversation ? [{ id: randomUUID(), type: "conversation" as const, label: "Started a conversation", occurredAt: mappedConversation.startedAt }] : []),
    { id: randomUUID(), type: "lead_captured", label: "Lead captured", occurredAt: now },
  ];
  const { data: leadRow, error } = await client
    .from("leads")
    .insert({
      organization_id: orgId,
      widget_id: widget.id,
      conversation_id: mappedConversation?.id ?? null,
      visitor_id: input.visitorId,
      first_name: input.firstName,
      last_name: input.lastName ?? null,
      email: input.email.toLowerCase(),
      phone: input.phone ?? null,
      consent: input.consent,
      sms_consent: input.smsConsent,
      status: "new",
      intent_score: mappedConversation?.intentScore ?? 20,
      intent_level: mappedConversation?.intentLevel ?? "low",
      interest: input.interest ?? null,
      source: input.source,
      session_id: input.sessionId,
      idempotency_key: input.idempotencyKey,
      booking_token_hash: token,
      recommended_service_id: mappedConversation?.recommendedServiceId ?? null,
      summary: input.summary ?? null,
      landing_page: input.landingPage ?? null,
      referrer: input.referrer ?? null,
      utm: input.utm ?? null,
      activity,
    })
    .select("*")
    .single();
  throwIf(error, "capture lead");
  if (mappedConversation) {
    await client.from("conversations").update({ lead_id: leadRow.id, summary: input.summary ?? mappedConversation.summary }).eq("id", mappedConversation.id).eq("organization_id", orgId);
  }
  await client.from("swing_uploads").update({ lead_id: leadRow.id }).eq("organization_id", orgId).eq("visitor_id", input.visitorId).is("lead_id", null);
  await client.from("widget_events").insert({
    organization_id: orgId,
    widget_id: widget.id,
    lead_id: leadRow.id,
    conversation_id: mappedConversation?.id ?? null,
    event_name: "lead_captured",
    session_id: input.sessionId,
    properties: { fingerprint: input.fingerprint },
  });
  return { lead: mapLead(leadRow), duplicate: false };
};

export const saveSupabaseSwingUpload: Mirror<typeof saveDemoSwingUpload> = async (input) => {
  const widget = await findPublicWidgetRow(input.widgetPublicId);
  if (!widget) throw new Error("WIDGET_NOT_FOUND");
  const client = admin();
  const orgId = widget.organization_id as string;
  const { data: lead } = await client.from("leads").select("*").eq("organization_id", orgId).eq("visitor_id", input.visitorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("swing_uploads")
    .insert({
      organization_id: orgId,
      widget_id: widget.id,
      conversation_id: input.conversationId ?? null,
      lead_id: lead?.id ?? null,
      visitor_id: input.visitorId,
      file_name: input.fileName,
      file_path: input.filePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      club: input.club ?? null,
      typical_miss: input.typicalMiss ?? null,
      handicap: input.handicap ?? null,
      goal: input.goal ?? null,
    })
    .select("*")
    .single();
  throwIf(error, "swing upload");
  if (lead) {
    const mapped = mapLead(lead);
    const intentScore = Math.min(100, mapped.intentScore + 35);
    await client.from("leads").update({
      activity: [
        ...mapped.activity,
        { id: randomUUID(), type: "swing_uploaded", label: `Swing video uploaded${input.club ? ` (${input.club})` : ""}`, occurredAt: now },
      ],
      intent_score: intentScore,
      intent_level: intentLevelForScore(intentScore),
      updated_at: now,
    }).eq("id", lead.id).eq("organization_id", orgId);
  }
  return mapUpload(data);
};

export const recordSupabaseEvent: Mirror<typeof recordDemoEvent> = async (input) => {
  const client = admin();
  const { data: widget } = await client.from("widgets").select("id, organization_id").eq("id", input.widgetId).maybeSingle();
  if (!widget) throw new Error("WIDGET_NOT_FOUND");
  const oncePerSession = ["widget_view", "widget_open", "conversation_started", "lead_captured", "booking_clicked", "swing_uploaded"];
  if (oncePerSession.includes(input.name)) {
    const { data: existing } = await client
      .from("widget_events")
      .select("*")
      .eq("widget_id", input.widgetId)
      .eq("event_name", input.name)
      .eq("session_id", input.sessionId)
      .limit(1)
      .maybeSingle();
    if (existing) return mapEvent(existing);
  }
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("widget_events")
    .insert({
      organization_id: widget.organization_id,
      widget_id: input.widgetId,
      lead_id: input.leadId ?? null,
      conversation_id: input.conversationId ?? null,
      event_name: input.name,
      session_id: input.sessionId,
      properties: input.properties ?? null,
    })
    .select("*")
    .single();
  throwIf(error, "event");
  if (input.name === "booking_clicked" && input.leadId) {
    const { data: lead } = await client.from("leads").select("*").eq("id", input.leadId).eq("organization_id", widget.organization_id).maybeSingle();
    if (lead && !lead.booking_clicked_at) {
      const mapped = mapLead(lead);
      await client.from("leads").update({
        booking_clicked_at: now,
        updated_at: now,
        activity: [...mapped.activity, { id: randomUUID(), type: "booking_clicked", label: "Booking link clicked", occurredAt: now }],
      }).eq("id", lead.id).eq("organization_id", widget.organization_id);
    }
  }
  return mapEvent(data);
};

export const recordSupabaseBookingClick: Mirror<typeof recordDemoBookingClick> = async (token) => {
  const client = admin();
  const { data: leadRow } = await client.from("leads").select("*").eq("booking_token_hash", token).maybeSingle();
  if (!leadRow) return null;
  const lead = mapLead(leadRow);
  const serviceRes = lead.recommendedServiceId
    ? await client.from("services").select("booking_url").eq("id", lead.recommendedServiceId).maybeSingle()
    : { data: null as { booking_url?: string } | null };
  const { data: coach } = await client.from("coach_profiles").select("booking_url").eq("organization_id", lead.organizationId).maybeSingle();
  const destination = serviceRes.data?.booking_url || coach?.booking_url || "";
  if (!lead.bookingClickedAt) {
    const now = new Date().toISOString();
    await client.from("leads").update({
      booking_clicked_at: now,
      updated_at: now,
      activity: [...lead.activity, { id: randomUUID(), type: "booking_clicked", label: "Booking link clicked", occurredAt: now }],
    }).eq("id", lead.id).eq("organization_id", lead.organizationId);
    await client.from("widget_events").insert({
      organization_id: lead.organizationId,
      widget_id: lead.widgetId,
      lead_id: lead.id,
      conversation_id: lead.conversationId ?? null,
      event_name: "booking_clicked",
      session_id: lead.sessionId,
    });
  }
  return { lead, destination };
};

export const countRecentSupabaseLeads: Mirror<typeof countRecentDemoLeads> = async (fingerprint, minutes = 15) => {
  const threshold = new Date(Date.now() - minutes * 60_000).toISOString();
  const { count, error } = await admin()
    .from("widget_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", "lead_captured")
    .gte("occurred_at", threshold)
    .contains("properties", { fingerprint });
  throwIf(error, "lead rate");
  return count ?? 0;
};

export const countSupabaseLeadsThisMonth: Mirror<typeof countDemoLeadsThisMonth> = async (organizationId?: string) => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  let query = admin().from("leads").select("id", { count: "exact", head: true }).gte("created_at", start);
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { count, error } = await query;
  throwIf(error, "lead count");
  return count ?? 0;
};

export const countSupabaseConversationsThisMonth: Mirror<typeof countDemoConversationsThisMonth> = async (organizationId?: string) => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  let query = admin().from("widget_events").select("id", { count: "exact", head: true }).eq("event_name", "conversation_started").gte("occurred_at", start);
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { count, error } = await query;
  throwIf(error, "conversation count");
  return count ?? 0;
};
