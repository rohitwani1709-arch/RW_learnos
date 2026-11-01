-- LearnOS Milestone 5a: assessments with server-side grading.
-- Answer keys live in their own admin-only table. Students submit through submit_assessment(),
-- a SECURITY DEFINER function that grades inside the database, so no secret key is needed in the app.

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  kind text not null default 'module_quiz' check (kind in ('lesson_check','module_quiz','final')),
  pass_threshold int not null default 70 check (pass_threshold between 1 and 100),
  max_attempts int check (max_attempts is null or max_attempts > 0),
  created_at timestamptz not null default now(),
  unique (course_id, title)
);

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  position int not null check (position > 0),
  type text not null check (type in ('mcq','short')),
  prompt text not null check (char_length(prompt) between 1 and 2000),
  options jsonb,
  points int not null default 1 check (points > 0),
  unique (assessment_id, position),
  check (
    (type = 'mcq' and jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6)
    or (type = 'short' and options is null)
  )
);

create table public.assessment_answer_keys (
  question_id uuid primary key references public.assessment_questions(id) on delete cascade,
  correct_option int check (correct_option is null or correct_option >= 0),
  accepted_answers text[] not null default '{}',
  explanation text not null default '',
  check (correct_option is not null or cardinality(accepted_answers) > 0)
);

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  points_earned int not null default 0,
  points_possible int not null default 0,
  score_percent numeric(5,2) not null default 0,
  passed boolean not null default false,
  submitted_at timestamptz not null default now()
);
create index on public.assessment_attempts (user_id, assessment_id, submitted_at desc);

create table public.assessment_answers (
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  answer text not null default '',
  is_correct boolean not null,
  feedback text not null default '',
  primary key (attempt_id, question_id)
);

alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_answer_keys enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_answers enable row level security;

-- Visible only when the parent course is visible (published, or admin).
create policy assessments_read on public.assessments for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));
create policy assessments_admin on public.assessments for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

create policy questions_read on public.assessment_questions for select to authenticated
  using (exists (select 1 from public.assessments a where a.id = assessment_id));
create policy questions_admin on public.assessment_questions for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Answer keys: admins only. Students and anonymous users get no rows.
create policy keys_admin on public.assessment_answer_keys for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Attempts and answers: owners read their own, admins read all. Nobody inserts directly.
create policy attempts_read on public.assessment_attempts for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('admin'));
create policy answers_read on public.assessment_answers for select to authenticated
  using (exists (select 1 from public.assessment_attempts t
    where t.id = attempt_id and (t.user_id = (select auth.uid()) or public.has_role('admin'))));

-- Explicit privileges, so protection never depends on a project's default grants.
revoke all on public.assessments, public.assessment_questions, public.assessment_answer_keys,
  public.assessment_attempts, public.assessment_answers from anon, authenticated;
grant select on public.assessments, public.assessment_questions, public.assessment_attempts, public.assessment_answers to authenticated;
grant select, insert, update, delete on public.assessment_answer_keys to authenticated; -- RLS still limits this to admins
grant insert, update, delete on public.assessments, public.assessment_questions to authenticated; -- RLS limits to admins

-- Policies on courses call has_role(); signed-out visitors evaluate them too, so allow execution.
grant execute on function public.has_role(text) to anon;

create or replace function public.submit_assessment(p_assessment_id uuid, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_assessment public.assessments%rowtype;
  v_attempt uuid := gen_random_uuid();
  v_used int;
  v_possible int := 0;
  v_earned int := 0;
  v_percent numeric(5,2);
  q record;
  v_given jsonb;
  v_text text;
  v_norm text;
  v_ok boolean;
  v_shown text;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'invalid_answers' using errcode = '22023';
  end if;

  select a.* into v_assessment
  from public.assessments a join public.courses c on c.id = a.course_id
  where a.id = p_assessment_id and c.status = 'published';
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  if not exists (select 1 from public.enrollments e where e.user_id = v_user and e.course_id = v_assessment.course_id) then
    raise exception 'not_enrolled' using errcode = '42501';
  end if;

  -- One submission at a time per user and assessment, so parallel requests cannot exceed the attempt limit.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || p_assessment_id::text, 0));
  select count(*) into v_used from public.assessment_attempts where user_id = v_user and assessment_id = p_assessment_id;
  if v_assessment.max_attempts is not null and v_used >= v_assessment.max_attempts then
    raise exception 'attempts_exhausted' using errcode = '53400';
  end if;

  insert into public.assessment_attempts (id, user_id, assessment_id) values (v_attempt, v_user, p_assessment_id);

  for q in
    select qu.id, qu.type, qu.options, qu.points, k.correct_option, k.accepted_answers, k.explanation
    from public.assessment_questions qu
    join public.assessment_answer_keys k on k.question_id = qu.id
    where qu.assessment_id = p_assessment_id
    order by qu.position
  loop
    v_possible := v_possible + q.points;
    v_given := p_answers -> q.id::text;
    v_text := case when jsonb_typeof(v_given) in ('string', 'number') then left(v_given #>> '{}', 200) else null end;
    v_ok := false;
    v_shown := '';

    if q.type = 'mcq' then
      if v_text ~ '^[0-9]{1,2}$' and v_text::int < jsonb_array_length(q.options) then
        v_shown := q.options ->> v_text::int;
        v_ok := (v_text::int = q.correct_option);
      end if;
    else
      v_shown := coalesce(v_text, '');
      v_norm := lower(btrim(regexp_replace(v_shown, '\s+', ' ', 'g')));
      v_ok := v_norm <> '' and exists (
        select 1 from unnest(q.accepted_answers) a
        where lower(btrim(regexp_replace(a, '\s+', ' ', 'g'))) = v_norm);
    end if;

    if v_ok then v_earned := v_earned + q.points; end if;
    insert into public.assessment_answers (attempt_id, question_id, answer, is_correct, feedback)
    values (v_attempt, q.id, v_shown, v_ok, q.explanation);
  end loop;

  if v_possible = 0 then raise exception 'empty_assessment' using errcode = '22023'; end if;

  v_percent := round(100.0 * v_earned / v_possible, 2);
  update public.assessment_attempts
  set points_earned = v_earned, points_possible = v_possible, score_percent = v_percent,
      passed = (v_percent >= v_assessment.pass_threshold)
  where id = v_attempt;

  return v_attempt;
end;
$$;

revoke all on function public.submit_assessment(uuid, jsonb) from public, anon;
grant execute on function public.submit_assessment(uuid, jsonb) to authenticated;
