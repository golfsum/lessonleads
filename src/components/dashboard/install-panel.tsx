"use client";

import { Check, CheckCircle2, Clipboard, ExternalLink, Mail, XCircle } from "lucide-react";
import { useState } from "react";

const platforms = [
  { id: "html", label: "HTML" },
  { id: "wordpress", label: "WordPress" },
  { id: "squarespace", label: "Squarespace" },
  { id: "wix", label: "Wix" },
  { id: "webflow", label: "Webflow" },
  { id: "other", label: "Other" },
] as const;

type PlatformId = (typeof platforms)[number]["id"];

const instructions: Record<PlatformId, string[]> = {
  html: ["Paste the snippet right before the closing </body> tag on every page.", "Publish your site. The launcher appears in the corner automatically."],
  wordpress: [
    "In wp-admin, go to Appearance → Theme File Editor, or install a header/footer snippet plugin (e.g. WPCode).",
    "Paste the snippet into the footer scripts area so it loads on every page.",
    "Save and view your site while logged out to confirm the launcher appears.",
  ],
  squarespace: [
    "Go to Settings → Advanced → Code Injection.",
    "Paste the snippet into the Footer box and save.",
    "Code Injection requires a Business plan or higher.",
  ],
  wix: [
    "Go to Settings → Custom Code in your site dashboard.",
    "Click Add Custom Code, paste the snippet, apply to All pages, and load it in the Body - end.",
    "Publish your site.",
  ],
  webflow: [
    "Open Project Settings → Custom Code.",
    "Paste the snippet into the Footer Code box and save.",
    "Publish your site. Custom code requires a paid Webflow site plan.",
  ],
  other: [
    "Paste the snippet before the closing </body> tag, or in your platform's footer scripts setting.",
    "The script loads asynchronously and won't slow your page down.",
    "If your platform blocks custom scripts, share your hosted widget link instead.",
  ],
};

export function InstallPanel({ publicId, slug, appUrl, website }: { publicId: string; slug: string; appUrl: string; website: string }) {
  const [mode, setMode] = useState<"floating" | "inline">("floating");
  const [platform, setPlatform] = useState<PlatformId>("html");
  const [copied, setCopied] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState(website);
  const [verifying, setVerifying] = useState(false);
  const [verdict, setVerdict] = useState<{ installed: boolean; reason?: string } | null>(null);

  const hosted = `${appUrl}/l/${slug}`;
  const code =
    mode === "floating"
      ? `<script src="${appUrl}/widget.js" data-coach="${publicId}" async></script>`
      : `<div id="lessonleads-widget"></div>\n<script src="${appUrl}/widget.js" data-coach="${publicId}" data-mode="inline" async></script>`;

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setVerifying(true);
    setVerdict(null);
    try {
      const response = await fetch("/api/install/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ website: verifyUrl }),
      });
      const payload = (await response.json()) as { installed?: boolean; reason?: string; error?: string };
      if (!response.ok) {
        setVerdict({ installed: false, reason: payload.error ?? "Verification failed." });
      } else {
        setVerdict({ installed: Boolean(payload.installed), reason: payload.reason });
      }
    } catch {
      setVerdict({ installed: false, reason: "Verification request failed. Try again." });
    } finally {
      setVerifying(false);
    }
  }

  const mailBody = encodeURIComponent(
    `Hi,\n\nCan you add this snippet to our website, right before the closing </body> tag on every page?\n\n${code}\n\nThanks!`,
  );

  return (
    <div className="install-layout">
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">One line of code</p><h2>Install your widget</h2></div></div>
        <div className="mode-picker">
          <button className={mode === "floating" ? "active" : ""} onClick={() => setMode("floating")} type="button">
            <strong>Floating button</strong><span>A launcher in the corner of every page. Recommended.</span>
          </button>
          <button className={mode === "inline" ? "active" : ""} onClick={() => setMode("inline")} type="button">
            <strong>Inline embed</strong><span>The full widget inside a page, e.g. /ask or /lessons.</span>
          </button>
        </div>
        <label className="code-block">
          <span>{mode === "floating" ? "Paste before the closing </body> tag" : "Paste where the widget should appear"}</span>
          <textarea aria-label="Widget installation code" readOnly rows={mode === "floating" ? 3 : 4} value={code} />
        </label>
        <div className="contact-actions">
          <button className="button button-primary" onClick={() => void copy()} type="button">
            {copied ? <Check size={16} /> : <Clipboard size={16} />} {copied ? "Copied" : "Copy code"}
          </button>
          <a className="button button-secondary" href={`mailto:?subject=${encodeURIComponent("Add LessonLeads to our website")}&body=${mailBody}`}>
            <Mail size={15} /> Email to developer
          </a>
          <a className="button button-secondary" href={hosted} rel="noreferrer" target="_blank">
            <ExternalLink size={15} /> Preview widget
          </a>
        </div>

        <div className="platform-tabs" role="tablist" aria-label="Platform instructions">
          {platforms.map((item) => (
            <button
              aria-selected={platform === item.id}
              className={platform === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setPlatform(item.id)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <ol className="platform-steps">
          {instructions[platform].map((step) => <li key={step}>{step}</li>)}
        </ol>
        <small className="install-note">The async loader creates an isolated iframe, so LessonLeads never changes your website&apos;s styles.</small>
      </section>

      <div className="dashboard-grid">
        <aside className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Check your install</p><h2>Verify installation</h2></div></div>
          <form className="import-row compact" onSubmit={verify}>
            <label>
              <input aria-label="Website to verify" onChange={(event) => setVerifyUrl(event.target.value)} placeholder="https://yoursite.com" required value={verifyUrl} />
            </label>
            <button className="button button-primary" disabled={verifying} type="submit">{verifying ? "Checking…" : "Verify"}</button>
          </form>
          {verdict ? (
            <div className={`verify-result ${verdict.installed ? "ok" : "bad"}`}>
              {verdict.installed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              <div>
                <strong>{verdict.installed ? "Widget installed" : "Widget not detected"}</strong>
                {verdict.reason ? <small>{verdict.reason}</small> : <small>Your widget is live on this site.</small>}
              </div>
            </div>
          ) : null}
        </aside>

        <aside className="panel hosted-card">
          <p className="eyebrow">No website changes needed</p>
          <h2>Your hosted widget link</h2>
          <p>Share it in your Instagram bio, YouTube descriptions, email signature, or Google Business Profile.</p>
          <a href={hosted} rel="noreferrer" target="_blank">{hosted} <ExternalLink size={14} /></a>
          <small>Widget ID: {publicId}</small>
        </aside>
      </div>
    </div>
  );
}
