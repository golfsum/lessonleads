import "server-only";

import type { ContentItem, Conversation, PublicCoach, Service, SwingUpload } from "@/lib/domain/types";
import { describeFocusArea, describeIssue } from "./profile";
import { formatPrice } from "@/lib/domain/format";

/**
 * Concise coach-facing summary of a conversation, built from captured
 * profile facts and observed behavior. Deterministic and honest: it only
 * states things the visitor actually said or did.
 */
export function buildLeadSummary(input: {
  firstName: string;
  conversation: Conversation;
  services: Service[];
  contentItems: ContentItem[];
  swingUploads: SwingUpload[];
  coach: PublicCoach;
}): string {
  const { conversation, firstName } = input;
  const profile = conversation.profile;
  const lines: string[] = [];

  const focus = describeFocusArea(profile.focusArea);
  const issue = profile.primaryIssue ? describeIssue(profile.primaryIssue.trim()) : undefined;
  const identity = profile.handicap
    ? `${profile.handicap}-handicap golfer`
    : profile.experienceLevel
      ? `${profile.experienceLevel} golfer`
      : undefined;
  const work = issue ? `working on ${issue}${focus && !issue.includes(focus) ? ` with the ${focus}` : ""}` : focus ? `focused on ${focus}` : undefined;

  if (identity && work) lines.push(`${firstName} is a ${identity} ${work}.`);
  else if (identity) lines.push(`${firstName} is a ${identity}.`);
  else if (work) lines.push(`${firstName} is ${work}.`);
  else lines.push(`${firstName} reached out through the website widget.`);

  if (profile.goals) lines.push(`Goal: ${profile.goals}.`);
  if (profile.playFrequency) lines.push(`Plays ${profile.playFrequency}.`);
  if (profile.coachingPreference) {
    lines.push(profile.coachingPreference === "online" ? `Interested in online coaching.` : `Looking for in-person coaching.`);
  }
  if (profile.isLocal) lines.push(`Local or visiting the area.`);
  if (profile.urgency) lines.push(`Wants help soon.`);

  const uploads = input.swingUploads.filter((upload) => upload.conversationId === conversation.id);
  if (uploads.length > 0) {
    const upload = uploads[0];
    const details = [upload.club, upload.typicalMiss].filter(Boolean).join(", ");
    lines.push(`Uploaded a swing video${details ? ` (${details})` : ""}.`);
  }

  const viewedVideoIds = new Set(
    conversation.messages.flatMap((message) => (message.cards ?? []).filter((card) => card.kind === "video").map((card) => (card.kind === "video" ? card.contentId : ""))),
  );
  if (viewedVideoIds.size > 0) {
    const titles = input.contentItems.filter((item) => viewedVideoIds.has(item.id)).map((item) => `"${item.title}"`);
    if (titles.length > 0) lines.push(`Was shown ${titles.slice(0, 2).join(" and ")}.`);
  }

  if (conversation.recommendedServiceId) {
    const service = input.services.find((candidate) => candidate.id === conversation.recommendedServiceId);
    if (service) lines.push(`Recommended service: ${service.name} (${formatPrice(service)}).`);
  }

  const visitorMessages = conversation.messages.filter((message) => message.role === "visitor").length;
  lines.push(`${visitorMessages} visitor message${visitorMessages === 1 ? "" : "s"} in the conversation.`);
  lines.push(`Intent: ${conversation.intentLevel.charAt(0).toUpperCase()}${conversation.intentLevel.slice(1)}.`);

  return lines.join(" ");
}
