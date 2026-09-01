import "server-only";

/**
 * Optional LLM upgrade. When OPENAI_API_KEY is set, chat responses are
 * phrased by the model (still grounded in retrieved coach content, which is
 * assembled and gated deterministically before this call). Without a key,
 * the engine falls back to extractive composition and everything still works.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export function llmAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export interface LlmChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function generateGroundedAnswer(input: {
  coachName: string;
  businessName?: string;
  organizationType?: string;
  assistantName: string;
  question: string;
  history: LlmChatTurn[];
  contextBlocks: string[];
  styleHint: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const subject = input.businessName || input.coachName;
  const courseLike = input.organizationType === "golf_course" || input.organizationType === "golf_facility";
  const system = [
    `You are "${input.assistantName}", the website assistant for ${subject}.`,
    courseLike
      ? `Answer ONLY from the course's approved material provided below. You understand golf-course questions: green fees, carts, walking, rentals, range hours, dress code, memberships, lessons, and outings.`
      : `Answer ONLY from this golf business's own material provided below. Reflect what THIS coach or academy teaches, not generic golf advice.`,
    `Never invent tee-time availability, current rates, weather, course closures, aeration dates, tournament availability, restaurant hours, or membership prices unless those values are in the material.`,
    `Never invent prices, availability, locations, policies, or claims. If the material does not contain the answer, say you don't have that information and offer to help the visitor get in touch.`,
    `Keep answers concise (2-5 short sentences), friendly, and conversational. ${input.styleHint}`,
    ``,
    `Approved material:`,
    ...input.contextBlocks.map((block, index) => `[${index + 1}] ${block}`),
  ].join("\n");

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 350,
        messages: [
          { role: "system", content: system },
          ...input.history.slice(-8),
          { role: "user", content: input.question },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch {
    return null;
  }
}
