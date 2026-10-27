-- LearnOS Milestone 3a: Code Lab submission history
create table public.code_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null default 'python' check (language in ('python')),
  source_code text not null check (char_length(source_code) <= 20000),
  stdin text not null default '' check (char_length(stdin) <= 5000),
  status text not null,
  stdout text not null default '',
  stderr text not null default '',
  time_sec numeric,
  created_at timestamptz not null default now()
);
create index on public.code_submissions (user_id, created_at desc);

alter table public.code_submissions enable row level security;
create policy submissions_read_own on public.code_submissions for select to authenticated
  using (user_id = (select auth.uid()));
create policy submissions_insert_own on public.code_submissions for insert to authenticated
  with check (user_id = (select auth.uid()));
grant select, insert on public.code_submissions to authenticated;
