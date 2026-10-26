-- LearnOS Milestone 1: profiles, roles, audit log, RLS
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  learning_level text not null default 'beginner' check (learning_level in ('beginner','intermediate','advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','author')),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Role check used by policies. SECURITY DEFINER avoids RLS recursion on user_roles.
create or replace function public.has_role(check_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = check_role);
$$;
revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to authenticated;

-- Auto-create a profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data->>'display_name', 80), ''), split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: owner reads/updates own row; admins read all. No client inserts (trigger does it).
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.has_role('admin'));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- user_roles: users may see their own roles; NO insert/update/delete policies,
-- so roles can only be changed via SQL editor / service role.
create policy roles_select_own on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('admin'));

-- audit_logs: admins read only; writes happen server-side with privileged client.
create policy audit_select_admin on public.audit_logs for select to authenticated
  using (public.has_role('admin'));
