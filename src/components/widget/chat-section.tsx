"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageCard, Service } from "@/lib/domain/types";
import type { WidgetController } from "./golf-widget";
import { CheckIcon, MailIcon, PlayIcon, SendIcon, UploadIcon } from "./icons";
import { LeadCaptureForm } from "./lead-capture-form";
import { formatPrice } from "@/lib/domain/format";

interface UiMessage {
  id: string;
  role: "visitor" | "assistant";
  content: string;
  cards?: MessageCard[];
  suggestedReplies?: string[];
  error?: boolean;
}

let messageCounter = 0;
function nextId() {
  messageCounter += 1;
  return `local-${messageCounter}`;
}

export function ChatSection({ controller }: { controller: WidgetController }) {
  const { data, session, context } = controller;
  const theme = data.widget.theme;
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [restored, setRestored] = useState(false);
  const [captureDone, setCaptureDone] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationStartedRef = useRef(false);

  // Restore an existing conversation, otherwise show the welcome message.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (session.conversationId) {
        try {
          const response = await fetch(
            `/api/public/chat?coachId=${encodeURIComponent(data.widget.publicId)}&conversationId=${encodeURIComponent(session.conversationId)}&visitorId=${encodeURIComponent(session.visitorId)}`,
          );
          if (response.ok) {
            const payload = (await response.json()) as { messages?: UiMessage[] };
            if (!cancelled && payload.messages && payload.messages.length > 0) {
              conversationStartedRef.current = true;
              setMessages(payload.messages);
              setRestored(true);
              return;
            }
          }
        } catch {
          // Fall through to a fresh welcome.
        }
      }
      if (!cancelled) {
        setMessages([
          { id: nextId(), role: "assistant", content: theme.welcomeMessage, suggestedReplies: theme.suggestedQuestions.slice(0, 4) },
        ]);
        setRestored(true);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || typing) return;
      setInput("");
      setMessages((previous) => [...previous, { id: nextId(), role: "visitor", content: trimmed }]);
      setTyping(true);
      try {
        const response = await fetch("/api/public/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            coachId: data.widget.publicId,
            conversationId: session.conversationId ?? undefined,
            visitorId: session.visitorId,
            sessionId: session.sessionId,
            message: trimmed,
            page: context.page,
            referrer: context.referrer,
            utm: context.utm,
            device: context.device,
            preview: controller.preview || undefined,
          }),
        });
        const payload = (await response.json()) as {
          conversationId?: string;
          message?: { id: string; content: string; cards?: MessageCard[]; suggestedReplies?: string[] };
          error?: string;
        };
        if (!response.ok || !payload.message) {
          setMessages((previous) => [
            ...previous,
            { id: nextId(), role: "assistant", content: payload.error ?? "Something went wrong. Try again in a moment.", error: true },
          ]);
          return;
        }
        if (payload.conversationId) {
          session.conversationId = payload.conversationId;
          controller.onConversationId(payload.conversationId);
          conversationStartedRef.current = true;
        }
        setMessages((previous) => [
          ...previous,
          {
            id: payload.message!.id,
            role: "assistant",
            content: payload.message!.content,
            cards: payload.message!.cards,
            suggestedReplies: payload.message!.suggestedReplies,
          },
        ]);
      } catch {
        setMessages((previous) => [
          ...previous,
          { id: nextId(), role: "assistant", content: "I couldn't reach the server. Check your connection and try again.", error: true },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [context, controller, data.widget.publicId, session, typing],
  );

  const serviceById = (id: string): Service | undefined => data.services.find((service) => service.id === id);
  const lastMessage = messages[messages.length - 1];

  return (
    <div className="gw-chat">
      <div className="gw-messages" ref={scrollRef}>
        {messages.map((message) => (
          <div key={message.id} className={`gw-message ${message.role}`}>
            <div className={`gw-bubble ${message.error ? "error" : ""}`}>
              {message.content.split("\n\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            {message.cards?.map((card, index) => (
              <MessageCardView
                key={`${message.id}-card-${index}`}
                card={card}
                controller={controller}
                serviceById={serviceById}
                captured={controller.leadCaptured || captureDone[message.id]}
                onCaptured={() => setCaptureDone((previous) => ({ ...previous, [message.id]: true }))}
              />
            ))}
          </div>
        ))}
        {typing ? (
          <div className="gw-message assistant">
            <div className="gw-bubble gw-typing" aria-label="Assistant is typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : null}
        {!typing && restored && lastMessage?.role === "assistant" && lastMessage.suggestedReplies && lastMessage.suggestedReplies.length > 0 ? (
          <div className="gw-suggestions">
            {lastMessage.suggestedReplies.map((reply) => (
              <button key={reply} type="button" onClick={() => void send(reply)}>
                {reply}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <form
        className="gw-input-row"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <input
          type="text"
          value={input}
          placeholder={`Ask about your game or ${data.coach.name.split(" ")[0]}'s coaching\u2026`}
          onChange={(event) => setInput(event.target.value)}
          maxLength={2000}
          aria-label="Your message"
        />
        <button type="submit" className="gw-send" disabled={!input.trim() || typing} aria-label="Send message">
          <SendIcon size={17} />
        </button>
      </form>
    </div>
  );
}

function MessageCardView({
  card,
  controller,
  serviceById,
  captured,
  onCaptured,
}: {
  card: MessageCard;
  controller: WidgetController;
  serviceById: (id: string) => Service | undefined;
  captured?: boolean;
  onCaptured: () => void;
}) {
  const coachFirst = controller.data.coach.name.split(" ")[0];

  if (card.kind === "video") {
    return (
      <button type="button" className="gw-card gw-video-card" onClick={() => controller.onVideoView(card.contentId, card.url)}>
        {card.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external video thumbnail
          <img src={card.thumbnailUrl} alt="" />
        ) : (
          <span className="gw-video-thumb">
            <PlayIcon size={26} />
          </span>
        )}
        <span className="gw-card-body">
          <strong>{card.title}</strong>
          <small>Watch video</small>
        </span>
      </button>
    );
  }

  if (card.kind === "service") {
    const service = serviceById(card.serviceId);
    if (!service) return null;
    return <ServiceCard service={service} controller={controller} />;
  }

  if (card.kind === "booking") {
    const service = card.serviceId ? serviceById(card.serviceId) : undefined;
    return (
      <button type="button" className="gw-button gw-card-cta" onClick={() => controller.onBookingClick(service)}>
        {card.label}
      </button>
    );
  }

  if (card.kind === "swing_upload") {
    return (
      <button type="button" className="gw-card gw-action-card" onClick={() => controller.openSection("swing")}>
        <UploadIcon size={20} />
        <span className="gw-card-body">
          <strong>{card.prompt}</strong>
          <small>Record or choose a video from your phone</small>
        </span>
      </button>
    );
  }

  if (card.kind === "contact") {
    return (
      <button type="button" className="gw-card gw-action-card" onClick={() => {
        controller.trackEvent("contact_clicked");
        controller.openSection("contact");
      }}>
        <MailIcon size={20} />
        <span className="gw-card-body">
          <strong>{card.label}</strong>
          <small>Send {coachFirst} a message directly</small>
        </span>
      </button>
    );
  }

  // capture
  if (captured) {
    return (
      <div className="gw-card gw-captured">
        <CheckIcon size={15} />
        <span>You're all set. {coachFirst} can follow up with you.</span>
      </div>
    );
  }
  return (
    <div className="gw-card gw-capture-card">
      <p>{card.prompt}</p>
      <LeadCaptureForm controller={controller} compact onCaptured={onCaptured} />
    </div>
  );
}

export function ServiceCard({ service, controller }: { service: Service; controller: WidgetController }) {
  return (
    <div className="gw-card gw-service-card">
      <div className="gw-card-body">
        <strong>{service.name}</strong>
        <span className="gw-service-price">{formatPrice(service)}</span>
        <small>{service.description}</small>
      </div>
      <button
        type="button"
        className="gw-button"
        onClick={() => {
          controller.trackEvent("service_viewed", { service_id: service.id });
          controller.onBookingClick(service);
        }}
      >
        {service.ctaLabel || `Book ${service.name}`}
      </button>
    </div>
  );
}
