-- SAMPLE CONTENT: DSA with Python course shell (course + 15 module titles). Lessons arrive in the next installment.
-- Safe to re-run. Run in the Supabase SQL Editor.
insert into public.courses (slug, title, description, level, subject, language, learning_objectives, prerequisites, status)
values (
  'dsa-python',
  'Data Structures and Algorithms with Python',
  'Learn core data structures and algorithms by reading, visualizing, coding and testing them in Python.',
  'beginner', 'computer-science', 'en',
  array['Reason about time and space complexity','Implement searching and sorting algorithms','Build and use linked lists, stacks, queues, hash maps, trees and graphs','Recognise common problem-solving patterns'],
  array['Basic familiarity with using a computer','No prior programming experience required'],
  'published'
) on conflict (slug) do nothing;

insert into public.course_modules (course_id, title, position)
select c.id, t.title, t.ord
from public.courses c,
  unnest(array[
    'Python fundamentals for problem-solving',
    'Variables, conditions, loops and functions',
    'Lists, arrays, strings and basic operations',
    'Time and space complexity',
    'Linear search and binary search',
    'Bubble, selection and insertion sort',
    'Merge sort and recursion',
    'Linked lists',
    'Stacks and queues',
    'Hash maps and sets',
    'Trees and binary-tree traversal',
    'Graph fundamentals and traversal',
    'Common patterns: two pointers and sliding window',
    'Mixed practice and problem-solving strategies',
    'Final assessment and practical challenge'
  ]) with ordinality as t(title, ord)
where c.slug = 'dsa-python'
on conflict (course_id, position) do nothing;
