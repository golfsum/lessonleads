"use client";

import { useMemo, useState } from "react";
import type { ContentItem } from "@/lib/domain/types";
import type { WidgetController } from "./golf-widget";
import { ClockIcon, GlobeIcon, MailIcon, PinIcon, PlayIcon } from "./icons";
import { ServiceCard } from "./chat-section";
import { formatDuration, formatPrice } from "@/lib/domain/format";

export function LessonsSection({ controller }: { controller: WidgetController }) {
  const services = controller.data.services;
  if (services.length === 0) {
    return <div className="gw-section"><p className="gw-empty">No lessons published yet.</p></div>;
  }
  const featured = services.filter((service) => service.featured);
  const rest = services.filter((service) => !service.featured);
  return (
    <div className="gw-section">
      {[...featured, ...rest].map((service) => (
        <div key={service.id} className={`gw-service-tile ${service.featured ? "featured" : ""}`}>
          {service.featured ? <span className="gw-featured-tag">Most popular</span> : null}
          <strong>{service.name}</strong>
          <div className="gw-service-meta">
            <b>{formatPrice(service)}</b>
            {service.durationMinutes ? (
              <span>
                <ClockIcon /> {formatDuration(service.durationMinutes)}
              </span>
            ) : null}
            <span>
              {service.mode === "online" ? <GlobeIcon /> : <PinIcon />}
              {service.mode === "online" ? "Online" : service.mode === "both" ? "In person or online" : service.location || "In person"}
            </span>
          </div>
          <p>{service.description}</p>
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
      ))}
    </div>
  );
}

export function VideosSection({ controller }: { controller: WidgetController }) {
  const items = controller.data.contentItems;
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) for (const category of item.categories) set.add(category);
    return [...set];
  }, [items]);
  const [filter, setFilter] = useState<string | null>(null);
  const visible = filter ? items.filter((item) => item.categories.includes(filter)) : items;

  if (items.length === 0) {
    return <div className="gw-section"><p className="gw-empty">No videos published yet.</p></div>;
  }
  return (
    <div className="gw-section">
      {categories.length > 1 ? (
        <div className="gw-filter-row">
          <button type="button" className={filter === null ? "active" : ""} onClick={() => setFilter(null)}>
            All
          </button>
          {categories.map((category) => (
            <button key={category} type="button" className={filter === category ? "active" : ""} onClick={() => setFilter(category)}>
              {category}
            </button>
          ))}
        </div>
      ) : null}
      <div className="gw-video-grid">
        {visible.map((item) => (
          <VideoTile key={item.id} item={item} controller={controller} />
        ))}
      </div>
    </div>
  );
}

export function LibrarySection({
  controller,
  kinds,
  empty,
}: {
  controller: WidgetController;
  kinds: ContentItem["type"][];
  empty: string;
}) {
  const items = controller.data.contentItems.filter((item) => kinds.includes(item.type));
  if (items.length === 0) {
    return <div className="gw-section"><p className="gw-empty">{empty}</p></div>;
  }
  return (
    <div className="gw-section">
      <div className="gw-video-grid">
        {items.map((item) => (
          <VideoTile key={item.id} item={item} controller={controller} />
        ))}
      </div>
    </div>
  );
}

function VideoTile({ item, controller }: { item: ContentItem; controller: WidgetController }) {
  return (
    <button type="button" className="gw-video-tile" onClick={() => controller.onVideoView(item.id, item.url)}>
      {item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external video thumbnail
        <img src={item.thumbnailUrl} alt="" loading="lazy" />
      ) : (
        <span className="gw-video-thumb">
          <PlayIcon size={28} />
        </span>
      )}
      <strong>{item.title}</strong>
      <small>{item.categories.join(" \u00b7 ")}</small>
    </button>
  );
}

export function CoachSection({ controller }: { controller: WidgetController }) {
  const coach = controller.data.coach;
  return (
    <div className="gw-section gw-coach">
      {coach.profilePhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- coach-hosted image
        <img src={coach.profilePhotoUrl} alt={coach.name} className="gw-coach-photo" />
      ) : (
        <span className="gw-coach-mark">{coach.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
      )}
      <h2>{coach.name}</h2>
      <p className="gw-coach-title">
        {coach.title}
        {coach.credentials.length > 0 ? ` \u00b7 ${coach.credentials[0]}` : ""}
      </p>
      {coach.philosophy ? <p className="gw-coach-philosophy">{coach.philosophy}</p> : null}
      {coach.bio ? <p className="gw-coach-bio">{coach.bio}</p> : null}
      <p className="gw-coach-location">
        <PinIcon /> {coach.location}
      </p>
      {coach.teachingFocus.length > 0 ? (
        <ul className="gw-focus-list">
          {coach.teachingFocus.map((focus) => (
            <li key={focus}>{focus}</li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="gw-button" onClick={() => controller.onBookingClick()}>
        {coach.name === coach.businessName ? "Get started" : `Book with ${coach.name.split(" ")[0]}`}
      </button>
    </div>
  );
}

export function FaqSection({ controller }: { controller: WidgetController }) {
  const faqs = controller.data.faqs;
  const [open, setOpen] = useState<string | null>(null);
  if (faqs.length === 0) {
    return <div className="gw-section"><p className="gw-empty">No FAQs published yet.</p></div>;
  }
  return (
    <div className="gw-section gw-faq">
      {faqs.map((faq) => (
        <div key={faq.id} className={`gw-faq-item ${open === faq.id ? "open" : ""}`}>
          <button type="button" onClick={() => setOpen(open === faq.id ? null : faq.id)}>
            {faq.question}
            <span aria-hidden>{open === faq.id ? "\u2212" : "+"}</span>
          </button>
          {open === faq.id ? <p>{faq.answer}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function ContactSection({ controller }: { controller: WidgetController }) {
  const coach = controller.data.coach;
  const product = coach.name === coach.businessName;
  const first = coach.name.split(" ")[0];
  const socials = Object.entries(coach.socialLinks).filter(([, url]) => Boolean(url)) as Array<[string, string]>;
  return (
    <div className="gw-section gw-contact">
      <h2>{product ? `Talk to ${coach.name}` : `Get in touch with ${first}`}</h2>
      <p>{product ? "Questions about plans, install, or whether this fits your coaching site." : "Send a message about lessons, your game, or anything else."}</p>
      <div className="gw-contact-actions">
        <button
          type="button"
          className="gw-button"
          onClick={() => {
            controller.trackEvent("contact_clicked");
            controller.onBookingClick();
          }}
        >
          {product ? "Get started" : `Book with ${first}`}
        </button>
        {coach.website ? (
          <a className="gw-outline-button" href={coach.website} target="_blank" rel="noopener noreferrer">
            <GlobeIcon /> Visit website
          </a>
        ) : null}
      </div>
      {socials.length > 0 ? (
        <div className="gw-socials">
          {socials.map(([network, url]) => (
            <a key={network} href={url} target="_blank" rel="noopener noreferrer">
              {network.charAt(0).toUpperCase() + network.slice(1)}
            </a>
          ))}
        </div>
      ) : null}
      <p className="gw-contact-hint">
        <MailIcon /> Prefer chat? Ask a question in the {controller.data.widget.menu.find((item) => item.key === "ask")?.title ?? "Ask"} tab and
        leave your email so {first} can follow up.
      </p>
    </div>
  );
}
