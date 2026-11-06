SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

REVOKE ALL ON TABLE "public"."Object" FROM "anon";

REVOKE ALL ON TABLE "public"."Task" FROM "anon";

REVOKE ALL ON TABLE "public"."TaskStatus" FROM "anon";

REVOKE ALL ON TABLE "public"."TaskStatusComment" FROM "anon";

ALTER TABLE "public"."Task"
  DROP CONSTRAINT "Task_object_id_fkey";

ALTER TABLE "public"."TaskStatus"
  DROP CONSTRAINT "TaskStatus_task_id_fkey";

ALTER TABLE "public"."TaskStatusComment"
  DROP CONSTRAINT "TaskStatusComment_task_status_id_fkey";

ALTER TABLE "public"."Task"
  ALTER COLUMN "assignee_id" DROP DEFAULT;

ALTER TABLE "public"."Task"
  ALTER COLUMN "author_id" DROP DEFAULT;

ALTER TABLE "public"."Task"
  ALTER COLUMN "object_id" DROP DEFAULT;

ALTER TABLE "public"."TaskStatus"
  ALTER COLUMN "author_id" DROP DEFAULT;

ALTER TABLE "public"."TaskStatus"
  ALTER COLUMN "task_id" DROP DEFAULT;

ALTER TABLE "public"."TaskStatusComment"
  ALTER COLUMN "author_id" DROP DEFAULT;

ALTER TABLE "public"."TaskStatusComment"
  ALTER COLUMN "task_status_id" DROP DEFAULT;

CREATE SCHEMA "private";

CREATE TABLE "public"."Profile" (
  "id"   uuid NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL,
  CONSTRAINT "Profile_name_check" CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120))),
  CONSTRAINT "Profile_pkey" PRIMARY KEY (id),
  CONSTRAINT "Profile_role_check" CHECK ((role = ANY (ARRAY['supplier'::text, 'assignee'::text])))
);

ALTER TABLE "public"."Profile"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."Profile" FROM "anon";

ALTER TABLE "public"."Object"
  ADD COLUMN "description" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."Object"
  ADD COLUMN "deleted_at" timestamp WITH time zone;

ALTER TABLE "public"."Object"
  ADD COLUMN "version" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."Task"
  ADD COLUMN "deleted_at" timestamp WITH time zone;

ALTER TABLE "public"."Task"
  ADD COLUMN "status" public."TaskStatusState" NOT NULL DEFAULT 'new'::public."TaskStatusState";

ALTER TABLE "public"."Task"
  ADD COLUMN "version" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."TaskStatus"
  ADD COLUMN "sequence" bigint GENERATED ALWAYS AS IDENTITY NOT NULL;

ALTER TABLE "public"."Task"
  ALTER COLUMN "assignee_id" SET NOT NULL;

REVOKE ALL ON SEQUENCE "public"."TaskStatus_sequence_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."TaskStatus_sequence_seq" FROM "authenticated";

CREATE OR REPLACE FUNCTION private.archive_record (
  p_kind    text,
  p_id      uuid,
  p_version integer
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare object_uuid uuid;
begin
 if auth.uid() is null or not private.is_supplier() then raise exception 'FORBIDDEN'; end if;
 if p_kind='object' then
  update public."Object" set deleted_at=clock_timestamp(),version=version+1 where id=p_id and deleted_at is null and version=p_version;
 elsif p_kind='task' then
  select object_id into object_uuid from public."Task" where id=p_id;
  perform 1 from public."Object" where id=object_uuid and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  update public."Task" set deleted_at=clock_timestamp(),version=version+1 where id=p_id and deleted_at is null and version=p_version;
 else raise exception 'INVALID_KIND';
 end if;
 if not found then raise exception 'CONFLICT_OR_NOT_FOUND'; end if;
end $function$;

CREATE OR REPLACE FUNCTION private.can_read_object (
  object_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select auth.uid() is not null and exists(select 1 from public."Object" o where o.id=object_id and o.deleted_at is null and
 (private.is_supplier() or exists(select 1 from public."Task" t join public."Profile" p on p.id=auth.uid() and p.role='assignee' where t.object_id=o.id and t.assignee_id=auth.uid() and t.deleted_at is null)));
$function$;

CREATE OR REPLACE FUNCTION private.can_read_task (
  task_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select auth.uid() is not null and exists(select 1 from public."Task" t join public."Object" o on o.id=t.object_id
 where t.id=task_id and t.deleted_at is null and o.deleted_at is null and (private.is_supplier() or (t.assignee_id=auth.uid() and exists(select 1 from public."Profile" where id=auth.uid() and role='assignee'))));
$function$;

CREATE OR REPLACE FUNCTION private.change_task_status (
  p_task_id uuid,
  p_state   public."TaskStatusState",
  p_comment text,
  p_version integer
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare t public."Task"; object_uuid uuid; result uuid; allowed boolean;
begin
 if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 select object_id into object_uuid from public."Task" where id=p_task_id;
 perform 1 from public."Object" where id=object_uuid and deleted_at is null for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into t from public."Task" where id=p_task_id and deleted_at is null for update;
 if not found or not private.can_read_task(p_task_id) then raise exception 'NOT_FOUND'; end if;
 if p_version is null or t.version<>p_version then raise exception 'CONFLICT_OR_NOT_FOUND'; end if;
 allowed := (private.is_supplier() and t.status='on review' and p_state in ('accepted','under revision')) or
  (t.assignee_id=auth.uid() and exists(select 1 from public."Profile" where id=auth.uid() and role='assignee') and
   ((t.status in ('new','under revision') and p_state='in progress') or (t.status='in progress' and p_state='on review')));
 if not coalesce(allowed,false) then raise exception 'INVALID_TRANSITION'; end if;
 if p_state='under revision' and nullif(btrim(p_comment),'') is null then raise exception 'COMMENT_REQUIRED'; end if;
 update public."Task" set status=p_state,version=version+1 where id=t.id;
 insert into public."TaskStatus"(task_id,author_id,state) values(t.id,auth.uid(),p_state) returning id into result;
 if nullif(btrim(p_comment),'') is not null then
  insert into public."TaskStatusComment"(task_status_id,author_id,comment) values(result,auth.uid(),btrim(p_comment));
 end if;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION private.is_supplier()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select auth.uid() is not null and exists(select 1 from public."Profile" where id=auth.uid() and role='supplier');
$function$;

CREATE OR REPLACE FUNCTION private.save_object (
  p_id          uuid,
  p_name        text,
  p_address     text,
  p_description text,
  p_version     integer
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare result uuid;
begin
 if auth.uid() is null or not private.is_supplier() then raise exception 'FORBIDDEN'; end if;
 if p_id is null then
  insert into public."Object"(name,address,description) values(btrim(p_name),btrim(p_address),coalesce(p_description,'')) returning id into result;
 else
  update public."Object" set name=btrim(p_name),address=btrim(p_address),description=coalesce(p_description,''),version=version+1
  where id=p_id and deleted_at is null and version=p_version returning id into result;
  if result is null then raise exception 'CONFLICT_OR_NOT_FOUND'; end if;
 end if;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION private.save_task (
  p_id          uuid,
  p_object_id   uuid,
  p_name        text,
  p_description text,
  p_assignee_id uuid,
  p_version     integer
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare result uuid;
begin
 if auth.uid() is null or not private.is_supplier() then raise exception 'FORBIDDEN'; end if;
 perform 1 from public."Object" where id=p_object_id and deleted_at is null for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if not exists(select 1 from public."Profile" where id=p_assignee_id and role='assignee') then raise exception 'INVALID_ASSIGNEE'; end if;
 if p_id is null then
  insert into public."Task"(object_id,name,description,assignee_id,author_id) values(p_object_id,btrim(p_name),coalesce(p_description,''),p_assignee_id,auth.uid()) returning id into result;
  insert into public."TaskStatus"(task_id,author_id,state) values(result,auth.uid(),'new');
 else
  update public."Task" set name=btrim(p_name),description=coalesce(p_description,''),assignee_id=p_assignee_id,version=version+1
  where id=p_id and object_id=p_object_id and deleted_at is null and version=p_version returning id into result;
  if result is null then raise exception 'CONFLICT_OR_NOT_FOUND'; end if;
 end if;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.archive_record (
  p_kind    text,
  p_id      uuid,
  p_version integer
)
  RETURNS void
  LANGUAGE sql
  SET search_path TO ''
  AS $function$ select private.archive_record(p_kind,p_id,p_version); $function$;

REVOKE ALL ON FUNCTION "public"."archive_record"(text, uuid, integer) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.change_task_status (
  p_task_id uuid,
  p_state   public."TaskStatusState",
  p_comment text,
  p_version integer
)
  RETURNS uuid
  LANGUAGE sql
  SET search_path TO ''
  AS $function$ select private.change_task_status(p_task_id,p_state,p_comment,p_version); $function$;

REVOKE ALL ON FUNCTION "public"."change_task_status"(uuid, public."TaskStatusState", text, integer) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.save_object (
  p_id          uuid,
  p_name        text,
  p_address     text,
  p_description text,
  p_version     integer
)
  RETURNS uuid
  LANGUAGE sql
  SET search_path TO ''
  AS $function$ select private.save_object(p_id,p_name,p_address,p_description,p_version); $function$;

REVOKE ALL ON FUNCTION "public"."save_object"(uuid, text, text, text, integer) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.save_task (
  p_id          uuid,
  p_object_id   uuid,
  p_name        text,
  p_description text,
  p_assignee_id uuid,
  p_version     integer
)
  RETURNS uuid
  LANGUAGE sql
  SET search_path TO ''
  AS $function$ select private.save_task(p_id,p_object_id,p_name,p_description,p_assignee_id,p_version); $function$;

REVOKE ALL ON FUNCTION "public"."save_task"(uuid, uuid, text, text, uuid, integer) FROM PUBLIC, "anon";

ALTER TABLE "public"."Object"
  ADD CONSTRAINT "object_address_valid" CHECK (((length(btrim(address)) >= 1) AND (length(btrim(address)) <= 500)));

ALTER TABLE "public"."Object"
  ADD CONSTRAINT "object_description_length" CHECK ((length(description) <= 20000));

ALTER TABLE "public"."Object"
  ADD CONSTRAINT "object_name_valid" CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 200)));

ALTER TABLE "public"."Profile"
  ADD CONSTRAINT "Profile_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."Task"
  ADD CONSTRAINT "Task_object_id_fkey" FOREIGN KEY (object_id) REFERENCES public."Object"(id);

ALTER TABLE "public"."Task"
  ADD CONSTRAINT "task_description_length" CHECK ((length(description) <= 20000));

ALTER TABLE "public"."Task"
  ADD CONSTRAINT "task_name_valid" CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 200)));

ALTER TABLE "public"."TaskStatus"
  ADD CONSTRAINT "TaskStatus_sequence_key" UNIQUE (SEQUENCE);

ALTER TABLE "public"."TaskStatus"
  ADD CONSTRAINT "TaskStatus_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public."Task"(id);

ALTER TABLE "public"."TaskStatusComment"
  ADD CONSTRAINT "TaskStatusComment_task_status_id_fkey" FOREIGN KEY (task_status_id) REFERENCES public."TaskStatus"(id);

ALTER TABLE "public"."TaskStatusComment"
  ADD CONSTRAINT "comment_valid" CHECK (((length(btrim(comment)) >= 1) AND (length(btrim(comment)) <= 5000)));

ALTER TABLE "public"."TaskStatusComment"
  ADD CONSTRAINT "one_comment_per_status" UNIQUE (task_status_id);

CREATE INDEX task_assignee_idx ON public."Task" USING btree (assignee_id);

CREATE INDEX task_author_idx ON public."Task" USING btree (author_id);

CREATE INDEX task_comment_author_idx ON public."TaskStatusComment" USING btree (author_id);

CREATE INDEX task_filter_idx ON public."Task" USING btree (status, created_at DESC)
  WHERE (deleted_at IS NULL);

CREATE INDEX task_object_idx ON public."Task" USING btree (object_id);

CREATE INDEX task_status_author_idx ON public."TaskStatus" USING btree (author_id);

CREATE INDEX task_status_task_idx ON public."TaskStatus" USING btree (task_id, SEQUENCE DESC);

CREATE POLICY "objects_read" ON "public"."Object"
  FOR SELECT
  TO "authenticated"
  USING (private.can_read_object(id));

CREATE POLICY "profiles_read" ON "public"."Profile"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) IS NOT NULL));

CREATE POLICY "tasks_read" ON "public"."Task"
  FOR SELECT
  TO "authenticated"
  USING (private.can_read_task(id));

CREATE POLICY "status_read" ON "public"."TaskStatus"
  FOR SELECT
  TO "authenticated"
  USING (private.can_read_task(task_id));

CREATE POLICY "comments_read" ON "public"."TaskStatusComment"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public."TaskStatus" s
  WHERE (s.id = "TaskStatusComment".task_status_id))));

REVOKE ALL ON FUNCTION "private"."archive_record"(text, uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."archive_record"(text, uuid, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."can_read_object"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."can_read_object"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."can_read_task"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."can_read_task"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."change_task_status"(uuid, public."TaskStatusState", text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."change_task_status"(uuid, public."TaskStatusState", text, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."is_supplier"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_supplier"() TO "authenticated";

REVOKE ALL ON FUNCTION "private"."save_object"(uuid, text, text, text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."save_object"(uuid, text, text, text, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."save_task"(uuid, uuid, text, text, uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."save_task"(uuid, uuid, text, text, uuid, integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."archive_record"(text, uuid, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."archive_record"(text, uuid, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."archive_record"(text, uuid, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."archive_record"(text, uuid, integer) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."change_task_status"(uuid, public."TaskStatusState", text, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."change_task_status"(uuid, public."TaskStatusState", text, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."change_task_status"(uuid, public."TaskStatusState", text, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."change_task_status"(uuid, public."TaskStatusState", text, integer) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."save_object"(uuid, text, text, text, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."save_object"(uuid, text, text, text, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_object"(uuid, text, text, text, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_object"(uuid, text, text, text, integer) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."save_task"(uuid, uuid, text, text, uuid, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."save_task"(uuid, uuid, text, text, uuid, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_task"(uuid, uuid, text, text, uuid, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_task"(uuid, uuid, text, text, uuid, integer) TO "service_role";

GRANT USAGE ON SCHEMA "private" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."TaskStatus_sequence_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."TaskStatus_sequence_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."TaskStatus_sequence_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."TaskStatus_sequence_seq" TO "service_role";

REVOKE ALL ON TABLE "public"."Object" FROM "authenticated";

GRANT SELECT ON TABLE "public"."Object" TO "authenticated";

REVOKE ALL ON TABLE "public"."Profile" FROM "authenticated";

GRANT SELECT ON TABLE "public"."Profile" TO "authenticated";

REVOKE ALL ON TABLE "public"."Profile" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Profile" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Profile" TO "service_role";

REVOKE ALL ON TABLE "public"."Task" FROM "authenticated";

GRANT SELECT ON TABLE "public"."Task" TO "authenticated";

REVOKE ALL ON TABLE "public"."TaskStatus" FROM "authenticated";

GRANT SELECT ON TABLE "public"."TaskStatus" TO "authenticated";

REVOKE ALL ON TABLE "public"."TaskStatusComment" FROM "authenticated";

GRANT SELECT ON TABLE "public"."TaskStatusComment" TO "authenticated";

