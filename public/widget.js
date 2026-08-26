/* LessonLeads embed loader.
 *
 * Floating (default):
 *   <script src="https://lessonleads.com/widget.js" data-coach="PUBLIC_ID" async></script>
 *
 * Inline:
 *   <div id="lessonleads-widget"></div>
 *   <script src="https://lessonleads.com/widget.js" data-coach="PUBLIC_ID" data-mode="inline" async></script>
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) {
    var candidates = document.querySelectorAll("script[data-coach]");
    script = candidates[candidates.length - 1];
  }
  if (!script) return;

  var coachId = script.getAttribute("data-coach") || script.getAttribute("data-widget");
  if (!coachId) return;
  if (window.__lessonleadsLoaded === coachId) return;
  window.__lessonleadsLoaded = coachId;

  var base = new URL(script.src).origin;
  var explicitMode = script.getAttribute("data-mode");
  var inlineTarget =
    document.getElementById(script.getAttribute("data-target") || "lessonleads-widget");
  var mode = explicitMode || (inlineTarget ? "inline" : "floating");

  /* Session id shared with the iframe so loader + widget events line up. */
  var sessionId;
  try {
    var sessionKey = "ll:" + coachId + ":host-session";
    sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
      sessionStorage.setItem(sessionKey, sessionId);
    }
  } catch (error) {
    sessionId = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function track(name) {
    try {
      fetch(base + "/api/public/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coachId: coachId, name: name, sessionId: sessionId, page: location.href.split("#")[0].slice(0, 500) }),
        keepalive: true,
      }).catch(function () {});
    } catch (error) {
      /* Analytics must never break the host page. */
    }
  }

  function iframeSrc() {
    var params = new URLSearchParams();
    params.set("sid", sessionId);
    params.set("page", location.href.split("#")[0].slice(0, 500));
    if (document.referrer) params.set("ref", document.referrer.slice(0, 500));
    var pageParams = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
      var value = pageParams.get(key);
      if (value) params.set(key, value.slice(0, 120));
    });
    return base + "/embed/" + encodeURIComponent(coachId) + "?" + params.toString();
  }

  function makeFrame() {
    var frame = document.createElement("iframe");
    frame.src = iframeSrc();
    frame.title = "Coaching assistant";
    frame.setAttribute("allow", "clipboard-write; camera; microphone");
    frame.style.cssText = "border:0;width:100%;height:100%;background:transparent;color-scheme:normal";
    return frame;
  }

  /* ---------- Inline mode ---------- */

  if (mode === "inline") {
    var mount = inlineTarget;
    if (!mount) {
      mount = document.createElement("div");
      (script.parentElement || document.body).insertBefore(mount, script.nextSibling);
    }
    if (!mount.style.height && mount.clientHeight < 200) {
      mount.style.height = "min(700px, 85vh)";
    }
    mount.style.display = "block";
    var inlineFrame = makeFrame();
    inlineFrame.loading = "lazy";
    inlineFrame.style.borderRadius = "16px";
    inlineFrame.style.boxShadow = "0 10px 34px rgba(15,30,20,.12)";
    mount.appendChild(inlineFrame);
    track("widget_view");
    track("widget_open");
    return;
  }

  /* ---------- Floating mode ---------- */

  var config = {
    launcherText: script.getAttribute("data-label") || "",
    launcherIcon: "chat",
    color: "#185c36",
    position: script.getAttribute("data-position") || "bottom-right",
    size: "standard",
  };

  var ICONS = {
    chat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    flag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 21V4"/><path d="M5 4l11 3.5L5 11" fill="currentColor" stroke="none"/></svg>',
    golf: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="9" r="6"/><ellipse cx="12" cy="20" rx="5" ry="1.6" opacity=".4"/></svg>',
    help: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.24c-.7.35-1.1 1-1.1 1.76v.5"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/></svg>',
  };

  var launcher = document.createElement("button");
  var panel = document.createElement("div");
  var backdrop = document.createElement("div");
  var frame = null;
  var open = false;

  function positionCss(offset) {
    var pos = String(config.position).replace("-", "_");
    return pos === "bottom_left" ? "left:" + offset + ";" : "right:" + offset + ";";
  }

  function renderLauncher() {
    var icon = ICONS[config.launcherIcon] || ICONS.chat;
    launcher.innerHTML = config.launcherText
      ? icon + '<span style="margin-left:8px">' + escapeHtml(config.launcherText) + "</span>"
      : icon;
    launcher.setAttribute("aria-label", config.launcherText || "Open coaching assistant");
    launcher.style.cssText =
      "position:fixed;z-index:2147483644;bottom:20px;" + positionCss("20px") +
      "display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;" +
      "background:" + config.color + ";color:#fff;font:600 14px/1 system-ui,sans-serif;" +
      (config.launcherText ? "border-radius:999px;padding:14px 20px;" : "border-radius:50%;width:56px;height:56px;") +
      "box-shadow:0 10px 30px rgba(0,0,0,.24);transition:transform .15s ease";
  }

  function panelSize() {
    if (config.size === "large") return { width: "440px", height: "760px" };
    if (config.size === "compact") return { width: "360px", height: "600px" };
    return { width: "400px", height: "700px" };
  }

  function stylePanel() {
    var size = panelSize();
    var mobile = window.matchMedia("(max-width: 560px)").matches;
    if (mobile) {
      panel.style.cssText =
        "position:fixed;z-index:2147483646;inset:0;display:none;background:#fff;";
    } else {
      panel.style.cssText =
        "position:fixed;z-index:2147483646;bottom:90px;" + positionCss("20px") +
        "width:min(" + size.width + ",calc(100vw - 40px));" +
        "height:min(" + size.height + ",calc(100vh - 110px));" +
        "display:none;border-radius:16px;overflow:hidden;background:#fff;" +
        "box-shadow:0 24px 70px rgba(0,0,0,.3)";
    }
  }

  backdrop.style.cssText =
    "position:fixed;z-index:2147483645;inset:0;display:none;background:rgba(10,20,14,.4)";

  function setOpen(next) {
    open = next;
    if (open && !frame) {
      frame = makeFrame();
      panel.appendChild(frame);
    }
    stylePanel();
    panel.style.display = open ? "block" : "none";
    backdrop.style.display =
      open && window.matchMedia("(max-width: 560px)").matches ? "block" : "none";
    launcher.style.display = open && window.matchMedia("(max-width: 560px)").matches ? "none" : "flex";
    if (open) track("widget_open");
  }

  launcher.addEventListener("click", function () {
    setOpen(!open);
  });
  backdrop.addEventListener("click", function () {
    setOpen(false);
  });
  window.addEventListener("message", function (event) {
    if (event.origin !== base) return;
    if (event.data && event.data.type === "lessonleads:close") setOpen(false);
  });
  window.addEventListener("resize", function () {
    if (open) setOpen(true);
  });

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function boot() {
    renderLauncher();
    stylePanel();
    document.body.appendChild(launcher);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    track("widget_view");
  }

  /* Pull the coach's saved launcher theme, then render. Render with defaults
     if the request fails so the widget still works. */
  var blocked = false;

  fetch(base + "/api/public/widget/" + encodeURIComponent(coachId))
    .then(function (response) {
      if (response.status === 403) {
        blocked = true;
        return null;
      }
      return response.ok ? response.json() : null;
    })
    .then(function (data) {
      if (data && data.widget && data.widget.theme) {
        var theme = data.widget.theme;
        if (theme.launcherText !== undefined) config.launcherText = theme.launcherText || "";
        if (theme.launcherIcon) config.launcherIcon = theme.launcherIcon;
        if (theme.primaryColor) config.color = theme.primaryColor;
        if (theme.position) config.position = theme.position;
        if (theme.size) config.size = theme.size;
      }
    })
    .catch(function () {})
    .then(function () {
      if (blocked) return;
      if (document.body) boot();
      else document.addEventListener("DOMContentLoaded", boot);
    });
})();
