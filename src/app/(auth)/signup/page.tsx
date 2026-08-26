import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getViewer } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/store";

export const metadata: Metadata = { title: "Start free", robots: { index: false, follow: false } };

export default async function SignupPage() {
  if (await getViewer()) redirect("/dashboard");
  return <AuthForm demoMode={isDemoMode()} mode="signup" />;
}
