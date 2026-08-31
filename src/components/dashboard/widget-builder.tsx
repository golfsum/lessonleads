"use client";

import { ArrowDown, ArrowUp, Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { LauncherIcon, LauncherStyle, PublicWidget, WidgetMenuIcon, WidgetMenuItem, WidgetSectionKey, WidgetTheme } from "@/lib/domain/types";
import { GolfWidget } from "@/components/widget/golf-widget";
import { LogoUrlField } from "@/components/widget/logo-url-field";

const standardSections: Array<{ key: WidgetSectionKey; title: string; icon: WidgetMenuIcon }> = [
  { key: "ask", title: "Ask", icon: "chat" },
  { key: "lessons", title: "Lessons", icon: "flag" },
  { key: "videos", title: "Videos", icon: "video" },
  { key: "coach", title: "Coach", icon: "person" },
  { key: "drills", title: "Drills", icon: "target" },
  { key: "resources", title: "Resources", icon: "book" },
  { key: "faq", title: "FAQ", icon: "question" },
  { key: "swing", title: "Upload Swing", icon: "upload" },
  { key: "contact", title: "Contact", icon: "mail" },
];

const iconOptions: WidgetMenuIcon[] = ["chat", "flag", "video", "person", "target", "book", "question", "upload", "mail", "link"];

const launcherIcons: Record<LauncherIcon, string> = {
  chat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  flag: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21V4l11 3.5L5 11z"/></svg>',
  golf: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="9" r="6"/><ellipse cx="12" cy="20" rx="5" ry="1.6" opacity=".4"/></svg>',
  help: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.24c-.7.35-1.1 1-1.1 1.76v.5"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/></svg>',
};

function LauncherPreview({ theme }: { theme: WidgetTheme }) {
  const style = theme.launcherStyle ?? "icon_text";
  const hasText = Boolean(theme.launcherText);
  const showText = (style === "text" || style === "icon_text") && hasText;
  const showIcon = style !== "text" || !showText;
  const iconOnly = showIcon && !showText;
  const logoFill = iconOnly && Boolean(theme.logoUrl);
  const className = [
    "launcher-preview-btn",
    iconOnly ? "icon-only" : "pill",
    logoFill ? "has-logo" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="launcher-preview">
      <span className="field-hint">Launcher preview</span>
      <div className={className} style={logoFill ? undefined : { background: theme.primaryColor || theme.buttonColor }}>
        {showIcon ? (
          theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- coach-hosted logo URL
            <img alt="" src={theme.logoUrl} />
          ) : (
            <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: launcherIcons[theme.launcherIcon] }} />
          )
        ) : null}
        {showText ? <span>{theme.launcherText}</span> : null}
      </div>
    </div>
  );
}

export function WidgetBuilder({ publicWidget }: { publicWidget: PublicWidget }) {
  const router = useRouter();
  const [theme, setTheme] = useState<WidgetTheme>(publicWidget.widget.theme);
  const [menu, setMenu] = useState<WidgetMenuItem[]>([...publicWidget.widget.menu].sort((a, b) => a.sortOrder - b.sortOrder));
  const [defaultSection, setDefaultSection] = useState<WidgetSectionKey>(publicWidget.widget.defaultSectionKey);
  const [status, setStatus] = useState(publicWidget.widget.status);
  const [origins, setOrigins] = useState(publicWidget.widget.allowedOrigins.join("\n"));
  const [suggested, setSuggested] = useState(publicWidget.widget.theme.suggestedQuestions.join("\n"));
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const setThemeField = <K extends keyof WidgetTheme>(key: K, value: WidgetTheme[K]) =>
    setTheme((previous) => ({ ...previous, [key]: value }));

  const draft: PublicWidget = useMemo(() => {
    const cleanTheme: WidgetTheme = {
      ...theme,
      suggestedQuestions: suggested.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 6),
    };
    const enabled = menu.filter((item) => item.enabled);
    return {
      ...publicWidget,
      widget: {
        ...publicWidget.widget,
        theme: cleanTheme,
        menu,
        defaultSectionKey: enabled.some((item) => item.key === defaultSection) ? defaultSection : (enabled[0]?.key ?? "ask"),
      },
    };
  }, [publicWidget, theme, menu, defaultSection, suggested]);

  function move(index: number, direction: -1 | 1) {
    setMenu((previous) => {
      const next = [...previous];
      const target = index + direction;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex }));
    });
  }

  function updateItem(id: string, patch: Partial<WidgetMenuItem>) {
    setMenu((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addSection(key: WidgetSectionKey) {
    const template = standardSections.find((section) => section.key === key);
    if (!template) return;
    setMenu((previous) => [
      ...previous,
      { id: `menu-${key}-${Date.now()}`, key, title: template.title, icon: template.icon, enabled: true, sortOrder: previous.length },
    ]);
  }

  const missingSections = standardSections.filter((section) => !menu.some((item) => item.key === section.key));

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/widget", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        theme: {
          ...theme,
          logoUrl: theme.logoUrl ?? "",
          coachAvatarUrl: theme.coachAvatarUrl ?? "",
          assistantAvatarUrl: theme.assistantAvatarUrl ?? "",
          suggestedQuestions: suggested.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 6),
        },
        menu: menu.map((item, index) => ({
          ...item,
          sortOrder: index,
          externalUrl: item.externalUrl && /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(item.externalUrl) ? item.externalUrl : undefined,
        })),
        status,
        allowedOrigins: origins.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 10),
        defaultSectionKey: defaultSection,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Couldn't save the widget.");
      return;
    }
    setMessage("Saved. Your live widget updates immediately.");
    setPreviewKey((key) => key + 1);
    router.refresh();
  }

  return (
    <div className="builder-layout widget-builder">
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Branding</p><h2>Make it feel like your coaching</h2></div></div>
          <div className="field-grid two">
            <LogoUrlField
              hint="Used in the widget header. Also used on the launcher when the look includes an icon."
              onChange={(value) => setThemeField("logoUrl", value || undefined)}
              value={theme.logoUrl ?? ""}
            />
            <label>Assistant name<input maxLength={60} onChange={(event) => setThemeField("assistantName", event.target.value)} value={theme.assistantName} placeholder="Ask Mike" /></label>
            <label>Launcher look
              <select onChange={(event) => setThemeField("launcherStyle", event.target.value as LauncherStyle)} value={theme.launcherStyle ?? "icon_text"}>
                <option value="icon">Icon only</option>
                <option value="icon_text">Icon and text</option>
                <option value="text">Text only</option>
              </select>
            </label>
            <label>Launcher text
              <input maxLength={48} onChange={(event) => setThemeField("launcherText", event.target.value)} value={theme.launcherText} placeholder="Need help with your swing?" />
              <small className="field-hint">Shown on the button for Icon and text or Text only. For Icon only, this is the accessible name.</small>
            </label>
            {(theme.launcherStyle ?? "icon_text") !== "text" ? (
              <label>Launcher icon
                <select onChange={(event) => setThemeField("launcherIcon", event.target.value as LauncherIcon)} value={theme.launcherIcon}>
                  <option value="chat">Chat bubble</option>
                  <option value="flag">Golf flag</option>
                  <option value="golf">Golf ball</option>
                  <option value="help">Question mark</option>
                </select>
                <small className="field-hint">Used when no site logo is set.</small>
              </label>
            ) : null}
            <div className="span-two">
              <LauncherPreview theme={theme} />
            </div>
            <label className="span-two">Welcome message<textarea maxLength={400} onChange={(event) => setThemeField("welcomeMessage", event.target.value)} rows={3} value={theme.welcomeMessage} /></label>
            <label>Position
              <select onChange={(event) => setThemeField("position", event.target.value as WidgetTheme["position"])} value={theme.position}>
                <option value="bottom_right">Bottom right</option>
                <option value="bottom_left">Bottom left</option>
              </select>
            </label>
            <label>Appearance
              <select onChange={(event) => setThemeField("appearance", event.target.value as WidgetTheme["appearance"])} value={theme.appearance}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>Corner radius ({theme.borderRadius}px)<input max={24} min={0} onChange={(event) => setThemeField("borderRadius", Number(event.target.value))} type="range" value={theme.borderRadius} /></label>
            <label>Accent color<input onChange={(event) => setThemeField("accentColor", event.target.value)} type="color" value={theme.accentColor} /></label>
            <label>Primary color<input onChange={(event) => setThemeField("primaryColor", event.target.value)} type="color" value={theme.primaryColor} /></label>
            <label>Button color<input onChange={(event) => setThemeField("buttonColor", event.target.value)} type="color" value={theme.buttonColor} /></label>
            <label>Background<input onChange={(event) => setThemeField("backgroundColor", event.target.value)} type="color" value={theme.backgroundColor} /></label>
            <label>Text color<input onChange={(event) => setThemeField("textColor", event.target.value)} type="color" value={theme.textColor} /></label>
            <label>Widget size
              <select onChange={(event) => setThemeField("size", event.target.value as WidgetTheme["size"])} value={theme.size ?? "standard"}>
                <option value="compact">Compact</option>
                <option value="standard">Standard</option>
                <option value="large">Large</option>
              </select>
            </label>
            <label className="span-two">Coach photo URL (optional)<input maxLength={500} onChange={(event) => setThemeField("coachAvatarUrl", event.target.value || undefined)} type="url" value={theme.coachAvatarUrl ?? ""} placeholder="https://yoursite.com/photo.jpg" /></label>
            <label className="span-two">Assistant avatar URL (optional)<input maxLength={500} onChange={(event) => setThemeField("assistantAvatarUrl", event.target.value || undefined)} type="url" value={theme.assistantAvatarUrl ?? ""} placeholder="https://yoursite.com/assistant.png" /></label>
            <label className="span-two">Suggested questions (one per line, up to 6)<textarea onChange={(event) => setSuggested(event.target.value)} rows={4} value={suggested} /></label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Navigation</p><h2>Sections golfers can open</h2></div></div>
          <div className="menu-builder">
            {menu.map((item, index) => (
              <article className={`menu-item-row ${item.enabled ? "" : "disabled"}`} key={item.id}>
                <div className="drag-controls">
                  <button aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} type="button"><ArrowUp size={14} /></button>
                  <button aria-label="Move down" disabled={index === menu.length - 1} onClick={() => move(index, 1)} type="button"><ArrowDown size={14} /></button>
                </div>
                <input aria-label={`Title for ${item.key} section`} maxLength={40} onChange={(event) => updateItem(item.id, { title: event.target.value })} value={item.title} />
                <select aria-label={`Icon for ${item.title}`} onChange={(event) => updateItem(item.id, { icon: event.target.value as WidgetMenuIcon })} value={item.icon}>
                  {iconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                </select>
                {item.key === "custom" ? (
                  <input
                    aria-label={`URL for ${item.title}`}
                    className="menu-url"
                    maxLength={500}
                    onChange={(event) => updateItem(item.id, { externalUrl: event.target.value })}
                    placeholder="https://…"
                    type="url"
                    value={item.externalUrl ?? ""}
                  />
                ) : (
                  <small className="capitalize">{item.key === "ask" ? "AI chat" : item.key}</small>
                )}
                <label className="toggle" title={item.key === "ask" ? "The Ask section always stays on" : "Show this section"}>
                  <input
                    checked={item.enabled}
                    disabled={item.key === "ask"}
                    onChange={(event) => updateItem(item.id, { enabled: event.target.checked })}
                    type="checkbox"
                  />
                  <i /><span />
                </label>
                {item.key !== "ask" ? (
                  <button aria-label={`Remove ${item.title}`} className="menu-remove" onClick={() => setMenu((previous) => previous.filter((candidate) => candidate.id !== item.id))} type="button">
                    <Trash2 size={14} />
                  </button>
                ) : <span className="menu-remove-spacer" />}
              </article>
            ))}
          </div>
          <div className="menu-add-row">
            {missingSections.map((section) => (
              <button className="button button-secondary" key={section.key} onClick={() => addSection(section.key)} type="button">
                <Plus size={13} /> {section.title}
              </button>
            ))}
            <button
              className="button button-secondary"
              onClick={() =>
                setMenu((previous) => [
                  ...previous,
                  {
                    id: `menu-custom-${Date.now()}`,
                    key: "custom",
                    title: "Custom link",
                    icon: "link",
                    enabled: true,
                    sortOrder: previous.length,
                    externalUrl: "https://",
                  },
                ])
              }
              type="button"
            >
              <Plus size={13} /> Custom link
            </button>
          </div>
          <label className="default-section">Default section
            <select onChange={(event) => setDefaultSection(event.target.value as WidgetSectionKey)} value={defaultSection}>
              {menu.filter((item) => item.enabled).map((item) => <option key={item.id} value={item.key}>{item.title}</option>)}
            </select>
          </label>
        </section>

        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Publishing</p><h2>Status and allowed websites</h2></div></div>
          <div className="field-grid">
            <label>Widget status
              <select onChange={(event) => setStatus(event.target.value as typeof status)} value={status}>
                <option value="active">Active (live on your site)</option>
                <option value="draft">Draft (only you can preview)</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <label>Allowed domains (one per line)
              <textarea onChange={(event) => setOrigins(event.target.value)} rows={3} value={origins} placeholder={"coachmikegolf.com\nwww.coachmikegolf.com"} />
            </label>
            <small className="install-note">Leave empty to allow any site. Localhost is always allowed for testing.</small>
          </div>
        </section>

        <div className="builder-save-row">
          <button className="button button-primary" disabled={busy} onClick={() => void save()} type="button">{busy ? "Saving…" : "Save widget"}</button>
          {message ? <p className="save-message">{message}</p> : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div>
      </div>

      <aside className="builder-side">
        <div className="preview-toolbar">
          <p className="eyebrow">Live preview</p>
          <div className="preview-toggle">
            <button aria-label="Desktop preview" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} type="button"><Monitor size={15} /></button>
            <button aria-label="Mobile preview" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} type="button"><Smartphone size={15} /></button>
          </div>
        </div>
        <div className={`preview-stage ${device}`}>
          <GolfWidget data={draft} key={`${previewKey}-${device}`} preview />
        </div>
        <small className="install-note">The preview is fully interactive. Test chats do not count toward your monthly AI conversations.</small>
      </aside>
    </div>
  );
}
