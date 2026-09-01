import "server-only";

import type {
  AnswerSource,
  ChatMessage,
  ContentItem,
  Conversation,
  CourseAnnouncement,
  FaqItem,
  KnowledgeChunk,
  LeadType,
  Location,
  MessageCard,
  OrganizationType,
  PublicCoach,
  PublicStaff,
  PublicTeeTime,
  Service,
  VisitorProfile,
} from "@/lib/domain/types";
import { intentLevelForScore } from "@/lib/domain/types";
import { classifyVisitorIntent, isHowItWorksQuestion, isPlanQuestion, type VisitorIntent } from "./classify";
import { parseTeeTimeRequest } from "./tee-time-parse";
import { retrieveChunks, scoreText, tokenize } from "@/lib/knowledge/retrieval";
import { accumulateIntent } from "./intent";
import { describeFocusArea, extractProfileUpdates } from "./profile";
import { generateGroundedAnswer, llmAvailable } from "./llm";
import { formatPrice, sortServicesByPrice } from "@/lib/domain/format";
import { isCourseLike, orgPossessive } from "@/lib/domain/organization";
import type { TeeTimeSearchInput, TeeTimeSearchResult } from "@/lib/tee-times/types";
import { AVAILABILITY_NOTICE } from "@/lib/tee-times/types";

export interface EngineInput {
  message: string;
  conversation: Conversation;
  leadCaptured: boolean;
  coach: PublicCoach;
  assistantName: string;
  organizationType: OrganizationType;
  organizationId: string;
  services: Service[];
  contentItems: ContentItem[];
  faqs: FaqItem[];
  chunks: KnowledgeChunk[];
  staff: PublicStaff[];
  locations: Location[];
  announcements: Array<Pick<CourseAnnouncement, "id" | "title" | "message" | "priority">>;
  suggestedQuestions: string[];
  searchTeeTimes?: (input: Omit<TeeTimeSearchInput, "organizationId">) => Promise<TeeTimeSearchResult>;
}

export interface EngineResult {
  content: string;
  cards: MessageCard[];
  sources: AnswerSource[];
  suggestedReplies: string[];
  profileUpdates: Partial<VisitorProfile>;
  intentScore: number;
  recommendedServiceId?: string;
  analytics?: Array<{ name: "tee_time_search" | "tee_time_result_viewed"; properties?: Record<string, string | number | boolean | null> }>;
}

function firstName(coach: PublicCoach): string {
  return coach.name.split(" ")[0] || coach.name;
}

function isProductAssistant(coach: PublicCoach) {
  return coach.name.trim().toLowerCase() === coach.businessName.trim().toLowerCase();
}

function productSuggestedReplies(input: EngineInput, limit: number): string[] {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const currentQuestion = normalize(input.message);
  return input.suggestedQuestions
    .filter((question) => normalize(question) !== currentQuestion)
    .slice(0, limit);
}

function aboutSubject(coach: PublicCoach, type: OrganizationType): string {
  if (isProductAssistant(coach)) return coach.name;
  if (isCourseLike(type)) return coach.businessName;
  return `${firstName(coach)}'s coaching`;
}

function brand(coach: PublicCoach, type: OrganizationType) {
  return isCourseLike(type) ? coach.businessName : firstName(coach);
}

interface SentenceScore {
  sentence: string;
  score: number;
}

function pickRelevantSentences(query: string, content: string, maxSentences: number): string[] {
  const sentences = content
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 25 && sentence.length < 400);
  const queryTokens = new Set(tokenize(query));
  const scored: SentenceScore[] = sentences.map((sentence, index) => {
    let score = 0;
    for (const token of tokenize(sentence)) if (queryTokens.has(token)) score += 1;
    return { sentence, score: score + Math.max(0, 1.5 - index * 0.1) };
  });
  const top = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences);
  return sentences.filter((sentence) => top.some((entry) => entry.sentence === sentence)).slice(0, maxSentences);
}

function matchVideo(query: string, contentItems: ContentItem[]): ContentItem | null {
  let best: ContentItem | null = null;
  let bestScore = 0;
  for (const item of contentItems) {
    if (!item.active || !item.includeInAi) continue;
    const score = scoreText(query, `${item.description ?? ""} ${item.categories.join(" ")}`, item.title);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return bestScore >= 3 ? best : null;
}

function matchFaq(query: string, faqs: FaqItem[]): FaqItem | null {
  let best: FaqItem | null = null;
  let bestScore = 0;
  for (const faq of faqs) {
    if (!faq.enabled) continue;
    const score = scoreText(query, faq.answer, faq.question);
    if (score > bestScore) {
      best = faq;
      bestScore = score;
    }
  }
  return bestScore >= 3 ? best : null;
}

function matchAnnouncement(query: string, announcements: EngineInput["announcements"]): EngineInput["announcements"][number] | null {
  let best: EngineInput["announcements"][number] | null = null;
  let bestScore = 0;
  for (const item of announcements) {
    const textScore = scoreText(query, item.message, item.title);
    if (textScore < 2) continue;
    const score = textScore + item.priority;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

function prependAnnouncement(
  announcement: EngineInput["announcements"][number] | null,
  content: string,
  sources: AnswerSource[],
): { content: string; sources: AnswerSource[] } {
  if (!announcement) return { content, sources };
  const source: AnswerSource = { sourceId: announcement.id, title: announcement.title, type: "announcement" };
  const nextSources = sources.some((item) => item.sourceId === announcement.id) ? sources : [source, ...sources];
  if (!content) return { content: announcement.message, sources: nextSources };
  if (content.startsWith(announcement.message)) return { content, sources: nextSources };
  return { content: `${announcement.message}\n\n${content}`, sources: nextSources };
}

export function recommendService(input: {
  services: Service[];
  profile: VisitorProfile;
  topicText: string;
  wantsUpload?: boolean;
}): Service | null {
  const active = input.services.filter((service) => service.active);
  if (active.length === 0) return null;
  let best: Service | null = null;
  let bestScore = -1;
  for (const service of active) {
    let score = scoreText(input.topicText, `${service.description} ${service.bestFor.join(" ")}`, service.name);
    if (service.featured) score += 1.5;
    if (input.profile.coachingPreference === "online" && (service.mode === "online" || service.mode === "both")) score += 3;
    if (input.profile.coachingPreference === "in_person" && (service.mode === "in_person" || service.mode === "both")) score += 2;
    if (input.wantsUpload && /\b(analysis|review|online|video)\b/i.test(`${service.name} ${service.description}`)) score += 5;
    if (input.profile.experienceLevel === "beginner" && /\bbeginner|new|intro|fundamental/i.test(`${service.name} ${service.bestFor.join(" ")}`)) score += 2;
    if (/\bjunior|kid|child|my (son|daughter)\b/i.test(input.topicText) && /\bjunior\b/i.test(service.name)) score += 6;
    if (score > bestScore) {
      best = service;
      bestScore = score;
    }
  }
  return best;
}

function recommendStaff(staff: PublicStaff[], message: string, profile: VisitorProfile): PublicStaff | null {
  if (staff.length === 0) return null;
  let best: PublicStaff | null = null;
  let bestScore = -1;
  for (const member of staff) {
    let score = scoreText(message, `${member.bio} ${member.specialties.join(" ")} ${member.title}`, member.name);
    if (profile.experienceLevel === "beginner" && /\bbeginner|intro|new golfer/i.test(`${member.bio} ${member.specialties.join(" ")}`)) score += 4;
    if (/\bjunior|kid|child|son|daughter\b/i.test(message) && /\bjunior\b/i.test(`${member.title} ${member.specialties.join(" ")}`)) score += 6;
    if (score > bestScore) {
      best = member;
      bestScore = score;
    }
  }
  return best ?? staff[0];
}

function capturePrompt(kind: VisitorIntent, who: string, video: ContentItem | null, type: OrganizationType): string {
  if (kind === "tournament") return "I can have the events team follow up. Share a name, email, and a few details about the outing.";
  if (kind === "membership") return "Would you like someone from the club to contact you about membership?";
  if (video) return `Want me to send you a link to this drill so you don't lose it? ${who} can also follow up with you directly.`;
  if (kind === "booking" || kind === "swing_upload") return `Want me to save your details so ${who} can follow up if anything comes up with your booking?`;
  if (isCourseLike(type)) return "Want me to have the club follow up with you?";
  return `Want me to save these recommendations and let ${who} know what you're working on?`;
}

function leadTypeForIntent(kind: VisitorIntent): LeadType {
  if (kind === "tournament") return "tournament";
  if (kind === "membership") return "membership";
  if (kind === "lesson" || kind === "swing_upload" || kind === "swing_help" || kind === "booking") return "lesson";
  return "general";
}

const FOLLOW_UPS: Record<string, string[]> = {
  driver: ["Do your shots usually start left and curve right, start straight and curve right, or start right and stay right?"],
  putting: ["Are you missing more on speed (leaving them short or long) or on line?"],
  short_game: ["Is the trouble mostly on tight lies, in the rough, or out of bunkers?"],
  irons: ["Is the miss usually fat (hitting the ground first) or thin (catching it low on the face)?"],
  course_management: ["What does a typical blow-up hole look like for you?"],
};

const VOLATILE_QUESTION =
  /\b(rate|green fee|how much|price|hours?|open today|closed|aeration|weather|available|twilight|membership (cost|price|dues)|restaurant hours)\b/i;

export async function respond(input: EngineInput): Promise<EngineResult> {
  const coachFirst = firstName(input.coach);
  const who = brand(input.coach, input.organizationType);
  const profileUpdates = extractProfileUpdates(input.message);
  const profile: VisitorProfile = { ...input.conversation.profile, ...profileUpdates };
  const { score: intentScore } = accumulateIntent(input.conversation.intentScore, input.message);
  const intentLevel = intentLevelForScore(intentScore);
  const kind = classifyVisitorIntent(input.message, input.organizationType);
  const visitorMessageCount = input.conversation.messages.filter((message) => message.role === "visitor").length + 1;

  const cards: MessageCard[] = [];
  const sources: AnswerSource[] = [];
  const analytics: EngineResult["analytics"] = [];
  let suggestedReplies: string[] = [];
  let recommendedServiceId: string | undefined;
  let content = "";

  const includedChunks = input.chunks;
  const activeFaqs = input.faqs.filter((faq) => faq.enabled);
  const announcement = matchAnnouncement(input.message, input.announcements);

  if (kind === "greeting") {
    content = isCourseLike(input.organizationType)
      ? `Welcome. I'm ${input.assistantName}. I can help with tee times, rates, memberships, events, and lessons at ${input.coach.businessName}.`
      : `Hey! I'm ${input.assistantName}. Tell me what you're struggling with, or ask me anything about ${aboutSubject(input.coach, input.organizationType)}.`;
    suggestedReplies = input.suggestedQuestions.slice(0, 3);
  } else if (kind === "tee_time_search") {
    const parsed = parseTeeTimeRequest(input.message);
    const locationHint = parsed?.locationHint;
    const location = locationHint
      ? input.locations.find((item) => item.name.toLowerCase().includes(locationHint.split(" ")[0] ?? ""))
      : input.locations[0];
    analytics.push({
      name: "tee_time_search",
      properties: { date: parsed?.date ?? null, players: parsed?.players ?? 4, location: location?.name ?? null },
    });
    if (!input.searchTeeTimes || !parsed) {
      content = "I can help you get to the tee sheet.";
      cards.push({
        kind: "booking_url",
        label: "View Available Tee Times",
        url: input.coach.bookingUrl || "/",
        tracking: "tee_time_booking_clicked",
      });
    } else {
      const result = await input.searchTeeTimes({
        date: parsed.date,
        players: parsed.players,
        timeMin: parsed.timeMin,
        timeMax: parsed.timeMax,
        holes: parsed.holes,
        locationId: location?.id,
        facilityId: location?.externalFacilityId,
        latitude: location?.latitude,
        longitude: location?.longitude,
        timezone: location?.timezone || input.coach.timezone,
      });
      if (result.teeTimes.length > 0) {
        content = result.demo
          ? `I found a few demo times close to what you asked for. This is sample availability, not a live tee sheet.`
          : `I found ${result.teeTimes.length === 1 ? "an option" : `${Math.min(result.teeTimes.length, 3)} options`} close to that window. ${AVAILABILITY_NOTICE}`;
        cards.push({
          kind: "tee_times",
          teeTimes: result.teeTimes.slice(0, 5) as PublicTeeTime[],
          provider: result.provider,
          searchedAt: result.searchedAt,
          demo: result.demo,
          bookingUrl: result.bookingUrl,
          notice: result.notice,
        });
        analytics.push({ name: "tee_time_result_viewed", properties: { count: result.teeTimes.length, provider: result.provider } });
        suggestedReplies = ["Does that include a cart?", "Anything a little later?", "Can I book a lesson too?"];
      } else if (result.bookingUrl) {
        content =
          result.error === "provider_unavailable"
            ? "I couldn't retrieve live tee times right now. You can still view the course booking page here:"
            : "I don't have live times for that window. You can still check the course tee sheet:";
        cards.push({ kind: "booking_url", label: "View Tee Times", url: result.bookingUrl, tracking: "tee_time_booking_clicked" });
      } else {
        content = "I don't have live tee times connected yet. The club can help you find a time if you leave your details.";
        cards.push({ kind: "capture", prompt: "Want the club to follow up about a tee time?", leadType: "general" });
      }
    }
  } else if (kind === "membership") {
    const membershipAnswer = answerFromKnowledge(input, profile, who, "membership");
    content = membershipAnswer.content;
    sources.push(...membershipAnswer.sources);
    cards.push(...membershipAnswer.cards);
    if (!membershipAnswer.found && !/\b\d/.test(content)) {
      content = `The course offers membership options. I don't have current prices in approved knowledge, so I won't guess. Would you like someone from the club to contact you?`;
    } else {
      content += `\n\nWould you like someone from the club to contact you?`;
    }
    cards.push({ kind: "capture", prompt: "Share your name and email and the membership team can follow up.", leadType: "membership" });
    suggestedReplies = ["Tell me about weekday membership", "Do you have junior memberships?"];
  } else if (kind === "tournament") {
    const eventAnswer = answerFromKnowledge(input, profile, who, "events");
    content = eventAnswer.content
      ? `${eventAnswer.content}\n\nFor a group outing, the events team is the best next step. What date are you considering?`
      : `We host group outings and tournaments. For a group that size, the events team is the best next step. What date are you considering?`;
    sources.push(...eventAnswer.sources);
    cards.push({
      kind: "capture",
      prompt: "Share a name, company, email, desired date, and estimated players so the events team can follow up.",
      leadType: "tournament",
    });
    suggestedReplies = ["About 40 players", "We also need lunch", "This is a company outing"];
  } else if (kind === "factual_business") {
    const result = await answerFactual(input, profile, who);
    content = result.content;
    cards.push(...result.cards);
    sources.push(...result.sources);
    suggestedReplies = result.suggestedReplies;
    recommendedServiceId = result.recommendedServiceId;
  } else if (kind === "swing_upload") {
    const service = recommendService({ services: input.services, profile, topicText: input.message, wantsUpload: true });
    content = service
      ? `Yes, you can upload your swing right here. Based on what you've described, ${coachFirst}'s ${service.name} is probably the best fit${service.priceCents || service.priceLabel ? ` (${formatPrice(service)})` : ""}.`
      : `Yes, you can upload your swing right here and ${coachFirst} will take a look.`;
    cards.push({ kind: "swing_upload", prompt: "Upload your swing" });
    if (service) {
      cards.push({ kind: "service", serviceId: service.id });
      recommendedServiceId = service.id;
    }
    suggestedReplies = ["How does the swing review work?", "What should I film?"];
  } else if (kind === "lesson" && isCourseLike(input.organizationType) && input.staff.length > 0) {
    const member = recommendStaff(input.staff, input.message, profile);
    const service = recommendService({ services: input.services, profile, topicText: input.message });
    content = member
      ? `For that, ${member.name} (${member.title}) is a strong fit.${member.bio ? ` ${member.bio.slice(0, 220)}` : ""}`
      : `We have teaching professionals on staff.`;
    if (member) cards.push({ kind: "staff", staffId: member.id });
    if (service) {
      cards.push({ kind: "service", serviceId: service.id });
      recommendedServiceId = service.id;
    }
    suggestedReplies = ["What do lessons cost?", "Can I book with them?"];
  } else if (kind === "swing_help") {
    const retrieved = retrieveChunks(input.message, includedChunks, 4);
    const video = matchVideo(input.message, input.contentItems);

    if (retrieved.length > 0) {
      content = await composeGroundedAnswer(input, retrieved.map((entry) => entry.chunk), who);
      for (const entry of retrieved.slice(0, 3)) {
        if (!sources.some((source) => source.sourceId === entry.chunk.sourceId)) {
          sources.push({ sourceId: entry.chunk.sourceId, title: entry.chunk.title, type: entry.chunk.sourceType });
        }
      }
    } else if (video) {
      content = `That sounds a lot like something ${coachFirst} covers in one of his videos:`;
    } else {
      content = `I don't have specific guidance from ${coachFirst} on that yet. The best next step is usually to let ${coachFirst} take a look at what's going on directly.`;
      const service = recommendService({ services: input.services, profile, topicText: input.message });
      if (service) {
        content += ` His ${service.name} would be a good fit.`;
        cards.push({ kind: "service", serviceId: service.id });
        recommendedServiceId = service.id;
      }
      cards.push({ kind: "contact", label: `Contact ${coachFirst}` });
    }

    if (video && retrieved.length > 0) {
      content += `\n\nThat's very close to what ${coachFirst} covers in this video:`;
    }
    if (video) {
      cards.push({ kind: "video", contentId: video.id, title: video.title, url: video.url, thumbnailUrl: video.thumbnailUrl });
      if (!sources.some((source) => source.sourceId === video.id)) {
        sources.push({ sourceId: video.id, title: video.title, type: "youtube_video" });
      }
    }

    if (retrieved.length > 0 && intentLevel !== "low" && !recommendedServiceId) {
      const service = recommendService({ services: input.services, profile, topicText: input.message, wantsUpload: profile.coachingPreference === "online" });
      if (service) {
        content += `\n\nIf you're still fighting it after trying this, ${coachFirst}'s ${service.name} is a good next step.`;
        cards.push({ kind: "service", serviceId: service.id });
        recommendedServiceId = service.id;
      }
    }

    const followUp = FOLLOW_UPS[profile.focusArea ?? ""];
    if (followUp && retrieved.length > 0 && visitorMessageCount <= 2) {
      content += `\n\n${followUp[0]}`;
    }
    suggestedReplies = buildSwingReplies(profile);
  } else if (kind === "booking") {
    const service = recommendService({ services: input.services, profile, topicText: conversationTopicText(input.conversation, input.message) });
    if (service) {
      content = `Based on what you've told me, ${orgPossessive(input.organizationType, who)} ${service.name} looks like the right fit${service.priceCents || service.priceLabel ? ` (${formatPrice(service)})` : ""}. ${service.description}`;
      cards.push({ kind: "service", serviceId: service.id });
      cards.push({ kind: "booking", serviceId: service.id, label: service.ctaLabel || `Book ${service.name}` });
      recommendedServiceId = service.id;
    } else {
      content = `I can point you in the right direction. The easiest way is to reach out to ${who} directly.`;
      cards.push({ kind: "contact", label: `Contact ${who}` });
    }
    suggestedReplies = isCourseLike(input.organizationType)
      ? ["Do you have lessons?", "Any tee times tomorrow?"]
      : ["What lesson do you recommend for me?", "Do you offer online coaching?"];
  } else {
    const retrieved = retrieveChunks(input.message, includedChunks, 4);
    const faq = matchFaq(input.message, activeFaqs);
    if (faq) {
      const merged = prependAnnouncement(announcement, faq.answer, [
        { sourceId: faq.sourceId ?? faq.id, title: faq.question, type: "faq" },
      ]);
      content = merged.content;
      sources.push(...merged.sources);
      suggestedReplies = input.suggestedQuestions.slice(0, 2);
    } else if (retrieved.length > 0) {
      content = await composeGroundedAnswer(input, retrieved.map((entry) => entry.chunk), who);
      for (const entry of retrieved.slice(0, 3)) {
        if (!sources.some((source) => source.sourceId === entry.chunk.sourceId)) {
          sources.push({ sourceId: entry.chunk.sourceId, title: entry.chunk.title, type: entry.chunk.sourceType });
        }
      }
      const merged = prependAnnouncement(announcement, content, sources);
      content = merged.content;
      sources.splice(0, sources.length, ...merged.sources);
      suggestedReplies = input.suggestedQuestions.slice(0, 2);
    } else if (announcement) {
      content = announcement.message;
      sources.push({ sourceId: announcement.id, title: announcement.title, type: "announcement" });
      suggestedReplies = input.suggestedQuestions.slice(0, 2);
    } else {
      content = isProductAssistant(input.coach)
        ? `I don't see that in ${aboutSubject(input.coach, input.organizationType)} yet. I can help you get in touch, or you can ask me about plans, how it works, or how to get the widget on your site.`
        : isCourseLike(input.organizationType)
          ? `I don't see that in the course information, and I'd rather not guess.`
          : `I don't see that in ${coachFirst}'s coaching information. I can help you get in touch with ${coachFirst} directly, or you can ask me about lessons, his teaching, or what you're working on in your game.`;
      cards.push({ kind: "contact", label: `Contact ${who}` });
      suggestedReplies = input.suggestedQuestions.slice(0, 3);
    }
  }

  const shouldOfferCapture =
    !input.leadCaptured &&
    kind !== "greeting" &&
    kind !== "tee_time_search" &&
    kind !== "membership" &&
    kind !== "tournament" &&
    !cards.some((card) => card.kind === "capture") &&
    (intentLevel === "high" || (intentLevel === "medium" && visitorMessageCount >= 2));
  if (shouldOfferCapture) {
    const video = cards.find((card) => card.kind === "video");
    cards.push({
      kind: "capture",
      prompt: capturePrompt(kind, who, video && video.kind === "video" ? ({ id: video.contentId } as ContentItem) : null, input.organizationType),
      leadType: leadTypeForIntent(kind),
    });
  }

  // LessonLeads' own support widget shares the coaching engine, but its
  // follow-ups must stay product-specific. Client widgets keep their normal
  // golf and lesson prompts.
  if (isProductAssistant(input.coach) && suggestedReplies.length > 0) {
    suggestedReplies = productSuggestedReplies(input, suggestedReplies.length);
  }

  return { content, cards, sources, suggestedReplies, profileUpdates, intentScore, recommendedServiceId, analytics };
}

function conversationTopicText(conversation: Conversation, latest: string): string {
  const recent = conversation.messages
    .filter((message) => message.role === "visitor")
    .slice(-4)
    .map((message) => message.content);
  const profileBits = [
    conversation.profile.primaryIssue,
    describeFocusArea(conversation.profile.focusArea),
    conversation.profile.goals,
  ].filter(Boolean);
  return [...recent, latest, ...profileBits].join(" ");
}

function buildSwingReplies(profile: VisitorProfile): string[] {
  const replies: string[] = [];
  if (profile.focusArea === "driver") replies.push("Starts straight and curves right");
  replies.push("Which lesson is right for me?", "Can I upload my swing?");
  return replies.slice(0, 3);
}

async function composeGroundedAnswer(input: EngineInput, chunks: KnowledgeChunk[], who: string): Promise<string> {
  if (llmAvailable()) {
    const history = input.conversation.messages.slice(-8).map((message: ChatMessage) => ({
      role: message.role === "visitor" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    }));
    const llmAnswer = await generateGroundedAnswer({
      coachName: input.coach.name,
      businessName: input.coach.businessName,
      organizationType: input.organizationType,
      assistantName: input.assistantName,
      question: input.message,
      history,
      contextBlocks: chunks.slice(0, 4).map((chunk) => `${chunk.title}: ${chunk.content.slice(0, 1500)}`),
      styleHint: isCourseLike(input.organizationType)
        ? `This is a golf course assistant. Use course information only. Never invent tee times, current rates, weather, closures, restaurant hours, or membership prices.`
        : `The coach teaches: ${input.coach.philosophy || input.coach.bio || "practical, repeatable golf"}.`,
    });
    if (llmAnswer) return llmAnswer;
  }

  const lines: string[] = [];
  const primary = chunks[0];
  const sentences = pickRelevantSentences(input.message, primary.content, 3);
  if (sentences.length > 0) {
    lines.push(`Based on ${who}'s information: ${sentences.join(" ")}`);
  } else {
    lines.push(`Here's what ${who} says about this: ${primary.content.slice(0, 320)}${primary.content.length > 320 ? "\u2026" : ""}`);
  }
  const secondary = chunks[1];
  if (secondary && secondary.sourceId !== primary.sourceId) {
    const extra = pickRelevantSentences(input.message, secondary.content, 1);
    if (extra.length > 0 && !lines[0].includes(extra[0])) lines.push(extra[0]);
  }
  return lines.join("\n\n");
}

function answerFromKnowledge(
  input: EngineInput,
  _profile: VisitorProfile,
  who: string,
  category?: KnowledgeChunk["category"],
): { content: string; cards: MessageCard[]; sources: AnswerSource[]; found: boolean } {
  const scoped = category ? input.chunks.filter((chunk) => chunk.category === category || !chunk.category) : input.chunks;
  const faq = matchFaq(input.message, input.faqs.filter((item) => item.enabled));
  if (faq) {
    return {
      content: faq.answer,
      cards: [],
      sources: [{ sourceId: faq.sourceId ?? faq.id, title: faq.question, type: "faq" }],
      found: true,
    };
  }
  const retrieved = retrieveChunks(input.message, scoped, 2);
  if (retrieved.length > 0) {
    return {
      content: retrieved[0].chunk.content.slice(0, 500),
      cards: [],
      sources: retrieved.slice(0, 2).map((entry) => ({
        sourceId: entry.chunk.sourceId,
        title: entry.chunk.title,
        type: entry.chunk.sourceType,
      })),
      found: true,
    };
  }
  return { content: "", cards: [], sources: [], found: false };
}

async function answerFactual(
  input: EngineInput,
  profile: VisitorProfile,
  who: string,
): Promise<Pick<EngineResult, "content" | "cards" | "sources" | "suggestedReplies" | "recommendedServiceId">> {
  const text = input.message.toLowerCase();
  const cards: MessageCard[] = [];
  const sources: AnswerSource[] = [];
  let recommendedServiceId: string | undefined;
  const activeFaqs = input.faqs.filter((faq) => faq.enabled);
  const activeServices = input.services.filter((service) => service.active);
  const coachFirst = firstName(input.coach);
  const planQuestion = isPlanQuestion(input.message);
  const howItWorksQuestion = isHowItWorksQuestion(input.message);

  const announcement = matchAnnouncement(input.message, input.announcements);

  // The product's name starts with "Lesson", so a broad FAQ match can mistake
  // "How does LessonLeads work?" for an unrelated contact question.
  const faq = isProductAssistant(input.coach) && howItWorksQuestion ? null : matchFaq(input.message, activeFaqs);
  if (faq) {
    const merged = prependAnnouncement(announcement, faq.answer, [
      { sourceId: faq.sourceId ?? faq.id, title: faq.question, type: "faq" },
    ]);
    return {
      content: merged.content,
      cards,
      sources: merged.sources,
      suggestedReplies: isCourseLike(input.organizationType)
        ? ["Any tee times tomorrow?", "Do you have lessons?"]
        : ["Which lesson is right for me?", "Can I upload my swing?"],
      recommendedServiceId,
    };
  }

  if (planQuestion && activeServices.length > 0 && !isCourseLike(input.organizationType)) {
    const orderedServices = sortServicesByPrice(activeServices);
    const summary = orderedServices
      .slice(0, 6)
      .map((service) => `${service.name} — ${formatPrice(service)}\n${service.description}`)
      .join("\n\n");
    const pricingChunk = input.chunks.find((chunk) => /\bplans?\b|\bpricing\b/i.test(`${chunk.title} ${chunk.content}`));
    if (pricingChunk) {
      sources.push({ sourceId: pricingChunk.sourceId, title: pricingChunk.title, type: pricingChunk.sourceType });
    }
    return {
      content: isProductAssistant(input.coach)
        ? `Here's what's included on each LessonLeads plan:\n\n${summary}`
        : `Here's what ${coachFirst}'s options include:\n\n${summary}`,
      cards,
      sources,
      suggestedReplies: isProductAssistant(input.coach)
        ? ["How do I get started?", "Will it work with Calendly or CoachNow?"]
        : ["Which lesson is right for me?", "Do you offer online coaching?"],
      recommendedServiceId,
    };
  }

  if (isCourseLike(input.organizationType) && VOLATILE_QUESTION.test(text)) {
    const volatile = retrieveChunks(
      input.message,
      input.chunks.filter((chunk) => chunk.volatility === "frequently_changing" || chunk.category === "rates" || chunk.sourceType === "manual" || chunk.sourceType === "faq"),
      2,
    );
    if (volatile.length === 0) {
      cards.push({ kind: "contact", label: `Contact ${who}` });
      const merged = prependAnnouncement(
        announcement,
        `I don't have a current figure for that in approved course information, and I won't guess. I can help you get in touch.`,
        sources,
      );
      return {
        content: merged.content,
        cards,
        sources: merged.sources,
        suggestedReplies: [],
        recommendedServiceId,
      };
    }
    sources.push({ sourceId: volatile[0].chunk.sourceId, title: volatile[0].chunk.title, type: volatile[0].chunk.sourceType });
    const merged = prependAnnouncement(announcement, volatile[0].chunk.content.slice(0, 500), sources);
    return {
      content: merged.content,
      cards,
      sources: merged.sources,
      suggestedReplies: input.suggestedQuestions.slice(0, 2),
      recommendedServiceId,
    };
  }

  if (/\bhow much|price[sd]?|pricing|cost[s]?|rates?\b/.test(text) && activeServices.length > 0 && !isCourseLike(input.organizationType)) {
    const priced = activeServices.filter((service) => service.priceCents !== null || service.priceLabel);
    const summary = sortServicesByPrice(priced.length > 0 ? priced : activeServices)
      .slice(0, 4)
      .map((service) => `${service.name} — ${formatPrice(service)}`)
      .join("\n");
    const best = recommendService({ services: activeServices, profile, topicText: conversationTopicText(input.conversation, input.message) });
    if (best) {
      cards.push({ kind: "service", serviceId: best.id });
      recommendedServiceId = best.id;
    }
    return {
      content: isProductAssistant(input.coach)
        ? `Here's what ${input.coach.name} costs:\n\n${summary}${best ? `\n\nMost independent coaches start on ${best.name}.` : ""}`
        : `Here's ${coachFirst}'s current lineup:\n\n${summary}${best ? `\n\nBased on what you've told me, the ${best.name} is probably the best place to start.` : ""}`,
      cards,
      sources,
      suggestedReplies: isProductAssistant(input.coach)
        ? ["How do I get started?", "Will it work with Calendly?"]
        : ["Which lesson is right for me?", "Do you offer online coaching?"],
      recommendedServiceId,
    };
  }

  if (/\b(where|location|address|directions|based)\b/.test(text) && input.coach.location) {
    const inPerson = activeServices.filter((service) => service.mode !== "online");
    const locationDetail = inPerson.find((service) => service.location)?.location || input.locations[0]?.address;
    return {
      content: isProductAssistant(input.coach)
        ? `${input.coach.name} is a web product. You add the widget to your golf site from anywhere.`
        : `${who} is in ${input.coach.location}${locationDetail ? ` (${locationDetail})` : ""}.${
            !isCourseLike(input.organizationType) && activeServices.some((service) => service.mode !== "in_person")
              ? ` He also works with golfers remotely through online coaching.`
              : ""
          }`,
      cards,
      sources,
      suggestedReplies: isCourseLike(input.organizationType) ? ["Any tee times tomorrow?", "Do you have a restaurant?"] : ["Do you offer online coaching?", "Which lesson is right for me?"],
      recommendedServiceId,
    };
  }

  if (/\bonline|remote|virtual\b/.test(text) && !isCourseLike(input.organizationType)) {
    const online = activeServices.filter((service) => service.mode === "online" || service.mode === "both");
    if (online.length > 0) {
      const service = online[0];
      cards.push({ kind: "service", serviceId: service.id });
      recommendedServiceId = service.id;
      return {
        content: `Yes — ${coachFirst} works with golfers online. ${service.name}${service.priceCents || service.priceLabel ? ` (${formatPrice(service)})` : ""}: ${service.description}`,
        cards,
        sources,
        suggestedReplies: ["Can I upload my swing?", "How do I book?"],
        recommendedServiceId,
      };
    }
  }

  if (howItWorksQuestion && isProductAssistant(input.coach)) {
    const howItWorksChunks = input.chunks.filter(
      (chunk) => /\bhow\b[\s\S]*\bwork/i.test(chunk.title) || /\bsetup takes\b/i.test(chunk.content),
    );
    const retrieved = retrieveChunks(input.message, howItWorksChunks.length > 0 ? howItWorksChunks : input.chunks, 3);
    if (retrieved.length > 0) {
      const content = await composeGroundedAnswer(input, retrieved.map((entry) => entry.chunk), who);
      for (const entry of retrieved) {
        if (!sources.some((source) => source.sourceId === entry.chunk.sourceId)) {
          sources.push({ sourceId: entry.chunk.sourceId, title: entry.chunk.title, type: entry.chunk.sourceType });
        }
      }
      return {
        content,
        cards,
        sources,
        suggestedReplies: ["What's included on each plan?", "Will it work with Calendly or CoachNow?"],
        recommendedServiceId,
      };
    }
  }

  const trusted = retrieveChunks(input.message, input.chunks.filter((chunk) => chunk.sourceType === "manual" || chunk.sourceType === "faq"), 2);
  if (trusted.length > 0) {
    for (const entry of trusted) {
      sources.push({ sourceId: entry.chunk.sourceId, title: entry.chunk.title, type: entry.chunk.sourceType });
    }
    const merged = prependAnnouncement(announcement, trusted[0].chunk.content.slice(0, 500), sources);
    return {
      content: merged.content,
      cards,
      sources: merged.sources,
      suggestedReplies: input.suggestedQuestions.slice(0, 2),
      recommendedServiceId,
    };
  }

  if (announcement) {
    return {
      content: announcement.message,
      cards,
      sources: [{ sourceId: announcement.id, title: announcement.title, type: "announcement" }],
      suggestedReplies: input.suggestedQuestions.slice(0, 2),
      recommendedServiceId,
    };
  }

  cards.push({ kind: "contact", label: `Contact ${who}` });
  return {
    content: isProductAssistant(input.coach)
      ? `I don't see that in ${input.coach.name} yet, and I'd rather not guess. Ask me about plans, how it works, or how to install the widget.`
      : `I don't see that information in ${who}'s approved resources, and I'd rather not guess. I can help you get in touch.`,
    cards,
    sources,
    suggestedReplies: input.suggestedQuestions.slice(0, 2),
    recommendedServiceId,
  };
}
