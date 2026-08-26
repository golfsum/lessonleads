-- Add Solo as the working paid plan between Free and Pro.
alter type public.subscription_plan add value if not exists 'solo';

alter table public.conversations
  add column if not exists preview boolean not null default false;
