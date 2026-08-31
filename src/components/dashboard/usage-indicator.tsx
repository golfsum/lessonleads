const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function UsageIndicator({ used, limit, resetAt }: { used: number; limit: number; resetAt: string }) {
  const resetDate = new Date(resetAt);
  const resetLabel = Number.isNaN(resetDate.getTime()) ? "next month" : dateFormat.format(resetDate);
  const percentage = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 100;
  return (
    <section className="usage-indicator" aria-label="AI conversation usage">
      <div className="usage-indicator-copy">
        <p className="eyebrow">AI Conversations</p>
        <strong>{used} / {limit}</strong>
        <small>Resets {resetLabel}</small>
      </div>
      <div className="usage-indicator-meter" aria-hidden="true">
        <i style={{ width: `${percentage}%` }} />
      </div>
    </section>
  );
}
