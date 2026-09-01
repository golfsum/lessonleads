import type { AnalyticsSummary, WidgetEventName, WorkspaceData } from "@/lib/domain/types";
import { isCourseLike } from "@/lib/domain/organization";

export function calculateAnalytics(data: WorkspaceData): AnalyticsSummary {
  const count = (name: WidgetEventName) => data.events.filter((event) => event.name === name).length;
  const widgetViews = count("widget_view");
  const widgetOpens = count("widget_open");
  const conversations = count("conversation_started");
  const messages = count("message_sent");
  const leads = count("lead_captured");
  const bookingClicks = count("booking_clicked");
  const swingUploads = count("swing_uploaded");
  const videoViews = count("video_viewed");
  const teeTimeSearches = count("tee_time_search");
  const teeTimeResults = count("tee_time_result_viewed");
  const teeTimeBookingClicks = count("tee_time_booking_clicked");
  const highIntentLeads = data.leads.filter((lead) => lead.intentLevel === "high").length;
  const lessonLeads = data.leads.filter((lead) => lead.leadType === "lesson").length;
  const membershipLeads = data.leads.filter((lead) => lead.leadType === "membership").length;
  const tournamentLeads = data.leads.filter((lead) =>
    ["tournament", "corporate_event", "group_outing", "wedding"].includes(lead.leadType),
  ).length;
  const otherLeads = data.leads.length - lessonLeads - membershipLeads - tournamentLeads;

  const serviceCounts = new Map<string, number>();
  for (const lead of data.leads) {
    if (!lead.recommendedServiceId) continue;
    serviceCounts.set(lead.recommendedServiceId, (serviceCounts.get(lead.recommendedServiceId) ?? 0) + 1);
  }
  const totalLeads = Math.max(data.leads.length, 1);
  const topServices = [...serviceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, countValue]) => ({
      label: data.services.find((service) => service.id === id)?.name ?? "Unknown service",
      count: countValue,
      percentage: Math.round((countValue / totalLeads) * 100),
    }));

  const topicCounts = new Map<string, number>();
  for (const conversation of data.conversations) {
    const focus = conversation.profile.focusArea;
    if (!focus) continue;
    const label = focus.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
    topicCounts.set(label, (topicCounts.get(label) ?? 0) + 1);
  }
  const totalTopics = Math.max([...topicCounts.values()].reduce((sum, value) => sum + value, 0), 1);
  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, countValue]) => ({ label, count: countValue, percentage: Math.round((countValue / totalTopics) * 100) }));

  const rate = (numerator: number, denominator: number) => (denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0);
  const totalBookingClicks = bookingClicks + teeTimeBookingClicks;
  const course = isCourseLike(data.organization.type);
  const funnel = course
    ? [
        { label: "Widget Views", count: widgetViews, rateFromPrevious: null },
        { label: "Widget Opens", count: widgetOpens, rateFromPrevious: rate(widgetOpens, widgetViews) },
        { label: "AI Conversations", count: conversations, rateFromPrevious: rate(conversations, widgetOpens) },
        { label: "Tee Time Searches", count: teeTimeSearches, rateFromPrevious: rate(teeTimeSearches, conversations) },
        { label: "Booking Clicks", count: totalBookingClicks, rateFromPrevious: rate(totalBookingClicks, teeTimeSearches || conversations) },
      ]
    : [
        { label: "Widget Views", count: widgetViews, rateFromPrevious: null },
        { label: "Widget Opens", count: widgetOpens, rateFromPrevious: rate(widgetOpens, widgetViews) },
        { label: "AI Conversations", count: conversations, rateFromPrevious: rate(conversations, widgetOpens) },
        { label: "Leads Captured", count: leads, rateFromPrevious: rate(leads, conversations) },
        { label: "Booking Clicks", count: bookingClicks, rateFromPrevious: rate(bookingClicks, leads) },
      ];

  return {
    widgetViews,
    widgetOpens,
    conversations,
    messages,
    leads,
    highIntentLeads,
    bookingClicks,
    swingUploads,
    videoViews,
    teeTimeSearches,
    teeTimeResults,
    teeTimeBookingClicks,
    confirmedTeeTimeBookings: 0,
    lessonLeads,
    membershipLeads,
    tournamentLeads,
    otherLeads,
    conversationToLeadRate: rate(leads, conversations),
    conversationToBookingClickRate: rate(totalBookingClicks, conversations),
    visitorToLeadRate: rate(leads, widgetOpens),
    leadToBookingClickRate: rate(totalBookingClicks, leads),
    funnel,
    leadFunnels: [
      { label: "Membership inquiries", count: membershipLeads },
      { label: "Tournament inquiries", count: tournamentLeads },
      { label: "Lesson inquiries", count: lessonLeads },
    ],
    topServices,
    topTopics,
  };
}
