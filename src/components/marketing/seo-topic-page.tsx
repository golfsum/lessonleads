import { ArrowRight, CheckCircle2, ClipboardCheck, Link2, Target } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { BottomCta, MarketingShell, PageHero } from "@/components/marketing/marketing-shell";

export interface SeoTopic {
  eyebrow: string;
  title: string;
  description: string;
  contextTitle: string;
  context: string;
  sections: Array<{ title: string; body: string }>;
  checklist: string[];
  note?: string;
  relatedHref?: string;
  relatedLabel?: string;
}

const icons = [Target, ClipboardCheck, Link2];

export function SeoTopicPage({ topic }: { topic: SeoTopic }) {
  return (
    <MarketingShell>
      <PageHero description={topic.description} eyebrow={topic.eyebrow} title={topic.title} />
      <section className="seo-topic page-width">
        <article className="seo-context">
          <p className="eyebrow">The practical problem</p>
          <h2>{topic.contextTitle}</h2>
          <p>{topic.context}</p>
        </article>
        <div className="seo-topic-grid">
          {topic.sections.map((section, index) => {
            const Icon = icons[index % icons.length];
            return <article key={section.title}><Icon size={22} /><h2>{section.title}</h2><p>{section.body}</p></article>;
          })}
        </div>
        <article className="seo-checklist">
          <div><p className="eyebrow">Useful standard</p><h2>What a focused pre-booking flow should do</h2></div>
          <ul>{topic.checklist.map((item) => <li key={item}><CheckCircle2 size={17} /> {item}</li>)}</ul>
        </article>
        {topic.note ? <p className="seo-note">{topic.note}</p> : null}
        {topic.relatedHref && topic.relatedLabel ? <Link className="article-next" href={topic.relatedHref as Route}>{topic.relatedLabel} <ArrowRight size={16} /></Link> : null}
      </section>
      <BottomCta />
    </MarketingShell>
  );
}
