"use client";

import { useState } from "react";
import { plans, type PlanId } from "@/lib/billing/plans";

export function CheckoutButton({
  currentPlan,
  targetPlan = "solo",
  label,
}: {
  currentPlan: string;
  targetPlan?: "solo" | "pro";
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const paid = currentPlan === "solo" || currentPlan === "pro";
  const managing = paid && (targetPlan === currentPlan || currentPlan === "pro");

  async function open() {
    setPending(true);
    setError("");
    const response = await fetch(managing ? "/api/stripe/portal" : "/api/stripe/checkout", {
      method: "POST",
      headers: managing ? undefined : { "content-type": "application/json" },
      body: managing ? undefined : JSON.stringify({ plan: targetPlan }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(body.error ?? "Billing is not configured.");
      return;
    }
    window.location.assign(body.url);
  }

  const defaultLabel = managing
    ? "Manage billing"
    : `Upgrade to ${plans[targetPlan as PlanId].name} · ${plans[targetPlan as PlanId].priceLabel}/mo`;

  return (
    <div>
      <button className="button button-primary" disabled={pending} onClick={() => void open()} type="button">
        {pending ? "Opening..." : label ?? defaultLabel}
      </button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
