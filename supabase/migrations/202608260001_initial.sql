create extension if not exists pgcrypto;

create type public.organization_role as enum ('owner', 'admin', 'member');
create type public.widget_status as enum ('draft', 'active', 'disabled');
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'booking_sent', 'booked', 'won', 'lost');
create type public.subscription_plan as enum ('free', 'solo', 'pro');
create type public.subscription_status as enum ('free', 'active', 'trialing', 'past_due', 'canceled');
create type public.website_scan_status as enum ('never', 'scanning', 'scanned', 'error');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members(user_id);

create table public.coach_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  business_name text not null,
  email text not null,
  phone text,
  website text,
  location text not null default '',
  timezone text not null default 'America/Phoenix',
  title text not null default 'Golf Instructor',
  credentials jsonb not null default '[]'::jsonb,
  bio text not null default '',
  philosophy text not null default '',
  teaching_focus jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  booking_provider text not null default 'none',
  booking_url text not null default '',
  profile_photo_url text,
  notification_prefs jsonb not null default '{"newLead":true,"highIntentLead":true,"swingUpload":true,"bookingClick":true,"everyConversation":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coach_profiles_org_idx on public.coach_profiles(organization_id);

create table public.websites (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  url text,
  scan_status public.website_scan_status not null default 'never',
  last_scan_at timestamptz,
  pages_found integer not null default 0,
  error text
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  price_cents integer check (price_cents is null or price_cents >= 0),
  price_label text,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 5 and 1440),
  mode text not null default 'in_person',
  location text,
  image_url text,
  booking_url text,
  cta_label text,
  featured boolean not null default false,
  best_for jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index services_org_active_idx on public.services(organization_id, active);

create table public.widgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  public_id text not null unique,
  name text not null,
  slug text not null unique,
  status public.widget_status not null default 'draft',
  allowed_origins jsonb not null default '[]'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  menu jsonb not null default '[]'::jsonb,
  default_section_key text not null default 'ask',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index widgets_org_idx on public.widgets(organization_id);
create index widgets_public_idx on public.widgets(public_id) where status = 'active';

create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  type text not null,
  title text not null,
  url text,
  status text not null default 'pending',
  include_in_ai boolean not null default true,
  last_synced_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index knowledge_sources_org_idx on public.knowledge_sources(organization_id);
create index knowledge_sources_url_idx on public.knowledge_sources(organization_id, url);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  source_type text not null,
  title text not null,
  url text,
  category text,
  content text not null,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);
create index knowledge_chunks_org_source_idx on public.knowledge_chunks(organization_id, source_id);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid references public.knowledge_sources(id) on delete set null,
  question text not null,
  answer text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0
);
create index faqs_org_idx on public.faqs(organization_id, sort_order);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  type text not null,
  title text not null,
  description text,
  url text not null,
  thumbnail_url text,
  categories jsonb not null default '[]'::jsonb,
  transcript_available boolean not null default false,
  include_in_ai boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index content_items_org_idx on public.content_items(organization_id, active);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  widget_id uuid not null references public.widgets(id) on delete cascade,
  visitor_id text not null,
  session_id text not null,
  lead_id uuid,
  messages jsonb not null default '[]'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  intent_score integer not null default 0,
  intent_level text not null default 'low',
  recommended_service_id uuid references public.services(id) on delete set null,
  summary text,
  page text,
  referrer text,
  utm jsonb,
  device text,
  preview boolean not null default false,
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index conversations_org_idx on public.conversations(organization_id, last_message_at desc);
create index conversations_widget_visitor_idx on public.conversations(widget_id, visitor_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  widget_id uuid not null references public.widgets(id) on delete restrict,
  conversation_id uuid references public.conversations(id) on delete set null,
  visitor_id text not null,
  first_name text not null,
  last_name text,
  email text not null,
  phone text,
  consent boolean not null default false,
  sms_consent boolean not null default false,
  preferred_contact text,
  status public.lead_status not null default 'new',
  intent_score integer not null default 0,
  intent_level text not null default 'low',
  interest text,
  source text not null,
  session_id text not null,
  idempotency_key text not null unique,
  booking_token_hash text not null unique,
  booking_clicked_at timestamptz,
  recommended_service_id uuid references public.services(id) on delete set null,
  summary text,
  notes text,
  landing_page text,
  referrer text,
  utm jsonb,
  activity jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_org_created_idx on public.leads(organization_id, created_at desc);
create index leads_widget_created_idx on public.leads(widget_id, created_at desc);

alter table public.conversations
  add constraint conversations_lead_fk foreign key (lead_id) references public.leads(id) on delete set null;

create table public.swing_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  widget_id uuid not null references public.widgets(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  visitor_id text not null,
  file_name text not null,
  file_path text not null,
  mime_type text not null,
  size_bytes integer not null,
  club text,
  typical_miss text,
  handicap text,
  goal text,
  created_at timestamptz not null default now()
);
create index swing_uploads_org_idx on public.swing_uploads(organization_id, created_at desc);

create table public.widget_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  widget_id uuid not null references public.widgets(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  event_name text not null,
  session_id text not null,
  occurred_at timestamptz not null default now(),
  properties jsonb
);
create index widget_events_org_idx on public.widget_events(organization_id, occurred_at desc);
create index widget_events_widget_session_idx on public.widget_events(widget_id, event_name, session_id);

create table public.subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  status public.subscription_status not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_org_member(requested_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = requested_org and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_org_admin(requested_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = requested_org and user_id = (select auth.uid()) and role in ('owner', 'admin')
  );
$$;

create or replace function public.slugify(input text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  full_name text := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1), 'Coach');
  first_name text := split_part(full_name, ' ', 1);
  org_slug text;
  widget_slug text;
  public_id text := substr(pg_catalog.md5(pg_catalog.random()::text || clock_timestamp()::text), 1, 10);
  org_id uuid;
  coach_id uuid;
begin
  org_slug := public.slugify(full_name);
  if org_slug is null or org_slug = '' then org_slug := 'coach'; end if;
  org_slug := left(org_slug, 40) || '-' || substr(public_id, 1, 6);
  widget_slug := org_slug;

  insert into public.organizations (name, slug) values (left(full_name || ' Coaching', 120), org_slug) returning id into org_id;
  insert into public.organization_members (organization_id, user_id, role) values (org_id, new.id, 'owner');
  insert into public.coach_profiles (organization_id, user_id, name, business_name, email)
    values (org_id, new.id, full_name, left(full_name || ' Golf', 120), coalesce(new.email, ''))
    returning id into coach_id;
  insert into public.websites (organization_id) values (org_id);
  insert into public.subscriptions (organization_id) values (org_id);
  insert into public.widgets (
    organization_id, coach_id, public_id, name, slug, status, theme, menu
  ) values (
    org_id,
    coach_id,
    public_id,
    full_name || ' Widget',
    widget_slug,
    'draft',
    jsonb_build_object(
      'assistantName', 'Ask ' || first_name,
      'welcomeMessage', 'Hey, I''m ' || first_name || '''s coaching assistant. Tell me what you''re struggling with and I''ll point you in the right direction.',
      'launcherText', 'Ask Coach ' || first_name,
      'launcherIcon', 'golf',
      'position', 'bottom_right',
      'size', 'standard',
      'primaryColor', '#1b552c',
      'accentColor', '#c8a24a',
      'backgroundColor', '#faf8f3',
      'textColor', '#182420',
      'buttonColor', '#1b552c',
      'borderRadius', 14,
      'appearance', 'light',
      'suggestedQuestions', jsonb_build_array(
        'Why do I slice my driver?',
        'Which lesson is right for me?',
        'Do you offer online coaching?',
        'Can I upload my swing?'
      )
    ),
    jsonb_build_array(
      jsonb_build_object('id', 'menu_ask', 'key', 'ask', 'title', 'Ask ' || first_name, 'icon', 'chat', 'enabled', true, 'sortOrder', 0),
      jsonb_build_object('id', 'menu_lessons', 'key', 'lessons', 'title', 'Lessons', 'icon', 'flag', 'enabled', true, 'sortOrder', 1),
      jsonb_build_object('id', 'menu_videos', 'key', 'videos', 'title', 'Videos', 'icon', 'video', 'enabled', true, 'sortOrder', 2),
      jsonb_build_object('id', 'menu_swing', 'key', 'swing', 'title', 'Upload Swing', 'icon', 'upload', 'enabled', true, 'sortOrder', 3),
      jsonb_build_object('id', 'menu_coach', 'key', 'coach', 'title', 'About ' || first_name, 'icon', 'person', 'enabled', true, 'sortOrder', 4),
      jsonb_build_object('id', 'menu_faq', 'key', 'faq', 'title', 'FAQ', 'icon', 'question', 'enabled', false, 'sortOrder', 5),
      jsonb_build_object('id', 'menu_contact', 'key', 'contact', 'title', 'Contact', 'icon', 'mail', 'enabled', false, 'sortOrder', 6)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'organizations','organization_members','coach_profiles','websites','services','widgets',
    'knowledge_sources','knowledge_chunks','faqs','content_items','conversations','leads',
    'swing_uploads','widget_events','subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.leads, public.conversations, public.swing_uploads, public.widget_events, public.knowledge_chunks from anon;

create policy organizations_select on public.organizations for select to authenticated using (public.is_org_member(id));
create policy organizations_update on public.organizations for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy organization_members_select on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
create policy organization_members_manage on public.organization_members for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'coach_profiles','websites','services','widgets','knowledge_sources','knowledge_chunks','faqs',
    'content_items','conversations','leads','swing_uploads','widget_events','subscriptions'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))', table_name || '_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_org_admin(organization_id))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id))', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_org_admin(organization_id))', table_name || '_delete', table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'swing-uploads',
  'swing-uploads',
  false,
  125829120,
  array['video/mp4','video/quicktime','video/webm','video/x-m4v','video/3gpp']
)
on conflict (id) do nothing;
