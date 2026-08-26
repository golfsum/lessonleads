import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={compact ? "brand brand-compact" : "brand"} href="/" aria-label="LessonLeads home">
      {/* eslint-disable-next-line @next/next/no-img-element -- local brand lockup, not a remote CMS image */}
      <img alt="LessonLeads" className="brand-logo" src="/logo.jpg" />
    </Link>
  );
}
