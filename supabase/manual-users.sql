-- Run manually in Supabase SQL Editor AFTER creating these users in Auth.
-- Replace all six emails and display names before running. This is NOT a migration.
begin;
create temporary table crm_manual_profiles(email text primary key, name text, role text) on commit drop;
insert into crm_manual_profiles values
 ('supplier1@example.com', 'Анна Смирнова', 'supplier'),
 ('supplier2@example.com', 'Михаил Волков', 'supplier'),
 ('supplier3@example.com', 'Елена Орлова', 'supplier'),
 ('assignee1@example.com', 'Алексей Козлов', 'assignee'),
 ('assignee2@example.com', 'Дмитрий Соколов', 'assignee'),
 ('assignee3@example.com', 'Ирина Морозова', 'assignee');
do $$ begin
 if (select count(*) from crm_manual_profiles p join auth.users u on lower(u.email)=lower(p.email))<>6 then
  raise exception 'Create all six Auth users and replace the example emails before running this script.';
 end if;
end $$;
insert into public."Profile"(id,name,role)
 select u.id,p.name,p.role from crm_manual_profiles p join auth.users u on lower(u.email)=lower(p.email)
 on conflict(id) do update set name=excluded.name,role=excluded.role;
select p.name,p.role,u.email from public."Profile" p join auth.users u on u.id=p.id
 join crm_manual_profiles m on lower(m.email)=lower(u.email) order by p.role,p.name;
commit;
