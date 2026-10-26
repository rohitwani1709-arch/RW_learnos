-- Run ONCE in Supabase SQL Editor after the user has registered. Replace the email.
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'manjulawani6505@gmail.com'
on conflict do nothing;
