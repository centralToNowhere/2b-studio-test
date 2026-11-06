


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."TaskStatusState" AS ENUM (
    'new',
    'in progress',
    'on review',
    'under revision',
    'accepted'
);


ALTER TYPE "public"."TaskStatusState" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Object" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL
);


ALTER TABLE "public"."Object" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Task" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "object_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignee_id" "uuid" DEFAULT "gen_random_uuid"(),
    "author_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."Task" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."TaskStatus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "state" "public"."TaskStatusState" DEFAULT 'new'::"public"."TaskStatusState" NOT NULL,
    "task_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."TaskStatus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."TaskStatusComment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_status_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."TaskStatusComment" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Object"
    ADD CONSTRAINT "Object_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TaskStatusComment"
    ADD CONSTRAINT "TaskStatusComment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TaskStatus"
    ADD CONSTRAINT "TaskStatus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TaskStatusComment"
    ADD CONSTRAINT "TaskStatusComment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."TaskStatusComment"
    ADD CONSTRAINT "TaskStatusComment_task_status_id_fkey" FOREIGN KEY ("task_status_id") REFERENCES "public"."TaskStatus"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."TaskStatus"
    ADD CONSTRAINT "TaskStatus_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."TaskStatus"
    ADD CONSTRAINT "TaskStatus_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."Task"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "public"."Object"("id") ON DELETE CASCADE;



ALTER TABLE "public"."Object" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Task" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."TaskStatus" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."TaskStatusComment" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."Object" TO "anon";
GRANT ALL ON TABLE "public"."Object" TO "authenticated";
GRANT ALL ON TABLE "public"."Object" TO "service_role";



GRANT ALL ON TABLE "public"."Task" TO "anon";
GRANT ALL ON TABLE "public"."Task" TO "authenticated";
GRANT ALL ON TABLE "public"."Task" TO "service_role";



GRANT ALL ON TABLE "public"."TaskStatus" TO "anon";
GRANT ALL ON TABLE "public"."TaskStatus" TO "authenticated";
GRANT ALL ON TABLE "public"."TaskStatus" TO "service_role";



GRANT ALL ON TABLE "public"."TaskStatusComment" TO "anon";
GRANT ALL ON TABLE "public"."TaskStatusComment" TO "authenticated";
GRANT ALL ON TABLE "public"."TaskStatusComment" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







