"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Clapperboard,
  Code2,
  Gauge,
  Inbox,
  Library,
  LogOut,
  MessagesSquare,
  Plug,
  Settings,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { isPlanId, plans } from "@/lib/billing/plans";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/dashboard/leads", label: "Leads", icon: Inbox },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/dashboard/swings", label: "Swing Uploads", icon: Clapperboard },
  { href: "/dashboard/services", label: "Services", icon: BookOpen },
  { href: "/dashboard/content", label: "Content", icon: Video },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: Library },
  { href: "/dashboard/widget", label: "Widget", icon: SlidersHorizontal },
  { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/install", label: "Install", icon: Code2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell({ children, coachName, plan, demo }: { children: React.ReactNode; coachName: string; plan: string; demo: boolean }) {
  const pathname = usePathname();
  const active = navigation.find((item) => item.href === pathname || (item.href !== "/dashboard" && pathname.startsWith(item.href)));
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo"><Logo compact /></div>
        <nav aria-label="Workspace navigation">
          {navigation.map(({ href, label, icon: Icon }) => <Link className={pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) ? "active" : ""} href={href} key={href}><Icon size={16} /><span>{label}</span></Link>)}
        </nav>
        <form action="/api/auth/logout" method="post"><button type="submit"><LogOut size={16} /> Log out</button></form>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div><span>{active?.label ?? "Workspace"}</span>{demo ? <small>Demo data</small> : null}</div>
          <div className="dashboard-account"><span>{coachName}</span><small>{isPlanId(plan) ? plans[plan].name : plan} plan</small></div>
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
