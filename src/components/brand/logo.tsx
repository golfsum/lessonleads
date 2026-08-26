import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="LessonLeads home">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-flag" />
        <span className="brand-cup" />
      </span>
      <span className="brand-copy">
        <strong>LessonLeads</strong>
        {!compact ? <small>More lessons. Better players.</small> : null}
      </span>
    </Link>
  );
}
