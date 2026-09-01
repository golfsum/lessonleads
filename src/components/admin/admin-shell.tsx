"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Gauge, LogOut, MessageSquareText } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const navigation = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/clients", label: "Clients", icon: Building2 },
  { href: "/admin/tickets", label: "Tickets", icon: MessageSquareText },
] as const;

export function AdminShell({ children, name, email }: { children: React.ReactNode; name: string; email: string }) {
  const pathname = usePathname();
  const active = navigation.find((item) => item.href === pathname || (item.href !== "/admin" && pathname.startsWith(item.href)));
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo compact />
        <nav aria-label="Internal admin navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link className={pathname === href || (href !== "/admin" && pathname.startsWith(href)) ? "active" : ""} href={href} key={href}>
              <Icon size={16} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post"><button type="submit"><LogOut size={16} /><span>Log out</span></button></form>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span>{active?.label ?? "Admin"}</span>
          <div><strong>{name}</strong><small>{email}</small></div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
