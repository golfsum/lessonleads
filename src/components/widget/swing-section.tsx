"use client";

import { useRef, useState } from "react";
import type { WidgetController } from "./golf-widget";
import { CheckIcon, UploadIcon } from "./icons";
import { LeadCaptureForm } from "./lead-capture-form";
import { hasPlanFeature } from "@/lib/billing/plans";

const MAX_BYTES = 120 * 1024 * 1024;

export function SwingSection({ controller }: { controller: WidgetController }) {
  const { data, session, leadCaptured } = controller;
  const coachFirst = data.coach.name.split(" ")[0];
  const [file, setFile] = useState<File | null>(null);
  const [club, setClub] = useState("");
  const [miss, setMiss] = useState("");
  const [handicap, setHandicap] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsSaved, setDetailsSaved] = useState(leadCaptured);
  const startedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = (selected: File | null) => {
    setError(null);
    if (!selected) return;
    if (selected.size > MAX_BYTES) {
      setError("Video must be under 120 MB. Trim it to just the swing.");
      return;
    }
    if (!selected.type.startsWith("video/")) {
      setError("Choose a video file.");
      return;
    }
    setFile(selected);
    if (!startedRef.current) {
      startedRef.current = true;
      controller.trackEvent("swing_upload_started");
    }
  };

  const submit = async () => {
    if (!file) {
      setError("Choose or record a swing video first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("coachId", data.widget.publicId);
      form.set("visitorId", session.visitorId);
      form.set("sessionId", session.sessionId);
      if (session.conversationId) form.set("conversationId", session.conversationId);
      if (controller.preview) form.set("preview", "true");
      form.set("file", file);
      if (club) form.set("club", club);
      if (miss) form.set("typicalMiss", miss);
      if (handicap) form.set("handicap", handicap);
      if (goal) form.set("goal", goal);
      const response = await fetch("/api/public/swing-upload", { method: "POST", body: form });
      const payload = (await response.json()) as { uploadId?: string; error?: string };
      if (!response.ok || !payload.uploadId) {
        setError(payload.error ?? "Upload failed. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!hasPlanFeature(data.plan, "swingUploads") && !controller.preview) {
    return (
      <div className="gw-section gw-swing">
        <h2>Upload your swing</h2>
        <p>
          {coachFirst} isn&apos;t taking swing videos through the widget yet. Ask in chat or pick a lesson instead.
        </p>
        <button type="button" className="gw-button" onClick={() => controller.openSection("lessons")}>
          See {coachFirst}&apos;s lessons
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="gw-section gw-swing-done">
        <span className="gw-done-mark">
          <CheckIcon size={22} />
        </span>
        <h2>Swing received</h2>
        <p>
          {coachFirst} will take a look. {detailsSaved || leadCaptured ? "You’ll hear back by email." : `Leave your email in the chat so ${coachFirst} can reply.`}
        </p>
        {data.services.some((service) => service.mode !== "in_person") ? (
          <button type="button" className="gw-button" onClick={() => controller.openSection("lessons")}>
            See {coachFirst}&apos;s lessons
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="gw-section gw-swing">
      <h2>Upload your swing</h2>
      <p>Send {coachFirst} a video of your swing. Face-on or down-the-line works best.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="gw-hidden-input"
        onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
      />
      <button type="button" className={`gw-dropzone ${file ? "has-file" : ""}`} onClick={() => fileInputRef.current?.click()}>
        <UploadIcon size={22} />
        {file ? (
          <span>
            <strong>{file.name}</strong>
            <small>{(file.size / 1_000_000).toFixed(1)} MB &middot; tap to change</small>
          </span>
        ) : (
          <span>
            <strong>Record or choose a video</strong>
            <small>Camera, photo library, or files &middot; up to 120 MB</small>
          </span>
        )}
      </button>

      <div className="gw-swing-fields">
        <label>
          Club
          <select value={club} onChange={(event) => setClub(event.target.value)}>
            <option value="">Select&hellip;</option>
            {["Driver", "Fairway wood", "Hybrid", "Long iron", "Mid iron", "Short iron", "Wedge", "Putter"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Typical miss
          <input type="text" value={miss} placeholder="High slice" maxLength={80} onChange={(event) => setMiss(event.target.value)} />
        </label>
        <label>
          Handicap
          <input type="text" value={handicap} placeholder="Optional" maxLength={10} onChange={(event) => setHandicap(event.target.value)} />
        </label>
        <label>
          What are you trying to fix?
          <input type="text" value={goal} placeholder="Hit a more controlled fade" maxLength={120} onChange={(event) => setGoal(event.target.value)} />
        </label>
      </div>

      {!leadCaptured && !detailsSaved ? (
        <div className="gw-swing-contact">
          <p>Where should {coachFirst} send feedback?</p>
          <LeadCaptureForm controller={controller} compact onCaptured={() => setDetailsSaved(true)} />
        </div>
      ) : null}

      {error ? <p className="gw-error">{error}</p> : null}
      <button
        type="button"
        className="gw-button"
        disabled={busy || !file || (!leadCaptured && !detailsSaved)}
        onClick={() => void submit()}
      >
        {busy ? "Uploading\u2026" : `Send swing to ${coachFirst}`}
      </button>
      {!leadCaptured && !detailsSaved ? <small className="gw-hint">Save your contact details above so {coachFirst} can reply.</small> : null}
    </div>
  );
}
