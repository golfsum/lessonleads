import "server-only";

import type { LeadStatus, PublicWidget, WorkspaceData } from "@/lib/domain/types";
import {
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
  isDemoMode,
  readDemoWorkspace,
  recordDemoBookingClick,
  recordDemoEvent,
  resetDemoWorkspace,
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
import {
  isSiteConversationId,
  isSiteOrgId,
  isSiteWidgetId,
  isSiteWidgetPublicId,
} from "@/lib/site-widget/ids";
import {
  appendSiteConversationTurn,
  captureSiteLead,
  countRecentSiteLeadsByFingerprint,
  countSiteConversationsThisMonth,
  countSiteLeadsThisMonth,
  getSiteChatContext,
  getSiteConversation,
  getSitePublicWidget,
  recordSiteEvent,
  updateSiteConversationSummary,
} from "@/lib/site-widget/store";

async function supabase() {
  return import("@/lib/data/workspace-supabase");
}

// ---------- Coach workspace (dashboard) ----------

export async function getWorkspaceData(): Promise<WorkspaceData> {
  if (isDemoMode()) return readDemoWorkspace();
  return (await supabase()).getSupabaseWorkspaceData();
}

export async function resetDemoData() {
  if (!isDemoMode()) throw new Error("Demo mode is disabled.");
  return resetDemoWorkspace();
}

export async function saveOnboarding(input: Parameters<typeof saveDemoOnboarding>[0]) {
  if (isDemoMode()) return saveDemoOnboarding(input);
  return (await supabase()).saveSupabaseOnboarding(input);
}

export async function upsertService(input: Parameters<typeof upsertDemoService>[0]) {
  if (isDemoMode()) return upsertDemoService(input);
  return (await supabase()).upsertSupabaseService(input);
}

export async function deleteService(serviceId: string) {
  if (isDemoMode()) return deleteDemoService(serviceId);
  return (await supabase()).deleteSupabaseService(serviceId);
}

export async function saveWidget(input: Parameters<typeof saveDemoWidget>[0]) {
  if (isDemoMode()) return saveDemoWidget(input);
  return (await supabase()).saveSupabaseWidget(input);
}

export async function updateCoachProfile(input: Parameters<typeof updateDemoCoachProfile>[0]) {
  if (isDemoMode()) return updateDemoCoachProfile(input);
  return (await supabase()).updateSupabaseCoachProfile(input);
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  if (isDemoMode()) return updateDemoLeadStatus(leadId, status);
  return (await supabase()).updateSupabaseLeadStatus(leadId, status);
}

export async function updateLeadNotes(leadId: string, notes: string) {
  if (isDemoMode()) return updateDemoLeadNotes(leadId, notes);
  return (await supabase()).updateSupabaseLeadNotes(leadId, notes);
}

// ---------- Knowledge management ----------

export async function applyWebsiteScan(scan: Parameters<typeof applyDemoWebsiteScan>[0]) {
  if (isDemoMode()) return applyDemoWebsiteScan(scan);
  return (await supabase()).applySupabaseWebsiteScan(scan);
}

export async function setWebsiteScanStatus(
  status: WorkspaceData["website"]["scanStatus"],
  url?: string,
  error?: string,
) {
  if (isDemoMode()) return setDemoWebsiteScanStatus(status, url, error);
  return (await supabase()).setSupabaseWebsiteScanStatus(status, url, error);
}

export async function addScannedPage(page: Parameters<typeof addDemoScannedPage>[0]) {
  if (isDemoMode()) return addDemoScannedPage(page);
  return (await supabase()).addSupabaseScannedPage(page);
}

export async function resyncSource(sourceId: string, page: Parameters<typeof resyncDemoSource>[1]) {
  if (isDemoMode()) return resyncDemoSource(sourceId, page);
  return (await supabase()).resyncSupabaseSource(sourceId, page);
}

export async function addManualKnowledge(input: Parameters<typeof addDemoManualKnowledge>[0]) {
  if (isDemoMode()) return addDemoManualKnowledge(input);
  return (await supabase()).addSupabaseManualKnowledge(input);
}

export async function setSourceIncluded(sourceId: string, includeInAi: boolean) {
  if (isDemoMode()) return setDemoSourceIncluded(sourceId, includeInAi);
  return (await supabase()).setSupabaseSourceIncluded(sourceId, includeInAi);
}

export async function deleteSource(sourceId: string) {
  if (isDemoMode()) return deleteDemoSource(sourceId);
  return (await supabase()).deleteSupabaseSource(sourceId);
}

export async function upsertFaq(input: Parameters<typeof upsertDemoFaq>[0]) {
  if (isDemoMode()) return upsertDemoFaq(input);
  return (await supabase()).upsertSupabaseFaq(input);
}

export async function deleteFaq(faqId: string) {
  if (isDemoMode()) return deleteDemoFaq(faqId);
  return (await supabase()).deleteSupabaseFaq(faqId);
}

// ---------- Content library ----------

export async function addContentItems(items: Parameters<typeof addDemoContentItems>[0]) {
  if (isDemoMode()) return addDemoContentItems(items);
  return (await supabase()).addSupabaseContentItems(items);
}

export async function updateContentItem(input: Parameters<typeof updateDemoContentItem>[0]) {
  if (isDemoMode()) return updateDemoContentItem(input);
  return (await supabase()).updateSupabaseContentItem(input);
}

export async function deleteContentItem(contentId: string) {
  if (isDemoMode()) return deleteDemoContentItem(contentId);
  return (await supabase()).deleteSupabaseContentItem(contentId);
}

// ---------- Public widget runtime ----------

export async function getPublicWidget(publicIdOrSlug: string): Promise<PublicWidget | null> {
  if (isSiteWidgetPublicId(publicIdOrSlug)) return getSitePublicWidget();
  if (isDemoMode()) return getDemoPublicWidget(publicIdOrSlug);
  return (await supabase()).getSupabasePublicWidget(publicIdOrSlug);
}

export async function getChatContext(publicIdOrSlug: string) {
  if (isSiteWidgetPublicId(publicIdOrSlug)) return getSiteChatContext();
  if (isDemoMode()) return getDemoChatContext(publicIdOrSlug);
  return (await supabase()).getSupabaseChatContext(publicIdOrSlug);
}

export async function getConversation(conversationId: string) {
  if (isSiteConversationId(conversationId)) return getSiteConversation(conversationId);
  if (isDemoMode()) return getDemoConversation(conversationId);
  return (await supabase()).getSupabaseConversation(conversationId);
}

export async function appendConversationTurn(input: Parameters<typeof appendDemoConversationTurn>[0]) {
  if (isSiteWidgetId(input.widgetId)) return appendSiteConversationTurn(input);
  if (isDemoMode()) return appendDemoConversationTurn(input);
  return (await supabase()).appendSupabaseConversationTurn(input);
}

export async function updateConversationSummary(conversationId: string, summary: string) {
  if (isSiteConversationId(conversationId)) return updateSiteConversationSummary(conversationId, summary);
  if (isDemoMode()) return updateDemoConversationSummary(conversationId, summary);
  return (await supabase()).updateSupabaseConversationSummary(conversationId, summary);
}

export async function capturePublicLead(input: Parameters<typeof captureDemoLead>[0]) {
  if (isSiteWidgetPublicId(input.widgetPublicId)) return captureSiteLead(input);
  if (isDemoMode()) return captureDemoLead(input);
  return (await supabase()).captureSupabasePublicLead(input);
}

export async function saveSwingUpload(input: Parameters<typeof saveDemoSwingUpload>[0]) {
  if (isDemoMode()) return saveDemoSwingUpload(input);
  return (await supabase()).saveSupabaseSwingUpload(input);
}

export async function recordWidgetEvent(input: Parameters<typeof recordDemoEvent>[0]) {
  if (isSiteWidgetId(input.widgetId)) return recordSiteEvent(input);
  if (isDemoMode()) return recordDemoEvent(input);
  return (await supabase()).recordSupabaseEvent(input);
}

export async function recordBookingClick(token: string) {
  if (isDemoMode()) return recordDemoBookingClick(token);
  return (await supabase()).recordSupabaseBookingClick(token);
}

export async function countRecentLeadsByFingerprint(fingerprint: string, minutes = 15) {
  const site = countRecentSiteLeadsByFingerprint(fingerprint, minutes);
  if (isDemoMode()) return site + (await countRecentDemoLeads(fingerprint, minutes));
  return site + (await (await supabase()).countRecentSupabaseLeads(fingerprint, minutes));
}

export async function countConversationsThisMonth(organizationId?: string) {
  if (organizationId && isSiteOrgId(organizationId)) return countSiteConversationsThisMonth();
  if (isDemoMode()) return countDemoConversationsThisMonth(organizationId);
  return (await supabase()).countSupabaseConversationsThisMonth(organizationId);
}

export async function countLeadsThisMonth(organizationId?: string) {
  if (organizationId && isSiteOrgId(organizationId)) return countSiteLeadsThisMonth();
  if (isDemoMode()) return countDemoLeadsThisMonth(organizationId);
  return (await supabase()).countSupabaseLeadsThisMonth(organizationId);
}
