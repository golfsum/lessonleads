import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/session";
import "./admin.css";

export const metadata: Metadata = { title: "Internal admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell email={admin.email} name={admin.name}>{children}</AdminShell>;
}
