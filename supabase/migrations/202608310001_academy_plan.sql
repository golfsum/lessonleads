-- Add Academy as the coach/academy plan. Existing subscriptions keep their
-- current plan and Stripe subscription; this only extends the enum so new
-- Academy checkouts can sync safely.
alter type public.subscription_plan add value if not exists 'academy';
