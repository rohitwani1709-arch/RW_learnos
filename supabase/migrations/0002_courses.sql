-- LearnOS Milestone 2a: courses, modules, lessons, enrollments, lesson progress
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  level text not null default 'beginner' check (level in ('beginner','intermediate','advanced')),
  subject text not null default 'general',
  language text not null default 'en',
  thumbnail_url text,
  prerequisites text[] not null default '{}',
  learning_objectives text[] not null default '{}',
  pass_threshold int not null default 70 check (pass_threshold between 1 and 100),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position int not null check (position > 0),
  unique (course_id, position)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  content_md text not null default '',
  estimated_minutes int not null default 10 check (estimated_minutes > 0),
  position int not null check (position > 0),
  unique (module_id, position),
  unique (course_id, slug)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index on public.course_modules (course_id);
create index on public.lessons (module_id);
create index on public.lessons (course_id);
create index on public.enrollments (course_id);

create trigger courses_touch before update on public.courses
  for each row execute function public.touch_updated_at();

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

-- Catalog: published courses are public; admins see everything.
create policy courses_read on public.courses for select to anon, authenticated
  using (status = 'published' or public.has_role('admin'));
create policy courses_admin_write on public.courses for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

create policy modules_read on public.course_modules for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy modules_admin_write on public.course_modules for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

create policy lessons_read on public.lessons for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy lessons_admin_write on public.lessons for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Enrollments: own rows only; can only enroll in published courses.
create policy enroll_read_own on public.enrollments for select to authenticated
  using (user_id = (select auth.uid()));
create policy enroll_insert_own on public.enrollments for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));

-- Progress: own rows only, and only for lessons in courses the user is enrolled in.
create policy progress_read_own on public.lesson_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy progress_insert_own on public.lesson_progress for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.lessons l
      join public.enrollments e on e.course_id = l.course_id and e.user_id = (select auth.uid())
      where l.id = lesson_id));
create policy progress_delete_own on public.lesson_progress for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.courses, public.course_modules, public.lessons to anon, authenticated;
grant select, insert on public.enrollments to authenticated;
grant select, insert, delete on public.lesson_progress to authenticated;
