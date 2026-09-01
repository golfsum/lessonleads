import type { KnowledgeCategory } from "@/lib/domain/types";

const RULES: Array<{ category: KnowledgeCategory; pattern: RegExp; volatility: "static" | "frequently_changing" }> = [
  { category: "rates", pattern: /\/(rates?|green-?fees?|pricing|fees|twilight)/i, volatility: "frequently_changing" },
  { category: "membership", pattern: /\/(membership|join|become-a-member|member)/i, volatility: "frequently_changing" },
  { category: "instruction", pattern: /\/(lesson|instruction|academy|golf-school|coaching|teaching|junior)/i, volatility: "static" },
  { category: "events", pattern: /\/(event|outing|tournament|wedding|banquet|corporate)/i, volatility: "frequently_changing" },
  { category: "dining", pattern: /\/(restaurant|grill|dining|menu|bar|food|beverage)/i, volatility: "frequently_changing" },
  { category: "practice", pattern: /\/(practice|range|putting-green|short-game|simulator)/i, volatility: "frequently_changing" },
  { category: "policies", pattern: /\/(policy|policies|dress-code|etiquette|cart|walking|rules)/i, volatility: "static" },
  { category: "course", pattern: /\/(course|about|layout|scorecard|holes|history)/i, volatility: "static" },
  { category: "general", pattern: /\/(tee-?times?|book|reserv)/i, volatility: "frequently_changing" },
  { category: "general", pattern: /\/(faq|contact|hours|directions|pro-?shop)/i, volatility: "frequently_changing" },
];

const TITLE_RULES: Array<{ category: KnowledgeCategory; pattern: RegExp; volatility: "static" | "frequently_changing" }> = [
  { category: "rates", pattern: /\b(green fee|rate|twilight|pricing|how much)\b/i, volatility: "frequently_changing" },
  { category: "membership", pattern: /\bmembership\b/i, volatility: "frequently_changing" },
  { category: "instruction", pattern: /\b(lesson|instruction|coach|academy|junior program)\b/i, volatility: "static" },
  { category: "events", pattern: /\b(tournament|outing|event|wedding)\b/i, volatility: "frequently_changing" },
  { category: "dining", pattern: /\b(restaurant|grill|menu|dining)\b/i, volatility: "frequently_changing" },
  { category: "practice", pattern: /\b(driving range|practice|simulator)\b/i, volatility: "frequently_changing" },
  { category: "policies", pattern: /\b(dress code|cart policy|walking|etiquette)\b/i, volatility: "static" },
  { category: "course", pattern: /\b(about (the )?course|scorecard|yardage|course layout)\b/i, volatility: "static" },
];

export interface PageCategory {
  category: KnowledgeCategory;
  volatility: "static" | "frequently_changing";
}

export function categorizeKnowledgePage(input: { url?: string; title?: string; text?: string }): PageCategory {
  const haystack = `${input.url ?? ""} ${input.title ?? ""}`;
  for (const rule of RULES) {
    if (input.url && rule.pattern.test(input.url)) return { category: rule.category, volatility: rule.volatility };
  }
  for (const rule of TITLE_RULES) {
    if (rule.pattern.test(haystack) || (input.text && rule.pattern.test(input.text.slice(0, 400)))) {
      return { category: rule.category, volatility: rule.volatility };
    }
  }
  return { category: "general", volatility: "static" };
}

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  rates: "Rates",
  policies: "Policies",
  course: "Course",
  membership: "Membership",
  instruction: "Instruction",
  dining: "Dining",
  events: "Events",
  practice: "Practice",
  general: "General",
};
