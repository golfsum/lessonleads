import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="auth-card">
      <div className="auth-card-heading"><h1>Reset your password</h1><p>Enter your account email and we will send the configured Supabase recovery link.</p></div>
      <form action="/api/auth/forgot" className="auth-form" method="post">
        <label>Email<input autoComplete="email" name="email" required type="email" /></label>
        <button className="button button-primary button-full" type="submit">Send recovery link</button>
      </form>
      <p className="auth-switch"><Link href="/login">Back to login</Link></p>
    </div>
  );
}
