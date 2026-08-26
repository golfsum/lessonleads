import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <header><Logo /><Link href="/">Back to site</Link></header>
      <div className="auth-stage">{children}</div>
    </main>
  );
}
