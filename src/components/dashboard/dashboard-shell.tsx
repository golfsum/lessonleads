"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Clapperboard,
  Code2,
  Flag,
  Gauge,
  Inbox,
  Library,
  LifeBuoy,
  LogOut,
  MessagesSquare,
  Plug,
  Settings,
  SlidersHorizontal,
  Users,
  Video,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { isPlanId, plans } from "@/lib/billing/plans";
import { isCourseLike } from "@/lib/domain/organization";
import type { OrganizationType } from "@/lib/domain/types";

export function DashboardShell({
  children,
  coachName,
  plan,
  demo,
  organizationType = "golf_coach",
}: {
  children: React.ReactNode;
  coachName: string;
  plan: string;
  demo: boolean;
  organizationType?: OrganizationType;
}) {
  const pathname = usePathname();
  const course = isCourseLike(organizationType);
  const navigation = course
    ? [
        { href: "/dashboard", label: "Overview", icon: Gauge },
        { href: "/dashboard/conversations", label: "Conversations", icon: MessagesSquare },
        { href: "/dashboard/leads", label: "Leads", icon: Inbox },
        { href: "/dashboard/tee-times", label: "Tee Times", icon: Flag },
        { href: "/dashboard/services", label: "Services", icon: BookOpen },
        { href: "/dashboard/staff", label: "Golf Staff", icon: Users },
        { href: "/dashboard/knowledge", label: "Knowledge", icon: Library },
        { href: "/dashboard/widget", label: "Widget", icon: SlidersHorizontal },
        { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
        { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/dashboard/install", label: "Install", icon: Code2 },
        { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
      ]
    : [
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
        { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
      ];
  const active = navigation.find((item) => item.href === pathname || (item.href !== "/dashboard" && pathname.startsWith(item.href)));
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo"><Logo compact /></div>
        <nav aria-label="Workspace navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link className={pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) ? "active" : ""} href={href as Route} key={href}>
              <Icon size={16} /><span>{label}</span>
            </Link>
          ))}
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
