-- Golf business expansion: organization types, locations, staff, course
-- leads, booking integrations, announcements, and knowledge metadata.
-- Existing coach workspaces stay golf_coach with lesson leads.

alter table public.organizations
  add column if not exists organization_type text not null default 'golf_coach',
  add column if not exists course_count integer,
  add column if not exists access_type text,
  add column if not exists conversion_goals jsonb not null default '["lesson_lead","lesson_booking"]'::jsonb;

alter table public.organizations
  drop constraint if exists organizations_type_check;
alter table public.organizations
  add constraint organizations_type_check check (organization_type in (
    'golf_coach', 'golf_academy', 'golf_course', 'golf_facility', 'golf_fitting_studio', 'golf_retailer'
  ));

alter table public.leads
  add column if not exists lead_type text not null default 'lesson',
  add column if not exists company text,
  add column if not exists event_date date,
  add column if not exists estimated_players integer,
  add column if not exists food_beverage text,
  add column if not exists membership_interest text,
  add column if not exists comments text;

alter table public.leads
  drop constraint if exists leads_type_check;
alter table public.leads
  add constraint leads_type_check check (lead_type in (
    'lesson', 'membership', 'tournament', 'corporate_event', 'wedding', 'group_outing',
    'junior_program', 'fitting', 'simulator', 'restaurant_event', 'general'
  ));

create index if not exists leads_org_type_idx on public.leads(organization_id, lead_type, created_at desc);

alter table public.knowledge_sources
  add column if not exists category text,
  add column if not exists volatility text not null default 'static';

alter table public.knowledge_chunks
  add column if not exists volatility text not null default 'static';

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  timezone text not null default 'America/Phoenix',
  phone text,
  website text,
  tee_time_provider text not null default 'none',
  booking_url text,
  external_facility_id text,
  latitude double precision,
  longitude double precision,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists locations_org_idx on public.locations(organization_id, sort_order);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  title text not null default '',
  bio text not null default '',
  specialties jsonb not null default '[]'::jsonb,
  profile_photo_url text,
  booking_url text,
  email text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists staff_members_org_idx on public.staff_members(organization_id, active, sort_order);

create table if not exists public.course_announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  message text not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  priority integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_announcements_org_idx on public.course_announcements(organization_id, active, priority desc);

create table if not exists public.booking_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  provider text not null,
  status text not null default 'not_connected',
  credentials_encrypted text,
  configuration jsonb not null default '{}'::jsonb,
  external_facility_id text,
  supports_search boolean not null default false,
  supports_direct_booking boolean not null default false,
  supports_booking_handoff boolean not null default true,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists booking_integrations_org_idx on public.booking_integrations(organization_id);
create unique index if not exists booking_integrations_org_provider_loc_idx
  on public.booking_integrations (organization_id, provider, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.tee_time_searches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  widget_id uuid references public.widgets(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  provider text not null,
  search_date date not null,
  players integer not null,
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tee_time_searches_org_idx on public.tee_time_searches(organization_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['locations','staff_members','course_announcements','booking_integrations','tee_time_searches'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))', table_name || '_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_org_admin(organization_id))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id))', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_org_admin(organization_id))', table_name || '_delete', table_name);
  end loop;
end $$;

revoke all on public.booking_integrations, public.tee_time_searches from anon;
