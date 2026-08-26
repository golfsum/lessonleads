import "server-only";

import type {
  AnswerSource,
  ChatMessage,
  ContentItem,
  Conversation,
  FaqItem,
  KnowledgeChunk,
  MessageCard,
  PublicCoach,
  Service,
  VisitorProfile,
} from "@/lib/domain/types";
import { intentLevelForScore } from "@/lib/domain/types";
import { retrieveChunks, scoreText, tokenize } from "@/lib/knowledge/retrieval";
import { accumulateIntent } from "./intent";
import { describeFocusArea, extractProfileUpdates } from "./profile";
import { generateGroundedAnswer, llmAvailable } from "./llm";
import { formatPrice } from "@/lib/domain/format";

export interface EngineInput {
  message: string;
  conversation: Conversation;
  leadCaptured: boolean;
  coach: PublicCoach;
  assistantName: string;
  services: Service[];
  contentItems: ContentItem[];
  faqs: FaqItem[];
  chunks: KnowledgeChunk[];
  suggestedQuestions: string[];
}

export interface EngineResult {
  content: string;
  cards: MessageCard[];
  sources: AnswerSource[];
  suggestedReplies: string[];
  profileUpdates: Partial<VisitorProfile>;
  intentScore: number;
  recommendedServiceId?: string;
}

type MessageKind = "greeting" | "factual_business" | "booking" | "swing_upload" | "swing_help" | "other";

function firstName(coach: PublicCoach): string {
  return coach.name.split(" ")[0] || coach.name;
}

function isProductAssistant(coach: PublicCoach) {
  return coach.name.trim().toLowerCase() === coach.businessName.trim().toLowerCase();
}

function aboutSubject(coach: PublicCoach): string {
  if (isProductAssistant(coach)) return coach.name;
  return `${firstName(coach)}'s coaching`;
}

function classifyMessage(message: string): MessageKind {
  const text = message.toLowerCase().trim();
  if (/^(hi|hello|hey|yo|howdy|good (morning|afternoon|evening))\b[.! ]*$/.test(text)) return "greeting";
  if (/\b(upload|send|share)\b.*\b(swing|video)\b|\bswing (review|analysis|upload)\b/.test(text) && !/\bhow much|price|cost\b/.test(text)) {
    return "swing_upload";
  }
  if (
    /\bhow much|price[sd]?|pricing|cost[s]?|rates?\b/.test(text) ||
    /\b(where|location|address|directions)\b.*\b(teach|located|based|you|lesson)|where (are you|do you)/.test(text) ||
    /\b(cancel+ation|refund|reschedul|policy|policies)\b/.test(text) ||
    /\bdo (you|they)\b.*\b(offer|teach|do|have|take)\b/.test(text) ||
    /\b(available|availability|openings?|hours)\b/.test(text) ||
    /\b(junior|kids?|children)\b.*\b(lesson|teach|coach)|teach (junior|kid)/.test(text) ||
    /\bonline (lesson|coaching)s?\b.*\?/.test(text)
  ) {
    return "factual_business";
  }
  if (/\b(book|booking|schedule|sign ?up|get started|work with|lesson with)\b/.test(text)) return "booking";
  if (
    /\b(slice|hook|shank|putt|chip|pitch|bunker|driver|iron|wedge|swing|contact|top|thin|fat|chunk|distance|draw|fade|grip|stance|backswing|downswing|tempo|yips|three.?putt|3.?putt|break \d+|handicap|consisten)\w*\b/.test(text)
  ) {
    return "swing_help";
  }
  return "other";
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
    // Prefer earlier sentences slightly; coach content usually leads with the point.
    return { sentence, score: score + Math.max(0, 1.5 - index * 0.1) };
  });
  const top = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences);
  // Restore original order for readability.
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

function capturePrompt(kind: MessageKind, coachFirst: string, video: ContentItem | null): string {
  if (video) return `Want me to send you a link to this drill so you don't lose it? ${coachFirst} can also follow up with you directly.`;
  if (kind === "booking" || kind === "swing_upload") return `Want me to save your details so ${coachFirst} can follow up if anything comes up with your booking?`;
  return `Want me to save these recommendations and let ${coachFirst} know what you're working on?`;
}

const FOLLOW_UPS: Record<string, string[]> = {
  driver: ["Do your shots usually start left and curve right, start straight and curve right, or start right and stay right?"],
  putting: ["Are you missing more on speed (leaving them short or long) or on line?"],
  short_game: ["Is the trouble mostly on tight lies, in the rough, or out of bunkers?"],
  irons: ["Is the miss usually fat (hitting the ground first) or thin (catching it low on the face)?"],
  course_management: ["What does a typical blow-up hole look like for you?"],
};

export async function respond(input: EngineInput): Promise<EngineResult> {
  const coachFirst = firstName(input.coach);
  const profileUpdates = extractProfileUpdates(input.message);
  const profile: VisitorProfile = { ...input.conversation.profile, ...profileUpdates };
  const { score: intentScore } = accumulateIntent(input.conversation.intentScore, input.message);
  const intentLevel = intentLevelForScore(intentScore);
  const kind = classifyMessage(input.message);
  const visitorMessageCount = input.conversation.messages.filter((message) => message.role === "visitor").length + 1;

  const cards: MessageCard[] = [];
  const sources: AnswerSource[] = [];
  let suggestedReplies: string[] = [];
  let recommendedServiceId: string | undefined;
  let content = "";

  const includedChunks = input.chunks;
  const activeFaqs = input.faqs.filter((faq) => faq.enabled);

  if (kind === "greeting") {
    content = `Hey! I'm ${input.assistantName}. Tell me what you're struggling with, or ask me anything about ${aboutSubject(input.coach)}.`;
    suggestedReplies = input.suggestedQuestions.slice(0, 3);
  } else if (kind === "factual_business") {
    const result = answerFactual(input, profile, coachFirst);
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
  } else if (kind === "swing_help") {
    const retrieved = retrieveChunks(input.message, includedChunks, 4);
    const video = matchVideo(input.message, input.contentItems);

    if (retrieved.length > 0) {
      const grounded = await composeGroundedAnswer(input, retrieved.map((entry) => entry.chunk), coachFirst);
      content = grounded;
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

    // Natural service handoff once intent is warm.
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
      content = `Based on what you've told me, ${coachFirst}'s ${service.name} looks like the right fit${service.priceCents || service.priceLabel ? ` (${formatPrice(service)})` : ""}. ${service.description}`;
      cards.push({ kind: "service", serviceId: service.id });
      cards.push({ kind: "booking", serviceId: service.id, label: service.ctaLabel || `Book ${service.name}` });
      recommendedServiceId = service.id;
    } else {
      content = `I can point you in the right direction. The easiest way is to reach out to ${coachFirst} directly.`;
      cards.push({ kind: "contact", label: `Contact ${coachFirst}` });
    }
    suggestedReplies = ["What lesson do you recommend for me?", "Do you offer online coaching?"];
  } else {
    const retrieved = retrieveChunks(input.message, includedChunks, 4);
    const faq = matchFaq(input.message, activeFaqs);
    if (faq) {
      content = faq.answer;
      sources.push({ sourceId: faq.sourceId ?? faq.id, title: faq.question, type: "faq" });
      suggestedReplies = ["Which lesson is right for me?", "Can I upload my swing?"];
    } else if (retrieved.length > 0) {
      content = await composeGroundedAnswer(input, retrieved.map((entry) => entry.chunk), coachFirst);
      for (const entry of retrieved.slice(0, 3)) {
        if (!sources.some((source) => source.sourceId === entry.chunk.sourceId)) {
          sources.push({ sourceId: entry.chunk.sourceId, title: entry.chunk.title, type: entry.chunk.sourceType });
        }
      }
      suggestedReplies = input.suggestedQuestions.slice(0, 2);
    } else {
      content = isProductAssistant(input.coach)
        ? `I don't see that in ${aboutSubject(input.coach)} yet. I can help you get in touch, or you can ask me about plans, how it works, or how to get the widget on your site.`
        : `I don't see that in ${coachFirst}'s coaching information. I can help you get in touch with ${coachFirst} directly, or you can ask me about lessons, his teaching, or what you're working on in your game.`;
      cards.push({ kind: "contact", label: `Contact ${coachFirst}` });
      suggestedReplies = input.suggestedQuestions.slice(0, 3);
    }
  }

  // Offer lead capture at a useful moment: never on greeting, only once
  // value has been given, and only while the visitor is still anonymous.
  const shouldOfferCapture =
    !input.leadCaptured &&
    kind !== "greeting" &&
    !cards.some((card) => card.kind === "capture") &&
    (intentLevel === "high" || (intentLevel === "medium" && visitorMessageCount >= 2));
  if (shouldOfferCapture) {
    const video = cards.find((card) => card.kind === "video");
    cards.push({
      kind: "capture",
      prompt: capturePrompt(kind, coachFirst, video && video.kind === "video" ? ({ id: video.contentId } as ContentItem) : null),
    });
  }

  return { content, cards, sources, suggestedReplies, profileUpdates, intentScore, recommendedServiceId };
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

async function composeGroundedAnswer(input: EngineInput, chunks: KnowledgeChunk[], coachFirst: string): Promise<string> {
  if (llmAvailable()) {
    const history = input.conversation.messages.slice(-8).map((message: ChatMessage) => ({
      role: message.role === "visitor" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    }));
    const llmAnswer = await generateGroundedAnswer({
      coachName: input.coach.name,
      assistantName: input.assistantName,
      question: input.message,
      history,
      contextBlocks: chunks.slice(0, 4).map((chunk) => `${chunk.title}: ${chunk.content.slice(0, 1500)}`),
      styleHint: `The coach teaches: ${input.coach.philosophy || input.coach.bio || "practical, repeatable golf"}.`,
    });
    if (llmAnswer) return llmAnswer;
  }

  // Extractive fallback: quote the coach's own material, clearly attributed.
  const lines: string[] = [];
  const primary = chunks[0];
  const sentences = pickRelevantSentences(input.message, primary.content, 3);
  if (sentences.length > 0) {
    lines.push(`Based on ${coachFirst}'s teaching: ${sentences.join(" ")}`);
  } else {
    lines.push(`Here's what ${coachFirst} says about this: ${primary.content.slice(0, 320)}${primary.content.length > 320 ? "\u2026" : ""}`);
  }
  const secondary = chunks[1];
  if (secondary && secondary.sourceId !== primary.sourceId) {
    const extra = pickRelevantSentences(input.message, secondary.content, 1);
    if (extra.length > 0 && !lines[0].includes(extra[0])) lines.push(extra[0]);
  }
  return lines.join("\n\n");
}

function answerFactual(
  input: EngineInput,
  profile: VisitorProfile,
  coachFirst: string,
): Pick<EngineResult, "content" | "cards" | "sources" | "suggestedReplies" | "recommendedServiceId"> {
  const text = input.message.toLowerCase();
  const cards: MessageCard[] = [];
  const sources: AnswerSource[] = [];
  let recommendedServiceId: string | undefined;
  const activeFaqs = input.faqs.filter((faq) => faq.enabled);
  const activeServices = input.services.filter((service) => service.active);

  // FAQs and manual knowledge are the most trusted answers for business questions.
  const faq = matchFaq(input.message, activeFaqs);
  if (faq) {
    sources.push({ sourceId: faq.sourceId ?? faq.id, title: faq.question, type: "faq" });
    return {
      content: faq.answer,
      cards,
      sources,
      suggestedReplies: ["Which lesson is right for me?", "Can I upload my swing?"],
      recommendedServiceId,
    };
  }

  // Pricing comes straight from the coach's service list, never invented.
  if (/\bhow much|price[sd]?|pricing|cost[s]?|rates?\b/.test(text)) {
    if (activeServices.length > 0) {
      const priced = activeServices.filter((service) => service.priceCents !== null || service.priceLabel);
      const summary = (priced.length > 0 ? priced : activeServices)
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
    cards.push({ kind: "contact", label: `Contact ${coachFirst}` });
    return {
      content: `I don't have pricing in ${coachFirst}'s coaching information yet. I can help you get in touch to ask directly.`,
      cards,
      sources,
      suggestedReplies: [],
      recommendedServiceId,
    };
  }

  // Location questions answer from the coach profile, an approved source.
  if (/\b(where|location|address|directions|based)\b/.test(text) && input.coach.location) {
    const inPerson = activeServices.filter((service) => service.mode !== "online");
    const locationDetail = inPerson.find((service) => service.location)?.location;
    return {
      content: isProductAssistant(input.coach)
        ? `${input.coach.name} is a web product. You add the widget to your golf site from anywhere.`
        : `${coachFirst} teaches in ${input.coach.location}${locationDetail ? ` (${locationDetail})` : ""}.${
            activeServices.some((service) => service.mode !== "in_person") ? ` He also works with golfers remotely through online coaching.` : ""
          }`,
      cards,
      sources,
      suggestedReplies: ["Do you offer online coaching?", "Which lesson is right for me?"],
      recommendedServiceId,
    };
  }

  // Online coaching questions can be answered from the service list.
  if (/\bonline|remote|virtual\b/.test(text)) {
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

  // High-trust knowledge (manual notes / FAQ chunks) may still hold the answer.
  const trusted = retrieveChunks(input.message, input.chunks.filter((chunk) => chunk.sourceType === "manual" || chunk.sourceType === "faq"), 2);
  if (trusted.length > 0) {
    for (const entry of trusted) {
      sources.push({ sourceId: entry.chunk.sourceId, title: entry.chunk.title, type: entry.chunk.sourceType });
    }
    return {
      content: trusted[0].chunk.content.slice(0, 500),
      cards,
      sources,
      suggestedReplies: ["Which lesson is right for me?"],
      recommendedServiceId,
    };
  }

  cards.push({ kind: "contact", label: `Contact ${coachFirst}` });
  return {
    content: isProductAssistant(input.coach)
      ? `I don't see that in ${input.coach.name} yet, and I'd rather not guess. Ask me about plans, how it works, or how to install the widget.`
      : `I don't see that information in ${coachFirst}'s coaching resources, and I'd rather not guess. I can help you contact ${coachFirst} directly.`,
    cards,
    sources,
    suggestedReplies: input.suggestedQuestions.slice(0, 2),
    recommendedServiceId,
  };
}
