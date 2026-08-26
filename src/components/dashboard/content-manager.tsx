"use client";

import { ExternalLink, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContentItem } from "@/lib/domain/types";

interface PreviewVideo {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
}

export function ContentManager({ items, youtubeLocked = false }: { items: ContentItem[]; youtubeLocked?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [previews, setPreviews] = useState<PreviewVideo[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function preview(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const response = await fetch("/api/content/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "preview", url }),
    });
    const payload = (await response.json().catch(() => ({}))) as { videos?: PreviewVideo[]; error?: string };
    setBusy(false);
    if (!response.ok || !payload.videos) {
      setError(payload.error ?? "Couldn't read that URL.");
      return;
    }
    setPreviews(payload.videos);
    setSelected(Object.fromEntries(payload.videos.map((video) => [video.videoId, true])));
  }

  async function importSelected() {
    const videos = previews.filter((video) => selected[video.videoId]);
    if (videos.length === 0) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/content/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "import", videos: videos.slice(0, 20) }),
    });
    const payload = (await response.json().catch(() => ({}))) as { imported?: number; skippedDuplicates?: number; error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(payload.error ?? "Import failed.");
      return;
    }
    setPreviews([]);
    setUrl("");
    setNotice(
      `Imported ${payload.imported ?? 0} video${(payload.imported ?? 0) === 1 ? "" : "s"}${payload.skippedDuplicates ? ` (${payload.skippedDuplicates} already in your library)` : ""}.`,
    );
    router.refresh();
  }

  async function toggle(item: ContentItem, field: "includeInAi" | "active") {
    await fetch(`/api/content/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: !item[field] }),
    });
    router.refresh();
  }

  async function remove(item: ContentItem) {
    if (!window.confirm(`Remove "${item.title}" from your library?`)) return;
    await fetch(`/api/content/${item.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Connect your content</p><h2>Import from YouTube</h2></div>
        </div>
        {youtubeLocked ? (
          <p className="empty-state">YouTube channel import is included with Pro. Your existing library still plays in the widget.</p>
        ) : (
          <>
        <form className="import-row" onSubmit={preview}>
          <label>
            <Play size={17} />
            <input
              aria-label="YouTube channel or video URL"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://youtube.com/@YourChannel or a video URL"
              required
              value={url}
            />
          </label>
          <button className="button button-primary" disabled={busy} type="submit">{busy && previews.length === 0 ? "Reading…" : "Find videos"}</button>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {notice ? <p className="save-message">{notice}</p> : null}
        {previews.length > 0 ? (
          <>
            <div className="preview-grid">
              {previews.map((video) => (
                <label className={`preview-tile ${selected[video.videoId] ? "checked" : ""}`} key={video.videoId}>
                  <input
                    checked={Boolean(selected[video.videoId])}
                    onChange={(event) => setSelected((previous) => ({ ...previous, [video.videoId]: event.target.checked }))}
                    type="checkbox"
                  />
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail
                    <img alt="" src={video.thumbnailUrl} />
                  ) : null}
                  <span>{video.title}</span>
                </label>
              ))}
            </div>
            <button className="button button-primary" disabled={busy} onClick={() => void importSelected()} type="button">
              {busy ? "Importing…" : `Import ${Object.values(selected).filter(Boolean).length} selected`}
            </button>
            <small className="install-note">We index available captions so the widget can recommend the right video. Videos without captions are still shown, just matched by title.</small>
          </>
        ) : null}
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Library</p><h2>{items.length} item{items.length === 1 ? "" : "s"}</h2></div>
        </div>
        <div className="content-list">
          {items.map((item) => (
            <article className={`content-row ${item.active ? "" : "inactive"}`} key={item.id}>
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external thumbnail
                <img alt="" src={item.thumbnailUrl} />
              ) : (
                <span className="content-thumb-fallback"><Play size={18} /></span>
              )}
              <div>
                <strong>{item.title}</strong>
                <small>
                  {item.categories.join(" · ") || "Uncategorized"}
                  {item.transcriptAvailable ? " · transcript indexed" : " · title only"}
                </small>
              </div>
              <div className="content-row-actions">
                <label className="toggle" title="Include in AI answers">
                  <input checked={item.includeInAi} onChange={() => void toggle(item, "includeInAi")} type="checkbox" />
                  <i /><span>AI</span>
                </label>
                <label className="toggle" title="Show in widget library">
                  <input checked={item.active} onChange={() => void toggle(item, "active")} type="checkbox" />
                  <i /><span>Show</span>
                </label>
                <a aria-label={`Open ${item.title}`} href={item.url} rel="noreferrer" target="_blank"><ExternalLink size={15} /></a>
                <button aria-label={`Delete ${item.title}`} onClick={() => void remove(item)} type="button"><Trash2 size={15} /></button>
              </div>
            </article>
          ))}
          {items.length === 0 ? <div className="empty-state">Import your YouTube videos so the widget can recommend them to golfers.</div> : null}
        </div>
      </section>
    </div>
  );
}
