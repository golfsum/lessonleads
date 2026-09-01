-- Internal operations foundation: protect billing state, persist first-party
-- platform analytics, and provide a tenant-safe support ticket store.

-- Stripe webhooks and server-side billing sync are the only writers of
-- subscription state. Organization admins may read their subscription, but
-- must not be able to grant themselves a paid plan through the public API.
drop policy if exists subscriptions_insert on public.subscriptions;
drop policy if exists subscriptions_update on public.subscriptions;
drop policy if exists subscriptions_delete on public.subscriptions;
revoke insert, update, delete on public.subscriptions from authenticated;
grant select on public.subscriptions to authenticated;

-- Durable first-party events for the LessonLeads marketing site and product
-- lifecycle. Public routes validate and write these with the service role;
-- browser clients never receive direct table access.
create table public.platform_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null
    check (char_length(event_name) between 2 and 64 and event_name ~ '^[a-z][a-z0-9_]*$'),
  visitor_id text not null check (char_length(visitor_id) between 8 and 160),
  session_id text not null check (char_length(session_id) between 8 and 160),
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  path text check (path is null or char_length(path) <= 500),
  referrer text check (referrer is null or char_length(referrer) <= 1000),
  properties jsonb not null default '{}'::jsonb
    check (jsonb_typeof(properties) = 'object'),
  idempotency_key text unique
    check (idempotency_key is null or char_length(idempotency_key) between 8 and 200),
  occurred_at timestamptz not null default now()
);
create index platform_events_name_time_idx
  on public.platform_events(event_name, occurred_at desc);
create index platform_events_org_time_idx
  on public.platform_events(organization_id, occurred_at desc)
  where organization_id is not null;
create index platform_events_visitor_time_idx
  on public.platform_events(visitor_id, occurred_at desc);

alter table public.platform_events enable row level security;
revoke all on public.platform_events from anon, authenticated;
grant select, insert, update, delete on public.platform_events to service_role;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  subject text not null check (char_length(trim(subject)) between 3 and 160),
  category text not null default 'general'
    check (category in ('general', 'billing', 'installation', 'widget', 'account', 'bug', 'feature_request')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (resolved_at is null or resolved_at >= created_at)
);
create index support_tickets_org_updated_idx
  on public.support_tickets(organization_id, updated_at desc, id desc);
create index support_tickets_queue_idx
  on public.support_tickets(status, priority, updated_at, id)
  where status not in ('resolved', 'closed');

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_type text not null check (sender_type in ('customer', 'admin', 'system')),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index support_ticket_messages_ticket_time_idx
  on public.support_ticket_messages(ticket_id, created_at desc, id desc);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
revoke all on public.support_tickets, public.support_ticket_messages from anon, authenticated;

-- Customers can create a ticket with server-controlled defaults and read the
-- tickets for their own organization. Status, priority, assignment, and
-- resolution changes remain server/admin operations.
grant select on public.support_tickets to authenticated;
grant insert (organization_id, created_by, subject, category)
  on public.support_tickets to authenticated;
grant usage, select on sequence public.support_tickets_ticket_number_seq to authenticated;

create policy support_tickets_select on public.support_tickets
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy support_tickets_insert on public.support_tickets
  for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
    and priority = 'normal'
    and status = 'open'
    and assigned_to is null
    and resolved_at is null
  );

-- Customers can read non-internal messages and add plain customer replies to
-- active tickets in their own organization. Internal notes and admin/system
-- authorship are service-role only.
grant select on public.support_ticket_messages to authenticated;
grant insert (ticket_id, sender_user_id, sender_type, body)
  on public.support_ticket_messages to authenticated;

create policy support_ticket_messages_select on public.support_ticket_messages
  for select to authenticated
  using (
    not internal
    and exists (
      select 1
      from public.support_tickets ticket
      where ticket.id = ticket_id
        and public.is_org_member(ticket.organization_id)
    )
  );

create policy support_ticket_messages_insert on public.support_ticket_messages
  for insert to authenticated
  with check (
    not internal
    and sender_type = 'customer'
    and sender_user_id = (select auth.uid())
    and exists (
      select 1
      from public.support_tickets ticket
      where ticket.id = ticket_id
        and ticket.status not in ('resolved', 'closed')
        and public.is_org_member(ticket.organization_id)
    )
  );

grant select, insert, update, delete on public.support_tickets, public.support_ticket_messages to service_role;
grant usage, select on sequence public.support_tickets_ticket_number_seq to service_role;

create or replace function public.touch_support_ticket_from_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_tickets
  set
    updated_at = greatest(updated_at, new.created_at),
    status = case
      when new.sender_type = 'customer' and status = 'waiting_on_customer' then 'open'
      else status
    end
  where id = new.ticket_id;
  return new;
end;
$$;

revoke all on function public.touch_support_ticket_from_message() from public, anon, authenticated;
grant execute on function public.touch_support_ticket_from_message() to service_role;

create trigger support_ticket_message_touch_ticket
  after insert on public.support_ticket_messages
  for each row execute function public.touch_support_ticket_from_message();
