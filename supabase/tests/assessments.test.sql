-- Run after migrations 0001, 0002, 0004 on the local stub. Aborts on the first failure.
\set ON_ERROR_STOP on
create function pg_temp.check_that(ok boolean, msg text) returns void language plpgsql as $$
begin if ok then raise notice 'PASS: %', msg; else raise exception 'FAIL: %', msg; end if; end $$;
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, true); execute 'set local role authenticated'; end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon'; end $$;
create function pg_temp.fails_with(stmt text, expect text) returns boolean language plpgsql as $$
begin execute stmt; return false;
exception when others then return position(expect in sqlerrm) > 0; end $$;

-- fixtures (as superuser)
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a', 'a@test'), ('00000000-0000-0000-0000-00000000000b', 'b@test'),
 ('00000000-0000-0000-0000-0000000000ad', 'admin@test');
insert into public.user_roles values ('00000000-0000-0000-0000-0000000000ad', 'admin');
insert into public.courses (id, slug, title, status) values
 ('10000000-0000-0000-0000-000000000001', 'pub', 'Published', 'published'),
 ('10000000-0000-0000-0000-000000000002', 'draft', 'Draft', 'draft');
insert into public.enrollments (user_id, course_id) values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001');
insert into public.assessments (id, course_id, title, pass_threshold, max_attempts) values
 ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Quiz', 60, null),
 ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'One try', 50, 1),
 ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Draft quiz', 50, null);
insert into public.assessment_questions (id, assessment_id, position, type, prompt, options, points) values
 ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 'mcq', 'Q1', '["x","y","z"]', 1),
 ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 2, 'mcq', 'Q2', '["x","y"]', 1),
 ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 3, 'short', 'Q3', null, 2),
 ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 1, 'mcq', 'Q4', '["x","y"]', 1),
 ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 1, 'mcq', 'Q5', '["x","y"]', 1);
insert into public.assessment_answer_keys (question_id, correct_option, accepted_answers, explanation) values
 ('30000000-0000-0000-0000-000000000001', 2, '{}', 'because z'),
 ('30000000-0000-0000-0000-000000000002', 0, '{}', 'because x'),
 ('30000000-0000-0000-0000-000000000003', null, '{"Return Value","return-value"}', 'it is return value'),
 ('30000000-0000-0000-0000-000000000004', 1, '{}', 'because y'),
 ('30000000-0000-0000-0000-000000000005', 1, '{}', 'because y');

begin;  -- 1. students cannot see answer keys; they can see questions without keys
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check_that((select count(*) from public.assessment_answer_keys) = 0, 'student sees 0 answer keys');
select pg_temp.check_that((select count(*) from public.assessment_questions) >= 3, 'student can read question text');
select pg_temp.check_that(pg_temp.fails_with($s$insert into public.assessment_answer_keys values ('30000000-0000-0000-0000-000000000001', 0, '{}', '')$s$, 'row-level security'), 'student cannot write answer keys');
select pg_temp.check_that(pg_temp.fails_with($s$insert into public.assessment_questions (assessment_id, position, type, prompt, options) values ('20000000-0000-0000-0000-000000000001', 9, 'mcq', 'hack', '["a","b"]')$s$, 'row-level security'), 'student cannot add questions');
select pg_temp.check_that(pg_temp.fails_with($s$insert into public.assessment_attempts (user_id, assessment_id, passed) values ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', true)$s$, 'permission denied'), 'student cannot insert a fake attempt (no INSERT privilege)');
rollback;

begin;  -- 2. perfect score passes; answers recorded with feedback
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table r1 as select public.submit_assessment('20000000-0000-0000-0000-000000000001',
  '{"30000000-0000-0000-0000-000000000001":"2","30000000-0000-0000-0000-000000000002":0,"30000000-0000-0000-0000-000000000003":"  RETURN   value "}'::jsonb) as id;
select pg_temp.check_that((select score_percent from public.assessment_attempts where id = (select id from r1)) = 100, 'perfect answers score 100');
select pg_temp.check_that((select passed from public.assessment_attempts where id = (select id from r1)), 'perfect answers pass');
select pg_temp.check_that((select count(*) from public.assessment_answers where attempt_id = (select id from r1) and is_correct) = 3, 'all three answers correct (short answer normalised)');
select pg_temp.check_that((select answer from public.assessment_answers where question_id = '30000000-0000-0000-0000-000000000001' and attempt_id = (select id from r1)) = 'z', 'mcq answer stored as option text');
select pg_temp.check_that((select feedback from public.assessment_answers where question_id = '30000000-0000-0000-0000-000000000003' and attempt_id = (select id from r1)) = 'it is return value', 'feedback returned after submission');
rollback;

begin;  -- 3. weighted scoring and threshold: Q3 (2 points) wrong => 2/4 = 50 < 60 => not passed
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table r2 as select public.submit_assessment('20000000-0000-0000-0000-000000000001',
  '{"30000000-0000-0000-0000-000000000001":2,"30000000-0000-0000-0000-000000000002":0,"30000000-0000-0000-0000-000000000003":"nope"}'::jsonb) as id;
select pg_temp.check_that((select points_earned || '/' || points_possible from public.assessment_attempts where id = (select id from r2)) = '2/4', 'points are weighted');
select pg_temp.check_that(not (select passed from public.assessment_attempts where id = (select id from r2)), '50 percent fails a 60 percent threshold');
rollback;

begin;  -- 4. bad input is scored wrong, never crashes; empty answers allowed
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table r3 as select public.submit_assessment('20000000-0000-0000-0000-000000000001',
  '{"30000000-0000-0000-0000-000000000001":99,"30000000-0000-0000-0000-000000000002":"abc","30000000-0000-0000-0000-000000000003":["return value"]}'::jsonb) as id;
select pg_temp.check_that((select points_earned from public.assessment_attempts where id = (select id from r3)) = 0, 'out-of-range, non-numeric and array answers score 0');
create temp table r4 as select public.submit_assessment('20000000-0000-0000-0000-000000000001', '{}'::jsonb) as id;
select pg_temp.check_that((select score_percent from public.assessment_attempts where id = (select id from r4)) = 0, 'no answers scores 0');
select pg_temp.check_that(pg_temp.fails_with($s$select public.submit_assessment('20000000-0000-0000-0000-000000000001', '[1,2]'::jsonb)$s$, 'invalid_answers'), 'non-object answers rejected');
select pg_temp.check_that(pg_temp.fails_with($s$select public.submit_assessment('20000000-0000-0000-0000-000000000001', null)$s$, 'invalid_answers'), 'null answers rejected');
rollback;

begin;  -- 5. eligibility
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check_that(pg_temp.fails_with($s$select public.submit_assessment('20000000-0000-0000-0000-000000000001', '{}'::jsonb)$s$, 'not_enrolled'), 'non-enrolled user cannot submit');
rollback;
begin;
select pg_temp.as_anon();
select pg_temp.check_that(pg_temp.fails_with($s$select public.submit_assessment('20000000-0000-0000-0000-000000000001', '{}'::jsonb)$s$, 'permission denied'), 'anonymous user cannot call the function');
rollback;
begin;  -- draft course: enrolled via fixture insert, still not gradable
insert into public.enrollments (user_id, course_id) values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000002');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check_that(pg_temp.fails_with($s$select public.submit_assessment('20000000-0000-0000-0000-000000000003', '{}'::jsonb)$s$, 'not_found'), 'assessment of an unpublished course is not available');
select pg_temp.check_that((select count(*) from public.assessments where id = '20000000-0000-0000-0000-000000000003') = 0, 'student cannot see draft-course assessments');
rollback;

begin;  -- 6. attempt limit
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.submit_assessment('20000000-0000-0000-0000-000000000002', '{"30000000-0000-0000-0000-000000000004":1}'::jsonb);
select pg_temp.check_that(pg_temp.fails_with($s$select public.submit_assessment('20000000-0000-0000-0000-000000000002', '{}'::jsonb)$s$, 'attempts_exhausted'), 'second attempt blocked at max_attempts = 1');
select pg_temp.check_that((select count(*) from public.assessment_attempts where assessment_id = '20000000-0000-0000-0000-000000000002') = 1, 'failed submission leaves no partial attempt');
rollback;

begin;  -- 7. privacy between users, admin visibility
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.submit_assessment('20000000-0000-0000-0000-000000000001', '{}'::jsonb);
select pg_temp.check_that((select count(*) from public.assessment_attempts) = 1, 'owner sees own attempt');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check_that((select count(*) from public.assessment_attempts) = 0, 'other student sees no attempts');
select pg_temp.check_that((select count(*) from public.assessment_answers) = 0, 'other student sees no answers');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.check_that((select count(*) from public.assessment_attempts) = 1, 'admin sees all attempts');
select pg_temp.check_that((select count(*) from public.assessment_answer_keys) = 5, 'admin can read answer keys');
rollback;

begin;  -- 8. signed-out visitors can still browse the catalog (policy calls has_role)
select pg_temp.as_anon();
select pg_temp.check_that((select count(*) from public.courses) = 1, 'anon sees only the published course');
rollback;
\echo ALL ASSESSMENT TESTS PASSED
