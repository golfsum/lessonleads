"use client";

import { Play, RotateCcw, Send, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DemoCard {
  kind: "video" | "service";
  title: string;
  meta: string;
  cta: string;
}

interface DemoMessage {
  role: "assistant" | "visitor";
  text: string;
  card?: DemoCard;
}

interface DemoNode {
  reply: DemoMessage[];
  suggestions: Array<{ label: string; next: string }>;
}

/**
 * Scripted preview of the widget conversation. Canned on purpose:
 * the marketing site should never call the real AI or save anything.
 */
const script: Record<string, DemoNode> = {
  start: {
    reply: [
      {
        role: "assistant",
        text: "Hey, I'm Coach Mike's assistant. Tell me what you're struggling with and I'll point you in the right direction.",
      },
    ],
    suggestions: [
      { label: "Why do I keep slicing my driver?", next: "slice" },
      { label: "Which lesson is right for me?", next: "lesson" },
      { label: "Can I send Mike my swing?", next: "swing" },
    ],
  },
  slice: {
    reply: [
      {
        role: "assistant",
        text: "Based on Mike's teaching, the first thing to check is whether your clubface is open to your swing path at impact. Do your drives usually start straight and then curve right, or start right and stay right?",
      },
    ],
    suggestions: [
      { label: "Start straight, curve right", next: "slice_drill" },
      { label: "Start right and stay right", next: "slice_drill" },
    ],
  },
  slice_drill: {
    reply: [
      {
        role: "assistant",
        text: "That's the classic face-to-path slice Mike sees most often. He covers the exact fix in one of his drills:",
        card: { kind: "video", title: "Fix Your Driver Slice in 5 Minutes", meta: "From Mike's YouTube channel", cta: "Watch video" },
      },
      {
        role: "assistant",
        text: "If it's still hanging around after you try this, Mike can look at your actual swing.",
        card: { kind: "service", title: "Online Swing Analysis", meta: "$79 · Upload your swing, get personal feedback", cta: "View details" },
      },
    ],
    suggestions: [
      { label: "How do lessons work?", next: "lesson" },
      { label: "Start over", next: "start" },
    ],
  },
  lesson: {
    reply: [
      {
        role: "assistant",
        text: "Happy to help you pick. If you want a full picture of your game, most golfers start with Mike's swing assessment — it sets the plan for everything after.",
        card: { kind: "service", title: "60-Minute Swing Assessment", meta: "$125 · In person, Tucson AZ", cta: "Book with Mike" },
      },
      {
        role: "assistant",
        text: "Not local? The online swing analysis works from anywhere. Want me to save these recommendations and send them to you?",
      },
    ],
    suggestions: [
      { label: "Yes, email them to me", next: "capture" },
      { label: "Start over", next: "start" },
    ],
  },
  swing: {
    reply: [
      {
        role: "assistant",
        text: "Yes — you can upload a video right here and Mike will see it with our whole conversation, so you never have to repeat yourself.",
        card: { kind: "service", title: "Upload your swing", meta: "Phone video is perfect · takes about a minute", cta: "Upload swing" },
      },
    ],
    suggestions: [
      { label: "What does Mike look for?", next: "slice" },
      { label: "Start over", next: "start" },
    ],
  },
  capture: {
    reply: [
      {
        role: "assistant",
        text: "This is the moment a visitor becomes a lead: they leave a name and email, and the coach gets the full conversation, the golfer's goals, and the recommended lesson in their dashboard.",
      },
    ],
    suggestions: [{ label: "Start over", next: "start" }],
  },
};

export function HomeDemo() {
  const [messages, setMessages] = useState<DemoMessage[]>(script.start.reply);
  const [suggestions, setSuggestions] = useState(script.start.suggestions);
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function choose(label: string, next: string) {
    const node = script[next];
    if (!node) return;
    if (next === "start") {
      setMessages(script.start.reply);
      setSuggestions(script.start.suggestions);
      return;
    }
    setMessages((previous) => [...previous, { role: "visitor", text: label }]);
    setSuggestions([]);
    setTyping(true);
    node.reply.forEach((reply, index) => {
      timers.current.push(
        window.setTimeout(() => {
          setMessages((previous) => [...previous, reply]);
          if (index === node.reply.length - 1) {
            setTyping(false);
            setSuggestions(node.suggestions);
          }
        }, 700 + index * 900),
      );
    });
  }

  return (
    <section aria-label="Interactive widget preview" className="chat-demo">
      <header className="chat-demo-head">
        <span className="chat-demo-avatar">M</span>
        <div>
          <strong>Ask Mike</strong>
          <small>Coach Mike Golf · example widget</small>
        </div>
        <span className="demo-label">Preview</span>
      </header>
      <div className="chat-demo-body" ref={bodyRef}>
        {messages.map((message, index) => (
          <div className={`chat-demo-message ${message.role}`} key={`${index}-${message.text.slice(0, 12)}`}>
            <p>{message.text}</p>
            {message.card ? (
              <div className="chat-demo-card">
                <span className={`chat-demo-card-icon ${message.card.kind}`}>
                  {message.card.kind === "video" ? <Play fill="currentColor" size={14} /> : <Video size={15} />}
                </span>
                <span>
                  <strong>{message.card.title}</strong>
                  <small>{message.card.meta}</small>
                </span>
                <em>{message.card.cta}</em>
              </div>
            ) : null}
          </div>
        ))}
        {typing ? (
          <div className="chat-demo-message assistant typing" aria-label="Assistant is typing">
            <p><i /><i /><i /></p>
          </div>
        ) : null}
      </div>
      <div className="chat-demo-suggestions">
        {suggestions.map((suggestion) =>
          suggestion.next === "start" && messages.length > 1 ? (
            <button className="chat-demo-restart" key={suggestion.label} onClick={() => choose(suggestion.label, suggestion.next)} type="button">
              <RotateCcw size={13} /> {suggestion.label}
            </button>
          ) : (
            <button key={suggestion.label} onClick={() => choose(suggestion.label, suggestion.next)} type="button">
              {suggestion.label}
            </button>
          ),
        )}
      </div>
      <footer className="chat-demo-foot">
        <span>Ask about your game…</span>
        <Send size={15} />
      </footer>
    </section>
  );
}
