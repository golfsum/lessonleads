"use client";

import { Globe, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FaqItem, KnowledgeSource, WebsiteInfo } from "@/lib/domain/types";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/lib/knowledge/categorize";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const typeLabels: Record<KnowledgeSource["type"], string> = {
  website_page: "Website",
  youtube_video: "YouTube",
  faq: "FAQ",
  document: "Document",
  manual: "Manual",
};

export function KnowledgeManager({ sources, faqs, website }: { sources: KnowledgeSource[]; faqs: FaqItem[]; website: WebsiteInfo }) {
  const router = useRouter();
  const [scanUrl, setScanUrl] = useState(website.url ?? "");
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [addUrl, setAddUrl] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [busySource, setBusySource] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  const [faqForm, setFaqForm] = useState<{ id?: string; question: string; answer: string; enabled: boolean } | null>(null);
  const [faqBusy, setFaqBusy] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);

  async function runScan(event: React.FormEvent) {
    event.preventDefault();
    setScanning(true);
    setScanError(null);
    setScanMessage(null);
    const response = await fetch("/api/knowledge/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ website: scanUrl }),
    });
    const payload = (await response.json().catch(() => ({}))) as { pagesIndexed?: number; error?: string };
    setScanning(false);
    if (!response.ok) {
      setScanError(payload.error ?? "Scan failed.");
      return;
    }
    setScanMessage(`Indexed ${payload.pagesIndexed ?? 0} pages from your website.`);
    router.refresh();
  }

  async function sourceAction(body: Record<string, unknown>, sourceId?: string) {
    if (sourceId) setBusySource(sourceId);
    const response = await fetch("/api/knowledge/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusySource(null);
    router.refresh();
    return response;
  }

  async function addPage(event: React.FormEvent) {
    event.preventDefault();
    setAddBusy(true);
    setAddError(null);
    const response = await sourceAction({ action: "add_url", url: addUrl });
    setAddBusy(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setAddError(payload.error ?? "Couldn't add that page.");
      return;
    }
    setAddUrl("");
  }

  async function saveManual(event: React.FormEvent) {
    event.preventDefault();
    setManualBusy(true);
    setManualMessage(null);
    const response = await fetch("/api/knowledge/manual", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: manualTitle, content: manualContent }),
    });
    setManualBusy(false);
    if (response.ok) {
      setManualTitle("");
      setManualContent("");
      setManualMessage("Added. The assistant treats this as trusted knowledge.");
      router.refresh();
    } else {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setManualMessage(payload.error ?? "Couldn't save.");
    }
  }

  async function saveFaq(event: React.FormEvent) {
    event.preventDefault();
    if (!faqForm) return;
    setFaqBusy(true);
    setFaqError(null);
    const response = await fetch("/api/knowledge/faqs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "upsert", ...faqForm }),
    });
    setFaqBusy(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setFaqError(payload.error ?? "Couldn't save this FAQ.");
      return;
    }
    setFaqForm(null);
    router.refresh();
  }

  async function deleteFaq(id: string) {
    if (!window.confirm("Delete this FAQ?")) return;
    await fetch("/api/knowledge/faqs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    router.refresh();
  }

  const visibleSources = typeFilter === "all" ? sources : sources.filter((source) => source.type === typeFilter);

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Website</p><h2>Scan your website</h2></div>
          {website.scanStatus === "scanned" && website.lastScanAt ? <span className="count-badge">Last scan {dateFormat.format(new Date(website.lastScanAt))}</span> : null}
        </div>
        <form className="import-row" onSubmit={runScan}>
          <label>
            <Globe size={16} />
            <input aria-label="Website URL" onChange={(event) => setScanUrl(event.target.value)} placeholder="https://yourcoachingsite.com" required value={scanUrl} />
          </label>
          <button className="button button-primary" disabled={scanning} type="submit">
            {scanning ? "Scanning…" : website.scanStatus === "scanned" ? "Rescan website" : "Scan website"}
          </button>
        </form>
        {scanning ? <p className="scan-progress">Reading your public pages. This usually takes under a minute.</p> : null}
        {scanMessage ? <p className="save-message">{scanMessage}</p> : null}
        {scanError ? <p className="form-error" role="alert">{scanError}</p> : null}
        {website.scanStatus === "error" && website.error && !scanError ? <p className="form-error">Last scan failed: {website.error}</p> : null}
        <small className="install-note">We only read public pages, skip navigation clutter, and respect robots.txt. Rescanning replaces old page content instead of duplicating it.</small>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Knowledge sources</p><h2>What the assistant can answer from</h2></div>
          <select aria-label="Filter sources by type" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
            <option value="all">All types</option>
            <option value="website_page">Website</option>
            <option value="youtube_video">YouTube</option>
            <option value="faq">FAQ</option>
            <option value="manual">Manual</option>
            <option value="document">Documents</option>
          </select>
        </div>
        <form className="import-row compact" onSubmit={addPage}>
          <label>
            <Plus size={15} />
            <input aria-label="Add a page URL" onChange={(event) => setAddUrl(event.target.value)} placeholder="Add a specific page URL" value={addUrl} required />
          </label>
          <button className="button button-secondary" disabled={addBusy} type="submit">{addBusy ? "Reading…" : "Add page"}</button>
        </form>
        {addError ? <p className="form-error" role="alert">{addError}</p> : null}
        <div className="source-list">
          {visibleSources.map((source) => (
            <article className={`source-row ${source.includeInAi ? "" : "inactive"}`} key={source.id}>
              <div>
                <strong>{source.title}</strong>
                <small>
                  {typeLabels[source.type]}
                  {source.category ? ` · ${KNOWLEDGE_CATEGORY_LABELS[source.category]}` : ""}
                  {source.lastSyncedAt ? ` · synced ${dateFormat.format(new Date(source.lastSyncedAt))}` : ""}
                  {source.status === "error" ? ` · error: ${source.error ?? "sync failed"}` : ""}
                </small>
              </div>
              <div className="content-row-actions">
                <label className="toggle" title="Include in AI answers">
                  <input
                    checked={source.includeInAi}
                    onChange={(event) => void sourceAction({ action: "toggle", sourceId: source.id, includeInAi: event.target.checked }, source.id)}
                    type="checkbox"
                  />
                  <i /><span>AI</span>
                </label>
                <select
                  aria-label={`How often ${source.title} changes`}
                  onChange={(event) => void sourceAction({ action: "volatility", sourceId: source.id, volatility: event.target.value }, source.id)}
                  value={source.volatility ?? "static"}
                >
                  <option value="static">Static</option>
                  <option value="frequently_changing">Frequently changing</option>
                </select>
                {source.url && source.type === "website_page" ? (
                  <button
                    aria-label={`Re-sync ${source.title}`}
                    className={busySource === source.id ? "spinning" : ""}
                    disabled={busySource === source.id}
                    onClick={() => void sourceAction({ action: "resync", sourceId: source.id }, source.id)}
                    type="button"
                  >
                    <RefreshCw size={14} />
                  </button>
                ) : null}
                <button aria-label={`Delete ${source.title}`} onClick={() => { if (window.confirm(`Remove "${source.title}" from the assistant's knowledge?`)) void sourceAction({ action: "delete", sourceId: source.id }, source.id); }} type="button">
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
          {visibleSources.length === 0 ? <div className="empty-state">No sources yet. Scan your website or add knowledge below.</div> : null}
        </div>
      </section>

      <div className="dashboard-grid half">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Manual knowledge</p><h2>Add facts directly</h2></div></div>
          <form className="field-grid" onSubmit={saveManual}>
            <label>Title<input maxLength={160} onChange={(event) => setManualTitle(event.target.value)} required value={manualTitle} placeholder="Junior lessons policy" /></label>
            <label>Content<textarea maxLength={20000} minLength={10} onChange={(event) => setManualContent(event.target.value)} required rows={5} value={manualContent} placeholder="Yes, I teach juniors ages 8 and up. Junior lessons are 45 minutes and a parent is welcome to watch." /></label>
            <button className="button button-primary" disabled={manualBusy} type="submit">{manualBusy ? "Saving…" : "Add knowledge"}</button>
            {manualMessage ? <p className="save-message">{manualMessage}</p> : null}
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">FAQs</p><h2>{faqs.length} question{faqs.length === 1 ? "" : "s"}</h2></div>
            <button className="button button-secondary" onClick={() => setFaqForm({ question: "", answer: "", enabled: true })} type="button"><Plus size={14} /> Add FAQ</button>
          </div>
          <div className="source-list">
            {faqs.map((faq) => (
              <article className={`source-row ${faq.enabled ? "" : "inactive"}`} key={faq.id}>
                <div>
                  <strong>{faq.question}</strong>
                  <small>{faq.answer.length > 110 ? `${faq.answer.slice(0, 110)}…` : faq.answer}</small>
                </div>
                <div className="content-row-actions">
                  <button aria-label={`Edit ${faq.question}`} onClick={() => setFaqForm({ id: faq.id, question: faq.question, answer: faq.answer, enabled: faq.enabled })} type="button"><Pencil size={14} /></button>
                  <button aria-label={`Delete ${faq.question}`} onClick={() => void deleteFaq(faq.id)} type="button"><Trash2 size={14} /></button>
                </div>
              </article>
            ))}
            {faqs.length === 0 ? <div className="empty-state">FAQs found on your website appear here. You can also add your own.</div> : null}
          </div>
        </section>
      </div>

      {faqForm ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={faqForm.id ? "Edit FAQ" : "Add FAQ"}>
          <form className="form-modal" onSubmit={saveFaq}>
            <button aria-label="Close" className="modal-close" onClick={() => setFaqForm(null)} type="button"><X size={16} /></button>
            <h2>{faqForm.id ? "Edit FAQ" : "Add an FAQ"}</h2>
            <div className="field-grid">
              <label>Question<input maxLength={300} minLength={4} onChange={(event) => setFaqForm({ ...faqForm, question: event.target.value })} required value={faqForm.question} placeholder="Do you offer online lessons?" /></label>
              <label>Answer<textarea maxLength={4000} minLength={4} onChange={(event) => setFaqForm({ ...faqForm, answer: event.target.value })} required rows={4} value={faqForm.answer} /></label>
              <label className="toggle"><input checked={faqForm.enabled} onChange={(event) => setFaqForm({ ...faqForm, enabled: event.target.checked })} type="checkbox" /><i /><span /> Enabled</label>
            </div>
            {faqError ? <p className="form-error" role="alert">{faqError}</p> : null}
            <button className="button button-primary button-full" disabled={faqBusy} type="submit">{faqBusy ? "Saving…" : "Save FAQ"}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
