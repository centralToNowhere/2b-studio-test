SET local check_function_bodies = off;

ALTER TABLE "public"."TaskStatusComment"
  DROP CONSTRAINT "comment_valid";

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
 if p_state='under revision' and nullif(btrim(p_comment, E' \t\n\r\f\v'),'') is null then raise exception 'COMMENT_REQUIRED'; end if;
 update public."Task" set status=p_state,version=version+1 where id=t.id;
 insert into public."TaskStatus"(task_id,author_id,state) values(t.id,auth.uid(),p_state) returning id into result;
 if nullif(btrim(p_comment, E' \t\n\r\f\v'),'') is not null then
  insert into public."TaskStatusComment"(task_status_id,author_id,comment) values(result,auth.uid(),btrim(p_comment, E' \t\n\r\f\v'));
 end if;
 return result;
end $function$;

ALTER TABLE "public"."TaskStatusComment"
  ADD CONSTRAINT "comment_valid" CHECK (((length(btrim(comment, ' 	
'::text)) >= 1) AND (length(btrim(comment, ' 	
'::text)) <= 5000)));

