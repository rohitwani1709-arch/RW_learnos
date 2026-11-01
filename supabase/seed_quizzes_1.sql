-- SAMPLE CONTENT: two quizzes (DSA module 2, System Design module 2). Safe to re-run.
create function pg_temp.add_q(p_assessment uuid, p_pos int, p_type text, p_prompt text, p_options jsonb, p_correct int, p_accepted text[], p_expl text)
returns void language plpgsql as $$
declare v_q uuid;
begin
  insert into public.assessment_questions (assessment_id, position, type, prompt, options)
  values (p_assessment, p_pos, p_type, p_prompt, p_options) returning id into v_q;
  insert into public.assessment_answer_keys (question_id, correct_option, accepted_answers, explanation)
  values (v_q, p_correct, coalesce(p_accepted, '{}'), p_expl);
end $$;

do $$
declare v_course uuid; v_module uuid; v_a uuid;
begin
  select id into v_course from public.courses where slug = 'dsa-python';
  select id into v_module from public.course_modules where course_id = v_course and position = 2;
  if v_course is not null and not exists (select 1 from public.assessments where course_id = v_course and title = 'Quiz: conditions, loops and functions') then
    insert into public.assessments (course_id, module_id, title, kind, pass_threshold)
    values (v_course, v_module, 'Quiz: conditions, loops and functions', 'module_quiz', 70) returning id into v_a;
    perform pg_temp.add_q(v_a, 1, 'mcq', 'What does range(2, 6) produce?', '["2, 3, 4, 5, 6","2, 3, 4, 5","3, 4, 5, 6","2, 6"]', 1, null,
      'range stops before the end value, so range(2, 6) gives 2, 3, 4, 5.');
    perform pg_temp.add_q(v_a, 2, 'mcq', E'What is printed by this code?\n\nprint(7 // 2, 7 % 2)', '["3.5 1","3 1","4 1","3 0"]', 1, null,
      '// is whole-number division (7 // 2 is 3) and % is the remainder (7 % 2 is 1).');
    perform pg_temp.add_q(v_a, 3, 'mcq', 'Which statement about return and print is correct?',
      '["print gives a value back to the caller","return shows text on the screen","return hands a value back to the caller; print only shows it","They do the same thing"]', 2, null,
      'return gives a value back to the code that called the function. print only displays it, and the function then gives back None.');
    perform pg_temp.add_q(v_a, 4, 'mcq', 'A while loop never ends. What is the most likely cause?',
      '["The value the condition checks is never changed inside the loop","The loop body has too many lines","range was used","The function has no name"]', 0, null,
      'If nothing inside the loop changes what the condition tests, the condition stays true forever.');
    perform pg_temp.add_q(v_a, 5, 'short', 'Which keyword starts a function definition in Python? (one word)', null, null, '{"def"}',
      'Functions are defined with def, for example def is_even(n):.');
  end if;

  select id into v_course from public.courses where slug = 'system-design';
  select id into v_module from public.course_modules where course_id = v_course and position = 2;
  if v_course is not null and not exists (select 1 from public.assessments where course_id = v_course and title = 'Quiz: load balancing and caching') then
    insert into public.assessments (course_id, module_id, title, kind, pass_threshold)
    values (v_course, v_module, 'Quiz: load balancing and caching', 'module_quiz', 70) returning id into v_a;
    perform pg_temp.add_q(v_a, 1, 'mcq', 'Why should servers behind a load balancer be stateless?',
      '["So any server can handle any request and servers can be added or removed freely","So they use less memory","So they never need a database","So the load balancer can be removed"]', 0, null,
      'If no user data lives in a server''s own memory, any server can answer any request, so you can scale out and replace failed servers easily.');
    perform pg_temp.add_q(v_a, 2, 'mcq', 'In the cache-aside pattern, what happens on a cache miss?',
      '["An error is returned","The application reads the database, stores the result in the cache, and returns it","The cache silently reads the database and never tells the application","The request is dropped"]', 1, null,
      'With cache-aside the application is responsible for loading the data on a miss and filling the cache.');
    perform pg_temp.add_q(v_a, 3, 'mcq', '90 of 100 cache lookups find the entry. What is the hit ratio?', '["10%","90%","0.9%","100%"]', 1, null,
      'Hit ratio is hits divided by total lookups: 90 / 100 = 90%.');
    perform pg_temp.add_q(v_a, 4, 'short', 'What does TTL stand for in caching? (three words)', null, null, '{"time to live","time-to-live"}',
      'TTL means time to live: how long an entry may stay in the cache before it expires.');
  end if;
end $$;
