"use client";

import "./widget.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicWidget, Service, WidgetSectionKey } from "@/lib/domain/types";
import { CloseIcon, menuIcon } from "./icons";
import { ChatSection } from "./chat-section";
import { CoachSection, ContactSection, FaqSection, LessonsSection, LibrarySection, VideosSection } from "./sections";
import { SwingSection } from "./swing-section";
import { loadSession, readPageContext, saveConversationId, saveLeadCaptured, sendWidgetEvent, type PageContext, type WidgetSession } from "./session";

export interface WidgetController {
  data: PublicWidget;
  session: WidgetSession;
  context: PageContext;
  leadCaptured: boolean;
  preview: boolean;
  openSection: (key: WidgetSectionKey) => void;
  trackEvent: (name: string, properties?: Record<string, string | number | boolean | null>) => void;
  onBookingClick: (service?: Service) => void;
  onVideoView: (contentId: string, url: string) => void;
  onLeadCaptured: (leadId: string) => void;
  onConversationId: (conversationId: string) => void;
  setConversationIdRef: (conversationId: string | null) => void;
}

export function GolfWidget({ data, embedded = false, preview = false }: { data: PublicWidget; embedded?: boolean; preview?: boolean }) {
  const publicId = data.widget.publicId;
  const [session, setSession] = useState<WidgetSession | null>(null);
  const [context, setContext] = useState<PageContext>({ device: "desktop" });
  const conversationIdRef = useRef<string | null>(null);

  const enabledMenu = useMemo(
    () => [...data.widget.menu].filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [data.widget.menu],
  );
  const defaultSection = enabledMenu.some((item) => item.key === data.widget.defaultSectionKey)
    ? data.widget.defaultSectionKey
    : (enabledMenu[0]?.key ?? "ask");
  const [active, setActive] = useState<WidgetSectionKey>(defaultSection);
  const [leadCaptured, setLeadCaptured] = useState(false);

  useEffect(() => {
    const loaded = loadSession(preview ? `preview-${publicId}` : publicId);
    /* eslint-disable react-hooks/set-state-in-effect -- bootstrap client session state */
    setSession(loaded);
    setLeadCaptured(loaded.leadCaptured);
    /* eslint-enable react-hooks/set-state-in-effect */
    conversationIdRef.current = loaded.conversationId;
    setContext(readPageContext());
    if (!preview) sendWidgetEvent({ coachId: publicId, name: "widget_open", sessionId: loaded.sessionId });
  }, [publicId, preview]);

  if (!session) {
    return <div className="golf-widget" style={themeVars(data)} aria-busy="true" />;
  }

  const controller: WidgetController = {
    data,
    session,
    context,
    leadCaptured,
    preview,
    openSection: (key) => setActive(key),
    trackEvent: (name, properties) => {
      if (preview) return;
      sendWidgetEvent({
        coachId: publicId,
        name,
        sessionId: session.sessionId,
        conversationId: conversationIdRef.current,
        leadId: session.leadId,
        properties,
      });
    },
    onBookingClick: (service) => {
      if (!preview) {
        sendWidgetEvent({
          coachId: publicId,
          name: "booking_clicked",
          sessionId: session.sessionId,
          conversationId: conversationIdRef.current,
          leadId: session.leadId,
          properties: service ? { service_id: service.id, service_name: service.name } : undefined,
        });
      }
      const url = service?.bookingUrl || data.coach.bookingUrl;
      if (url) {
        try {
          window.open(new URL(url, window.location.origin).toString(), "_blank", "noopener");
        } catch {
          window.open(url, "_blank", "noopener");
        }
      }
    },
    onVideoView: (contentId, url) => {
      if (!preview) {
        sendWidgetEvent({
          coachId: publicId,
          name: "video_viewed",
          sessionId: session.sessionId,
          conversationId: conversationIdRef.current,
          properties: { content_id: contentId },
        });
      }
      window.open(url, "_blank", "noopener");
    },
    onLeadCaptured: (leadId) => {
      saveLeadCaptured(publicId, leadId);
      setLeadCaptured(true);
      setSession({ ...session, leadCaptured: true, leadId });
    },
    onConversationId: (conversationId) => {
      conversationIdRef.current = conversationId;
      saveConversationId(publicId, conversationId);
    },
    setConversationIdRef: (conversationId) => {
      conversationIdRef.current = conversationId;
    },
  };

  const closeWidget = () => {
    if (typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage({ type: "lessonleads:close" }, "*");
    }
  };

  const theme = data.widget.theme;

  return (
    <div className={`golf-widget ${theme.appearance === "dark" ? "gw-dark" : ""}`} style={themeVars(data)}>
      <header className="gw-header">
        <div className="gw-header-id">
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- coach-hosted image URL, not optimizable
            <img src={theme.logoUrl} alt="" className="gw-logo" />
          ) : theme.coachAvatarUrl || theme.assistantAvatarUrl || data.coach.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- coach-hosted image URL, not optimizable
            <img src={theme.assistantAvatarUrl || theme.coachAvatarUrl || data.coach.profilePhotoUrl} alt="" className="gw-avatar-img" />
          ) : (
            <span className="gw-avatar">{initials(data.coach.name)}</span>
          )}
          <div>
            <strong>{theme.assistantName}</strong>
            <small>{data.coach.businessName}</small>
          </div>
        </div>
        {embedded ? (
          <button type="button" className="gw-close" onClick={closeWidget} aria-label="Close widget">
            <CloseIcon size={16} />
          </button>
        ) : null}
      </header>

      <div className="gw-body">
        {active === "ask" ? <ChatSection controller={controller} /> : null}
        {active === "lessons" ? <LessonsSection controller={controller} /> : null}
        {active === "drills" ? <LibrarySection controller={controller} kinds={["drill"]} empty="No drills published yet." /> : null}
        {active === "resources" ? <LibrarySection controller={controller} kinds={["article", "pdf", "guide"]} empty="No resources published yet." /> : null}
        {active === "custom" ? <LessonsSection controller={controller} /> : null}
        {active === "videos" ? <VideosSection controller={controller} /> : null}
        {active === "coach" ? <CoachSection controller={controller} /> : null}
        {active === "faq" ? <FaqSection controller={controller} /> : null}
        {active === "swing" ? <SwingSection controller={controller} /> : null}
        {active === "contact" ? <ContactSection controller={controller} /> : null}
      </div>

      {enabledMenu.length > 1 ? (
        <nav className="gw-nav" aria-label="Widget sections">
          {enabledMenu.map((item) =>
            item.externalUrl ? (
              <a key={item.id} href={item.externalUrl} target="_blank" rel="noopener noreferrer">
                {menuIcon(item.icon)}
                <span>{item.title}</span>
              </a>
            ) : (
              <button
                key={item.id}
                type="button"
                className={active === item.key ? "active" : ""}
                onClick={() => setActive(item.key)}
              >
                {menuIcon(item.icon)}
                <span>{item.title}</span>
              </button>
            ),
          )}
        </nav>
      ) : null}

      {data.plan === "free" ? (
        <footer className="gw-footer">
          Powered by <strong>LessonLeads</strong>
        </footer>
      ) : null}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function themeVars(data: PublicWidget): React.CSSProperties {
  const theme = data.widget.theme;
  return {
    "--w-primary": theme.primaryColor,
    "--w-accent": theme.accentColor,
    "--w-bg": theme.backgroundColor,
    "--w-text": theme.textColor,
    "--w-button": theme.buttonColor,
    "--w-radius": `${theme.borderRadius}px`,
  } as React.CSSProperties;
}
