--
-- PostgreSQL database dump
--
-- Dumped from database version 15.8
-- Dumped by pg_dump version 17.5
set
  statement_timeout = 0;

set
  lock_timeout = 0;

set
  idle_in_transaction_session_timeout = 0;

set
  transaction_timeout = 0;

set
  client_encoding = 'UTF8';

set
  standard_conforming_strings = on;

select
  pg_catalog.set_config ('search_path', '', false);

set
  check_function_bodies = false;

set
  xmloption = content;

set
  client_min_messages = warning;

set
  row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--
-- create schema public;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--
COMMENT on SCHEMA public is 'standard public schema';

--
-- Name: call_poll_fn(); Type: FUNCTION; Schema: public; Owner: -. please enter the relevant secrets to the vault in supabase dashaboard
--
create or replace function call_poll_fn()
returns void language sql as $$
select
  net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'project_url'
    ) || '/functions/v1/notify-fine-tune-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'service_role'
      )
    )
  );
$$;



--
-- Name: check_invite_limit(); Type: FUNCTION; Schema: public; Owner: -
--
create function public.check_invite_limit () RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER as $$

declare

  invite_count int;

begin

  select count(*) into invite_count

  from invite_logs

  where inviter_id = new.inviter_id

    and created_at > now() - interval '1 day';



  if invite_count >= 10 then

    raise exception 'Invite limit exceeded: max 10 invites per day per inviter';

  end if;



  return new;

end;

$$;

--
-- Name: copy_email_from_auth(); Type: FUNCTION; Schema: public; Owner: -
--
create function public.copy_email_from_auth () RETURNS trigger LANGUAGE plpgsql as $$

begin

  update public.users

  set email = new.email

  where id = new.id;

  return new;

end;

$$;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--
create function public.handle_new_user()
returns trigger
language plpgsql
as $$
declare
  inserted boolean := false;
  extracted_role text := null;
begin
  insert into public.debug_trigger_log (context)
  values ('handle_new_user START: ' || new.id || ' / ' || new.email);

  -- Extract role from metadata (may be null)
  extracted_role := new.raw_user_meta_data ->> 'role';

  begin
    insert into public.users (id, email, role)
    values (new.id, new.email, extracted_role);

    inserted := true;
  exception when others then
    insert into public.debug_trigger_log (context)
    values ('handle_new_user ERROR: ' || SQLERRM);
  end;

  if inserted then
    insert into public.debug_trigger_log (context)
    values ('handle_new_user SUCCESS: ' || new.id || ' / role: ' || coalesce(extracted_role, 'null'));
  end if;

  return new;
end;
$$;

--
-- Name: handle_session_end(); Type: FUNCTION; Schema: public; Owner: -
--
create or replace function public.handle_session_end () RETURNS trigger LANGUAGE plpgsql SECURITY definer as $$
DECLARE
  project_url text;
  service_role text;
  fn_url text;
  http_result jsonb;
  frontend_url text;
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    -- Load secrets
    SELECT decrypted_secret INTO project_url
    FROM vault.decrypted_secrets
    WHERE name = 'project_url';

    SELECT decrypted_secret INTO service_role
    FROM vault.decrypted_secrets
    WHERE name = 'service_role';

    SELECT decrypted_secret INTO frontend_url
    FROM vault.decrypted_secrets
    WHERE name = 'frontend_url';

    IF project_url IS NULL OR service_role IS NULL THEN
      RAISE EXCEPTION 'Missing required secrets.';
    END IF;

    fn_url := project_url || '/functions/v1/send_email_on_end';

    BEGIN
      http_result := net.http_post(
  url := fn_url,
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role
  ),
     body := jsonb_build_object(
          'session_id', NEW.id,
          'ended_at', NEW.ended_at,
          'link', frontend_url || '/chat/' || NEW.id
        )
);

    EXCEPTION WHEN OTHERS THEN
      -- Optionally log error
      INSERT INTO debug_trigger_log(context)
      VALUES ('Trigger failed: ' || SQLERRM);
    END;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: is_team_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--
create function public.is_team_member (session_team_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER as $$

begin

  return exists (

    select 1 from team_members

    where user_id = auth.uid()

      and team_id = session_team_id

  );

end;

$$;

--
-- Name: list_clients_for_therapist(uuid); Type: FUNCTION; Schema: public; Owner: -
--
create function public.list_clients_for_therapist (therapist_uuid uuid) RETURNS table (
  id uuid,
  email text,
  session_count integer,
  last_active timestamp without time zone,
  access_type text
) LANGUAGE sql STABLE as $$

with session_access as (

  select

    s.id as session_id,

    tr.user_id,

    s.updated_at,

    u.email,

    u.full_name,

    case

      when therapist_uuid = any(tr.shared_with) then 'Shared'

      when tm.user_id is not null then 'Team'

      else 'Unknown'

    end as access_type

  from treatments tr

  join sessions s on s.treatment_id = tr.id

  join users u on u.id = tr.user_id

  left join team_members tm

    on tm.team_id = tr.team_id

    and tm.user_id = therapist_uuid

  where

    therapist_uuid = any(tr.shared_with)

    or tm.user_id is not null

)

select

  user_id as id,

  max(email) as email,

  count(session_id) as session_count,

  max(updated_at) as last_active,

  max(access_type) as access_type

from session_access

group by user_id;

$$;

--
-- Name: list_flagged_sessions(uuid); Type: FUNCTION; Schema: public; Owner: -
--
create function public.list_flagged_sessions (therapist_uuid uuid) RETURNS table (
  treatment_id uuid,
  treatment_title text,
  treatment_color text,
  treatment_emoji text,
  goal_id uuid,
  goal_title text,
  session_id uuid,
  session_title text,
  summary text,
  session_created_at timestamp without time zone,
  reviewed boolean,
  client_id uuid,
  client_email text,
  client_name text,
  annotation_count integer,
  flagged_count integer,
  severity_counts jsonb,
  top_emotions text[],
  top_reasons text[],
  ai_agreement_rate numeric,
  source_id uuid,
  message_id uuid,
  content text,
  message_role text,
  message_created_at timestamp without time zone,
  corrected_emotion text,
  corrected_intensity numeric,
  corrected_tone text,
  corrected_topic text,
  corrected_alignment_score numeric,
  flagged boolean,
  flag_reason text,
  note text,
  annotation_updated_at timestamp without time zone,
  annotation_updated_by uuid,
  tagged_at timestamp without time zone,
  emotion text,
  original_emotion text,
  tone text,
  original_tone text,
  intensity numeric,
  original_intensity numeric,
  topic text,
  original_topic text,
  alignment_score numeric,
  original_alignment_score numeric,
  feedback_source text,
  score integer
) LANGUAGE sql STABLE as $$



select distinct on (s.id, s.created_at, m.id, m.created_at)

  tr.id as treatment_id,

  tr.title as treatment_title,

  tr.color as treatment_color,

  tr.emoji as treatment_emoji,

  g.id as goal_id,

  g.title as goal_title,



  s.id as session_id,

  s.title as session_title,

  s.summary,

  s.created_at as session_created_at,

  s.reviewed,

  u.id as client_id,

  u.email as client_email,

  u.full_name as client_name,



  count(*) filter (where a.source_id is not null) over (partition by s.id) as annotation_count,

  count(*) filter (where a.flag_reason is not null) over (partition by s.id) as flagged_count,



  jsonb_build_object(

    'low', count(*) filter (

      where coalesce(a.corrected_tone, el.tone) is distinct from 'negative'

         or coalesce(a.corrected_intensity, el.intensity) < 0.4

    ) over (partition by s.id),

    'medium', count(*) filter (

      where coalesce(a.corrected_tone, el.tone) = 'negative'

        and coalesce(a.corrected_intensity, el.intensity) >= 0.4

        and coalesce(a.corrected_intensity, el.intensity) < 0.8

    ) over (partition by s.id),

    'high', count(*) filter (

      where coalesce(a.corrected_tone, el.tone) = 'negative'

        and coalesce(a.corrected_intensity, el.intensity) >= 0.8

    ) over (partition by s.id)

  ) as severity_counts,



  (

    select array_agg(distinct a2.corrected_emotion)

    from annotations a2

    join messages m2 on m2.id = a2.source_id

    where m2.session_id = s.id

      and a2.source_type = 'session'

      and a2.corrected_emotion is not null

  ) as top_emotions,



  (

    select array_agg(distinct a3.flag_reason)

    from annotations a3

    join messages m3 on m3.id = a3.source_id

    where m3.session_id = s.id

      and a3.source_type = 'session'

      and a3.flag_reason is not null

  ) as top_reasons,



  round(

    100.0 * count(*) filter (

      where el.emotion = a.corrected_emotion or a.corrected_emotion is null

    ) over (partition by s.id)::numeric

    / nullif(count(*) over (partition by s.id), 0),

    1

  ) as ai_agreement_rate,



  m.id as source_id,

  m.id as message_id,

  m.content,

  m.role as message_role,

  m.created_at as message_created_at,



  a.corrected_emotion,

  a.corrected_intensity,

  a.corrected_tone,

  a.corrected_topic,

  a.corrected_alignment_score,

  a.flagged,

  a.flag_reason,

  a.note,

  a.updated_at as annotation_updated_at,

  a.updated_by as annotation_updated_by,

  el.created_at as tagged_at,



  coalesce(a.corrected_emotion, el.emotion) as emotion,

  el.emotion as original_emotion,



  coalesce(a.corrected_tone, el.tone) as tone,

  el.tone as original_tone,



  coalesce(a.corrected_intensity, el.intensity) as intensity,

  el.intensity as original_intensity,



  coalesce(a.corrected_topic, el.topic) as topic,

  el.topic as original_topic,



  coalesce(a.corrected_alignment_score, el.alignment_score) as alignment_score,

  el.alignment_score as original_alignment_score,



  a.feedback_source,



  case

    when a.updated_at is not null then 5

    when el.alignment_score >= 0.9 and el.intensity >= 0.8 then 5

    when el.alignment_score >= 0.9 and el.intensity >= 0.4 then 4

    when el.alignment_score >= 0.7 and el.intensity >= 0.8 then 4

    when el.alignment_score >= 0.6 and el.intensity >= 0.6 then 3

    when el.alignment_score >= 0.4 and el.intensity >= 0.4 then 2

    when el.alignment_score >= 0.2 or el.intensity >= 0.2 then 2

    else 1

  end as score



from treatments tr

join goals g on tr.goal_id = g.id

join sessions s on s.treatment_id = tr.id

join messages m on m.session_id = s.id

join users u on u.id = tr.user_id



left join emotion_logs el on el.source_type = 'session' and el.source_id = m.id

left join annotations a on a.source_id = m.id and a.source_type = 'session'

left join team_members tm on tm.team_id = tr.team_id



where

  tr.shared_with @> array[therapist_uuid]

  or exists (

    select 1

    from team_members tm_check

    where tm_check.team_id = tr.team_id

      and tm_check.user_id = therapist_uuid

  )



order by s.created_at, m.created_at;



$$;

--
-- Name: list_therapist_clients(uuid); Type: FUNCTION; Schema: public; Owner: -
--
create function public.list_therapist_clients (therapist_uuid uuid) RETURNS table (
  id uuid,
  email text,
  session_count integer,
  last_active timestamp without time zone,
  access_type text
) LANGUAGE sql STABLE as $$

with session_access as (

  select

    s.id as session_id,

    tr.user_id,

    s.updated_at,

    u.email,

    u.full_name,

    case

      when therapist_uuid = any(tr.shared_with) then 'Shared'

      when tm.user_id is not null then 'Team'

      else 'Unknown'

    end as access_type

  from treatments tr

  join sessions s on s.treatment_id = tr.id

  join users u on u.id = tr.user_id

  left join team_members tm

    on tm.team_id = tr.team_id

    and tm.user_id = therapist_uuid

  where

    therapist_uuid = any(tr.shared_with)

    or tm.user_id is not null

)

select

  user_id as id,

  max(email) as email,

  count(session_id) as session_count,

  max(updated_at) as last_active,

  max(access_type) as access_type

from session_access

group by user_id;

$$;

--
-- Name: set_team_from_invite(); Type: FUNCTION; Schema: public; Owner: -
--
create function public.set_team_from_invite () RETURNS trigger LANGUAGE plpgsql as $$

declare

  inviter uuid;

  team uuid;

begin

  insert into public.debug_trigger_log (context)

  values ('START set_team_from_invite: user=' || NEW.id || ', email=' || NEW.email);



  -- Step 1: Look up inviter from invite_logs using to_email

  select inviter_id into inviter

  from public.invite_logs

  where to_email = NEW.email

  limit 1;



  if inviter is not null then

    insert into public.debug_trigger_log (context)

    values ('Inviter found: ' || inviter);



    -- Step 2: Find inviter's team

    select team_id into team

    from public.team_members

    where user_id = inviter

    limit 1;



    if team is not null then

      insert into public.debug_trigger_log (context)

      values ('Team found: ' || team);



      -- Step 3: Insert new user into the same team

      insert into public.team_members (user_id, team_id)

      values (NEW.id, team);



      insert into public.debug_trigger_log (context)

      values ('Inserted user into team: ' || NEW.id || ' -> ' || team);

    else

      insert into public.debug_trigger_log (context)

      values ('No team found for inviter: ' || inviter);

    end if;

  else

    insert into public.debug_trigger_log (context)

    values ('No inviter found for email: ' || NEW.email);

  end if;



  return NEW;

end;

$$;

--
-- Name: set_user_role_from_invite(); Type: FUNCTION; Schema: public; Owner: -
--
create function public.set_user_role_from_invite () RETURNS trigger LANGUAGE plpgsql as $$declare

  invite_role text;

begin

  if exists (

    select 1 from public.invite_logs where to_email = NEW.email

  ) then

    select role into invite_role

    from public.invite_logs

    where to_email = NEW.email

    limit 1;



    NEW.role := coalesce(invite_role, 'user');

  end if;



  return NEW;

end;$$;

--
-- Name: track_emotion_log_delete(); Type: FUNCTION; Schema: public; Owner: -
--
create function public.track_emotion_log_delete () RETURNS trigger LANGUAGE plpgsql as $$

BEGIN

  INSERT INTO emotion_log_changes (change_type, old_data, change_timestamp)

  VALUES (OLD.id, 'DELETE', to_jsonb(OLD), CURRENT_TIMESTAMP);

  RETURN OLD;

END;

$$;

--
-- Name: track_emotion_log_insert(); Type: FUNCTION; Schema: public; Owner: -
--
create function public.track_emotion_log_insert () RETURNS trigger LANGUAGE plpgsql as $$

BEGIN

  INSERT INTO emotion_log_changes (change_type, new_data, change_timestamp)

  VALUES ('INSERT', to_jsonb(NEW), CURRENT_TIMESTAMP);

  RETURN NEW;

END;

$$;

--
-- Name: track_emotion_log_update(); Type: FUNCTION; Schema: public; Owner: -
--
create function public.track_emotion_log_update () RETURNS trigger LANGUAGE plpgsql as $$

BEGIN

  INSERT INTO emotion_log_changes (change_type, old_data, new_data, change_timestamp)

  VALUES ('UPDATE', to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP);

  RETURN NEW;

END;

$$;

--
-- Name: validate_emotion_log_source(); Type: FUNCTION; Schema: public; Owner: -
--
create function public.validate_emotion_log_source () RETURNS trigger LANGUAGE plpgsql as $$

begin

  if NEW.source_type = 'session' and not exists (

    select 1 from sessions where message_id = NEW.source_id

  ) then

    raise exception 'Invalid session ID';

  elsif NEW.source_type = 'journal' and not exists (

    select 1 from journal_entries where id = NEW.source_id

  ) then

    raise exception 'Invalid journal ID';

  elsif NEW.source_type = 'reflection' and not exists (

    select 1 from reflections where id = NEW.source_id

  ) then

    raise exception 'Invalid reflection ID';

  end if;

  return NEW;

end;

$$;

set
  default_tablespace = '';

set
  default_table_access_method = heap;

--
-- Name: end_expired_sessions(); Type: FUNCTION; Schema: public; Owner: -
--
create or replace function public.end_expired_sessions()
returns void
language plpgsql
as $$
begin
  update sessions
  set ended_at = now()
  where ended_at is null
    and paused_at is null
    and created_at + interval '2 hours' + coalesce(make_interval(secs => total_pause_seconds), interval '0') <= now();
end;
$$;


--
-- Name: on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--
create trigger on_auth_user_created
after INSERT on auth.users for EACH row
execute FUNCTION public.handle_new_user ();

--
-- Name: annotations; Type: TABLE; Schema: public; Owner: -
--
create table public.annotations (
  id uuid default gen_random_uuid () not null,
  source_type text not null,
  source_id uuid not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone,
  corrected_emotion text,
  corrected_intensity numeric,
  corrected_tone text,
  corrected_topic text,
  note text,
  emotion_summary text,
  flag_reason text,
  flagged boolean GENERATED ALWAYS as (
    (
      (flag_reason is not null)
      and (
        length(
          TRIM(
            both
            from
              flag_reason
          )
        ) > 0
      )
    )
  ) STORED,
  feedback_source text,
  updated_by uuid,
  corrected_aligned_with_goal boolean,
  corrected_alignment_score numeric(3, 2),
  constraint annotations_corrected_intensity_check check (
    (
      (corrected_intensity >= (0)::numeric)
      and (corrected_intensity <= (1)::numeric)
    )
  ),
  constraint annotations_feedback_source_check check (
    (
      feedback_source = any (
        array[
          'manual'::text,
          'ai_vote'::text,
          'script'::text,
          'preseed'::text,
          'user_suggestion'::text,
          'moderation'::text,
          'imported'::text,
          'crowdsourced'::text
        ]
      )
    )
  ),
  constraint annotations_source_type_check check (
    (
      source_type = any (
        array[
          'session'::text,
          'journal'::text,
          'reflection'::text
        ]
      )
    )
  )
);

--
-- Name: category_team_links; Type: TABLE; Schema: public; Owner: -
--
create table public.category_team_links (category_id uuid not null, team_id uuid not null);

--
-- Name: category_user_links; Type: TABLE; Schema: public; Owner: -
--
create table public.category_user_links (category_id uuid not null, user_id uuid not null);

--
-- Name: debug_trigger_log; Type: TABLE; Schema: public; Owner: -
--
create table public.debug_trigger_log (
  id uuid default gen_random_uuid () not null,
  context text,
  created_at timestamp without time zone default now()
);

--
-- Name: emotion_log_changes; Type: TABLE; Schema: public; Owner: -
--
create table public.emotion_log_changes (
  id integer not null,
  change_type character varying(10) not null,
  changed_by integer,
  change_timestamp timestamp with time zone default CURRENT_TIMESTAMP,
  old_data jsonb,
  new_data jsonb
);

--
-- Name: emotion_log_changes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
create sequence public.emotion_log_changes_id_seq as integer START
with
  1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

--
-- Name: emotion_log_changes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
alter sequence public.emotion_log_changes_id_seq OWNED BY public.emotion_log_changes.id;

--
-- Name: emotion_logs; Type: TABLE; Schema: public; Owner: -
--
create table public.emotion_logs (
  id uuid default gen_random_uuid () not null,
  emotion text,
  intensity numeric,
  tone text,
  topic text,
  created_at timestamp with time zone default now(),
  source_type text,
  source_id uuid,
  user_id uuid,
  note text,
  aligned_with_goal boolean,
  alignment_score numeric,
  constraint emotion_logs_intensity_check check (
    (
      (intensity >= (0)::numeric)
      and (intensity <= (1)::numeric)
    )
  ),
  constraint emotion_logs_source_type_check check (
    (
      source_type = any (
        array[
          'session'::text,
          'journal'::text,
          'reflection'::text
        ]
      )
    )
  )
);

--
-- Name: fine_tune_events; Type: TABLE; Schema: public; Owner: -
--
create table public.fine_tune_events (
  id uuid default gen_random_uuid () not null,
  snapshot_id uuid,
  user_id uuid,
  job_id text,
  status text,
  error text,
  retry_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp without time zone default now(),
  model_version text,
  error_details text,
  retrain_suggested boolean default false,
  message text,
  auto_retry boolean,
  event_type text,
  retry_origin text,
  retry_reason text,
  constraint fine_tune_events_status_check check (
    (
      status = any (
        array[
          'succeeded'::text,
          'failed'::text,
          'pending'::text,
          'retrying'::text,
          'validating_files'::text,
          'running'::text
        ]
      )
    )
  )
);

--
-- Name: fine_tune_locks; Type: TABLE; Schema: public; Owner: -
--
create table public.fine_tune_locks (
  snapshot_id uuid not null,
  user_id uuid,
  locked_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  context text,
  locked_until timestamp with time zone not null,
  created_at timestamp with time zone default now(),
  filter_hash text
);

--
-- Name: fine_tune_snapshots; Type: TABLE; Schema: public; Owner: -
--
create table public.fine_tune_snapshots (
  id uuid default gen_random_uuid () not null,
  uploaded_by uuid,
  model_version text,
  filters jsonb,
  file_path text,
  job_status text default 'pending'::text,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  file_uploaded_at timestamp with time zone,
  user_id uuid,
  file_id text,
  file_name text,
  filter_hash text,
  retry_count integer,
  archived boolean,
  job_duration numeric,
  name text,
  version text,
  job_id text
);

--
-- Name: COLUMN fine_tune_snapshots.file_uploaded_at; Type: COMMENT; Schema: public; Owner: -
--
COMMENT on column public.fine_tune_snapshots.file_uploaded_at is 'Timestamp of when the training file was uploaded to OpenAI';

--
-- Name: folders; Type: TABLE; Schema: public; Owner: -
--
create table public.folders (
  id uuid default extensions.uuid_generate_v4 () not null,
  user_id uuid,
  name text,
  emoji text,
  color text,
  shared_with uuid[] default '{}'::uuid[],
  parent_id uuid
);

--
-- Name: goal_categories; Type: TABLE; Schema: public; Owner: -
--
create table public.goal_categories (
  id uuid default gen_random_uuid () not null,
  name text not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

--
-- Name: goal_category_links; Type: TABLE; Schema: public; Owner: -
--
create table public.goal_category_links (goal_id uuid not null, category_id uuid not null);

--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--
create table public.goals (
  id uuid default gen_random_uuid () not null,
  title text not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

--
-- Name: invite_logs; Type: TABLE; Schema: public; Owner: -
--
create table public.invite_logs (
  id uuid default gen_random_uuid () not null,
  inviter_id uuid,
  ip_address text,
  created_at timestamp with time zone default now(),
  role text default 'user'::text,
  team_id uuid,
  to_email text,
  status text default 'pending'::text,
  accepted_at timestamp with time zone,
  token uuid default gen_random_uuid (),
  retry_count integer default 0,
  invite_url text
  last_retry_at timestampz,
  last_error text
);

create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  action text not null,
  details text null,
  note text null,
  created_at timestamp with time zone default now()
);

create index on admin_audit_logs (actor_id);
create index on admin_audit_logs (created_at desc);
create index on admin_audit_logs (action);

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamp with time zone default now(),
  updated_by uuid references users(id) on delete set null
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--
create table public.messages (
  id uuid default extensions.uuid_generate_v4 () not null,
  session_id uuid,
  role text not null,
  content text not null,
  created_at timestamp with time zone default now()
);

--
-- Name: session_events; Type: TABLE; Schema: public; Owner: -
--
create table public.session_events (
  id uuid default extensions.uuid_generate_v4 () not null,
  session_id uuid,
  user_id uuid,
  event_type text not null,
  description text,
  created_at timestamp with time zone default now()
);

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--
create table public.sessions (
  id uuid default extensions.uuid_generate_v4 () not null,
  created_at timestamp with time zone default now(),
  archived boolean default false,
  order_index integer default 0,
  emoji text,
  color text,
  summary text,
  title text default (
    'Chat ΓÇô '::text || to_char(now(), 'Mon DD, YYYY, HH24:MI'::text)
  ),
  ended_at timestamp with time zone,
  reviewed boolean,
  bookmarked boolean,
  treatment_id uuid,
  updated_at timestamp with time zone,
  paused_at timestamp with time zone,
  total_pause_seconds integer default 0,
  reviewed_by uuid
);

--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--
create table public.settings (
  key text not null,
  value text not null,
  description text
);

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--
create table public.team_members (
  id integer not null,
  team_id uuid,
  user_id uuid,
  role text default 'member'::text,
  joined_at timestamp with time zone default now()
);

--
-- Name: team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
create sequence public.team_members_id_seq as integer START
with
  1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

--
-- Name: team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
alter sequence public.team_members_id_seq OWNED BY public.team_members.id;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--
create table public.teams (
  id uuid default extensions.uuid_generate_v4 () not null,
  name text,
  created_by uuid,
  description text
);

--
-- Name: treatments; Type: TABLE; Schema: public; Owner: -
--
create table public.treatments (
  id uuid default extensions.uuid_generate_v4 () not null,
  user_id uuid not null,
  team_id uuid,
  status text default 'active'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone,
  finished boolean default false not null,
  ended_at timestamp without time zone,
  summary text,
  title text,
  shared_with uuid[] default '{}'::uuid[] not null,
  archived boolean default false not null,
  goal_id uuid,
  color text,
  emoji text,
  folder_id uuid,
  order_index numeric
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--
create table public.users (
  id uuid not null,
  full_name text,
  role text default 'user'::text,
  created_at timestamp with time zone default now(),
  email text,
  avatar_url text,
  short_description text
);

--
-- Name: v_emotion_training_data; Type: VIEW; Schema: public; Owner: -
--
create view public.v_emotion_training_data as
select
  'session'::text as source_type,
  e.id as emotion_log_id,
  m.session_id,
  m.id as source_id,
  m.role as message_role,
  m.content,
  m.created_at as message_created_at,
  s.title as session_title,
  s.reviewed,
  s.reviewed_by,
  s.created_at as session_created_at,
  s.order_index as session_order_index,
  r.full_name as reviewed_by_name,
  tr.created_at as treatment_created_at,
  tr.status as treatment_status,
  tr.title as treatment_name,
  tr.id as treatment_id,
  tr.goal_id,
  goals.title as goal,
  tr.user_id,
  tr.team_id,
  (
    select
      json_agg(
        distinct jsonb_build_object('id', u2.id, 'name', u2.full_name)
      ) as json_agg
    from
      public.users u2
    where
      (
        u2.id = any (
          (
            (
              select
                array_agg(distinct tm2.user_id) as array_agg
              from
                public.team_members tm2
              where
                (tm2.team_id = tr.team_id)
            ) || tr.shared_with
          )
        )
      )
  ) as supporting_therapists,
  (
    select
      array_agg(distinct u2.id) as array_agg
    from
      public.users u2
    where
      (
        u2.id = any (
          (
            (
              select
                array_agg(distinct tm2.user_id) as array_agg
              from
                public.team_members tm2
              where
                (tm2.team_id = tr.team_id)
            ) || tr.shared_with
          )
        )
      )
  ) as supporting_therapist_ids,
  u.full_name,
  e.emotion as original_emotion,
  e.tone as original_tone,
  e.intensity as original_intensity,
  e.topic as original_topic,
  e.alignment_score as original_alignment_score,
  a.corrected_emotion,
  a.corrected_intensity,
  a.corrected_tone,
  a.corrected_topic,
  a.corrected_alignment_score,
  COALESCE(a.corrected_emotion, e.emotion) as emotion,
  COALESCE(a.corrected_tone, e.tone) as tone,
  COALESCE(a.corrected_intensity, e.intensity) as intensity,
  COALESCE(a.corrected_topic, e.topic) as topic,
  COALESCE(a.corrected_alignment_score, e.alignment_score) as alignment_score,
  a.note,
  a.flag_reason,
  a.flagged,
  a.updated_at as annotation_updated_at,
  a.updated_by as annotation_updated_by,
  t.full_name as annotation_updated_by_name,
  e.created_at as tagged_at,
  case
    when (a.updated_at is not null) then 5
    when (
      (e.alignment_score >= 0.9)
      and (e.intensity >= 0.8)
    ) then 5
    when (
      (e.alignment_score >= 0.9)
      and (e.intensity >= 0.4)
    ) then 4
    when (
      (e.alignment_score >= 0.7)
      and (e.intensity >= 0.8)
    ) then 4
    when (
      (e.alignment_score >= 0.6)
      and (e.intensity >= 0.6)
    ) then 3
    when (
      (e.alignment_score >= 0.4)
      and (e.intensity >= 0.4)
    ) then 2
    when (
      (e.alignment_score >= 0.2)
      or (e.intensity >= 0.2)
    ) then 2
    else 1
  end as score
from
  (
    (
      (
        (
          (
            (
              (
                (
                  public.messages m
                  left join public.emotion_logs e on (
                    (
                      (e.source_type = 'session'::text)
                      and (m.id = e.source_id)
                    )
                  )
                )
                left join lateral (
                  select
                    a1.id,
                    a1.source_type,
                    a1.source_id,
                    a1.created_at,
                    a1.updated_at,
                    a1.updated_by,
                    a1.corrected_emotion,
                    a1.corrected_intensity,
                    a1.corrected_tone,
                    a1.corrected_topic,
                    a1.corrected_alignment_score,
                    a1.note,
                    a1.emotion_summary,
                    a1.flag_reason,
                    a1.flagged
                  from
                    public.annotations a1
                  where
                    (
                      (a1.source_type = 'session'::text)
                      and (a1.source_id = m.id)
                    )
                  order by
                    a1.updated_at desc
                  limit
                    1
                ) a on (true)
              )
              left join public.sessions s on ((m.session_id = s.id))
            )
            left join public.treatments tr on ((s.treatment_id = tr.id))
          )
          left join public.users u on ((tr.user_id = u.id))
        )
        left join public.users t on ((a.updated_by = t.id))
      )
      left join public.users r on ((s.reviewed_by = r.id))
    )
    left join public.goals on ((goals.id = tr.goal_id))
  );

--
-- Name: v_snapshot_status; Type: VIEW; Schema: public; Owner: -
--
create view public.v_snapshot_status as
select
  null::uuid as id,
  null::text as name,
  null::text as job_status,
  null::integer as retry_count,
  null::timestamp with time zone as created_at,
  null::timestamp with time zone as last_event,
  null::bigint as total_events;

--
-- Name: emotion_log_changes id; Type: DEFAULT; Schema: public; Owner: -
--
alter table only public.emotion_log_changes
alter column id
set default nextval('public.emotion_log_changes_id_seq'::regclass);

--
-- Name: team_members id; Type: DEFAULT; Schema: public; Owner: -
--
alter table only public.team_members
alter column id
set default nextval('public.team_members_id_seq'::regclass);

--
-- Name: annotations annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.annotations
add constraint annotations_pkey primary key (id);

--
-- Name: category_team_links category_team_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.category_team_links
add constraint category_team_links_pkey primary key (category_id, team_id);

--
-- Name: category_user_links category_user_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.category_user_links
add constraint category_user_links_pkey primary key (category_id, user_id);

--
-- Name: debug_trigger_log debug_trigger_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.debug_trigger_log
add constraint debug_trigger_log_pkey primary key (id);

--
-- Name: emotion_log_changes emotion_log_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.emotion_log_changes
add constraint emotion_log_changes_pkey primary key (id);

--
-- Name: emotion_logs emotion_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.emotion_logs
add constraint emotion_logs_pkey primary key (id);

--
-- Name: fine_tune_events fine_tune_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.fine_tune_events
add constraint fine_tune_events_pkey primary key (id);

--
-- Name: fine_tune_locks fine_tune_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.fine_tune_locks
add constraint fine_tune_locks_pkey primary key (snapshot_id);

--
-- Name: fine_tune_snapshots fine_tune_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.fine_tune_snapshots
add constraint fine_tune_snapshots_pkey primary key (id);

--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.folders
add constraint folders_pkey primary key (id);

--
-- Name: goal_categories goal_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.goal_categories
add constraint goal_categories_pkey primary key (id);

--
-- Name: goal_category_links goal_category_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.goal_category_links
add constraint goal_category_links_pkey primary key (goal_id, category_id);

--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.goals
add constraint goals_pkey primary key (id);

--
-- Name: invite_logs invite_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.invite_logs
add constraint invite_logs_pkey primary key (id);

--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.messages
add constraint messages_pkey primary key (id);

--
-- Name: session_events session_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.session_events
add constraint session_events_pkey primary key (id);

--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.sessions
add constraint sessions_pkey primary key (id);

--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.settings
add constraint settings_pkey primary key (key);

--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.team_members
add constraint team_members_pkey primary key (id);

--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.teams
add constraint teams_pkey primary key (id);

--
-- Name: treatments treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.treatments
add constraint treatments_pkey primary key (id);

--
-- Name: fine_tune_events unique_job_status; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.fine_tune_events
add constraint unique_job_status unique (job_id, status);

--
-- Name: team_members unique_team_user; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.team_members
add constraint unique_team_user unique (team_id, user_id);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
alter table only public.users
add constraint users_pkey primary key (id);

--
-- Name: annotations_created_at_idx; Type: INDEX; Schema: public; Owner: -
--
create index annotations_created_at_idx on public.annotations using btree (created_at);

--
-- Name: annotations_source_idx; Type: INDEX; Schema: public; Owner: -
--
create index annotations_source_idx on public.annotations using btree (source_type, source_id);

--
-- Name: idx_events_snapshot; Type: INDEX; Schema: public; Owner: -
--
create index idx_events_snapshot on public.fine_tune_events using btree (snapshot_id);

--
-- Name: v_snapshot_status _RETURN; Type: RULE; Schema: public; Owner: -
--
create or replace view public.v_snapshot_status as
select
  s.id,
  s.name,
  s.job_status,
  s.retry_count,
  s.created_at,
  max(e.created_at) as last_event,
  count(e.*) as total_events
from
  (
    public.fine_tune_snapshots s
    left join public.fine_tune_events e on ((e.snapshot_id = s.id))
  )
group by
  s.id;

--
-- Name: users after_insert_users_team; Type: TRIGGER; Schema: public; Owner: -
--
create trigger after_insert_users_team
after INSERT on public.users for EACH row
execute FUNCTION public.set_team_from_invite ();

--
-- Name: annotations annotation_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--
create trigger annotation_delete_trigger
after DELETE on public.annotations for EACH row
execute FUNCTION public.track_emotion_log_delete ();

--
-- Name: annotations annotation_insert_trigger; Type: TRIGGER; Schema: public; Owner: -
--
create trigger annotation_insert_trigger
after INSERT on public.annotations for EACH row
execute FUNCTION public.track_emotion_log_insert ();

--
-- Name: annotations annotation_update_trigger; Type: TRIGGER; Schema: public; Owner: -
--
create trigger annotation_update_trigger
after
update on public.annotations for EACH row
execute FUNCTION public.track_emotion_log_update ();

--
-- Name: users before_insert_user_trigger; Type: TRIGGER; Schema: public; Owner: -
--
create trigger before_insert_user_trigger BEFORE INSERT on public.users for EACH row
execute FUNCTION public.set_user_role_from_invite ();

--
-- Name: emotion_logs emotion_log_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--
create trigger emotion_log_delete_trigger
after DELETE on public.emotion_logs for EACH row
execute FUNCTION public.track_emotion_log_delete ();

--
-- Name: emotion_logs emotion_log_insert_trigger; Type: TRIGGER; Schema: public; Owner: -
--
create trigger emotion_log_insert_trigger
after INSERT on public.emotion_logs for EACH row
execute FUNCTION public.track_emotion_log_insert ();

--
-- Name: emotion_logs emotion_log_update_trigger; Type: TRIGGER; Schema: public; Owner: -
--
create trigger emotion_log_update_trigger
after
update on public.emotion_logs for EACH row
execute FUNCTION public.track_emotion_log_update ();

--
-- Name: sessions on_session_end; Type: TRIGGER; Schema: public; Owner: -
--
create trigger on_session_end
after
update OF ended_at on public.sessions for EACH row when (
  (
    (old.ended_at is null)
    and (new.ended_at is not null)
  )
)
execute FUNCTION public.handle_session_end ();

--
-- Name: category_team_links category_team_links_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.category_team_links
add constraint category_team_links_category_id_fkey foreign KEY (category_id) references public.goal_categories (id) on delete CASCADE;

--
-- Name: category_team_links category_team_links_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.category_team_links
add constraint category_team_links_team_id_fkey foreign KEY (team_id) references public.teams (id) on delete CASCADE;

--
-- Name: category_user_links category_user_links_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.category_user_links
add constraint category_user_links_category_id_fkey foreign KEY (category_id) references public.goal_categories (id) on delete CASCADE;

--
-- Name: category_user_links category_user_links_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.category_user_links
add constraint category_user_links_user_id_fkey foreign KEY (user_id) references public.users (id) on delete CASCADE;

--
-- Name: emotion_logs emotion_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.emotion_logs
add constraint emotion_logs_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete set null;

--
-- Name: fine_tune_events fine_tune_events_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.fine_tune_events
add constraint fine_tune_events_snapshot_id_fkey foreign KEY (snapshot_id) references public.fine_tune_snapshots (id) on delete CASCADE;

--
-- Name: fine_tune_events fine_tune_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.fine_tune_events
add constraint fine_tune_events_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete set null;

--
-- Name: fine_tune_locks fine_tune_locks_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.fine_tune_locks
add constraint fine_tune_locks_snapshot_id_fkey foreign KEY (snapshot_id) references public.fine_tune_snapshots (id) on delete CASCADE;

--
-- Name: fine_tune_locks fine_tune_locks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.fine_tune_locks
add constraint fine_tune_locks_user_id_fkey foreign KEY (user_id) references public.users (id);

--
-- Name: fine_tune_snapshots fine_tune_snapshots_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.fine_tune_snapshots
add constraint fine_tune_snapshots_uploaded_by_fkey foreign KEY (uploaded_by) references public.users (id) on delete set null;

--
-- Name: fine_tune_snapshots fine_tune_snapshots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.fine_tune_snapshots
add constraint fine_tune_snapshots_user_id_fkey foreign KEY (user_id) references public.users (id);

--
-- Name: folders folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.folders
add constraint folders_parent_id_fkey foreign KEY (parent_id) references public.folders (id);

--
-- Name: folders folders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.folders
add constraint folders_user_id_fkey foreign KEY (user_id) references auth.users (id);

--
-- Name: goal_category_links goal_category_links_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.goal_category_links
add constraint goal_category_links_category_id_fkey foreign KEY (category_id) references public.goal_categories (id) on delete CASCADE;

--
-- Name: goal_category_links goal_category_links_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.goal_category_links
add constraint goal_category_links_goal_id_fkey foreign KEY (goal_id) references public.goals (id) on delete CASCADE;

--
-- Name: invite_logs invite_logs_inviter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.invite_logs
add constraint invite_logs_inviter_id_fkey foreign KEY (inviter_id) references auth.users (id);

--
-- Name: messages messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.messages
add constraint messages_session_id_fkey foreign KEY (session_id) references public.sessions (id) on delete CASCADE;

--
-- Name: session_events session_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.session_events
add constraint session_events_session_id_fkey foreign KEY (session_id) references public.sessions (id) on delete CASCADE;

--
-- Name: session_events session_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.session_events
add constraint session_events_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE;

--
-- Name: sessions sessions_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.sessions
add constraint sessions_reviewed_by_fkey foreign KEY (reviewed_by) references public.users (id);

--
-- Name: sessions sessions_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.sessions
add constraint sessions_treatment_id_fkey foreign KEY (treatment_id) references public.treatments (id) on delete CASCADE;

--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.team_members
add constraint team_members_team_id_fkey foreign KEY (team_id) references public.teams (id);

--
-- Name: teams teams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.teams
add constraint teams_created_by_fkey foreign KEY (created_by) references auth.users (id);

--
-- Name: treatments treatments_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.treatments
add constraint treatments_folder_id_fkey foreign KEY (folder_id) references public.folders (id);

--
-- Name: treatments treatments_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.treatments
add constraint treatments_goal_id_fkey foreign KEY (goal_id) references public.goals (id);

--
-- Name: treatments treatments_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.treatments
add constraint treatments_team_id_fkey foreign KEY (team_id) references public.teams (id);

--
-- Name: treatments treatments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.treatments
add constraint treatments_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE;

--
-- Name: team_members users; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.team_members
add constraint users foreign KEY (user_id) references public.users (id) on update CASCADE on delete CASCADE;

--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
alter table only public.users
add constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE;

--
-- Name: fine_tune_locks Allow authenticated users to create lock; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow authenticated users to create lock" on public.fine_tune_locks for INSERT to authenticated
with
  check (true);

--
-- Name: emotion_logs Allow authenticated users to insert emotion logs; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow authenticated users to insert emotion logs" on public.emotion_logs for INSERT
with
  check ((auth.uid () is not null));

--
-- Name: treatments Allow authenticated users to insert new treatments; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow authenticated users to insert new treatments" on public.treatments for INSERT to authenticated
with
  check (true);

--
-- Name: fine_tune_snapshots Allow authenticated users to insert snapshots; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow authenticated users to insert snapshots" on public.fine_tune_snapshots for INSERT
with
  check ((auth.uid () is not null));

--
-- Name: fine_tune_locks Allow authenticated users to read all locks; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow authenticated users to read all locks" on public.fine_tune_locks for
select
  to authenticated using (true);

--
-- Name: fine_tune_events Allow authenticated users to read events for their snapshots; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow authenticated users to read events for their snapshots" on public.fine_tune_events for
select
  using ((auth.uid () = user_id));

--
-- Name: emotion_logs Allow authenticated users to select emotion logs; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow authenticated users to select emotion logs" on public.emotion_logs for
select
  using ((auth.uid () is not null));

--
-- Name: emotion_logs Allow authenticated users to update their emotion logs; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow authenticated users to update their emotion logs" on public.emotion_logs
for update
  using ((auth.uid () = user_id));

--
-- Name: fine_tune_locks Allow authenticated users to update their own locks; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow authenticated users to update their own locks" on public.fine_tune_locks
for update
  using ((auth.uid () = user_id))
with
  check ((auth.uid () = user_id));

--
-- Name: fine_tune_snapshots Allow authenticated users to update their snapshots; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow authenticated users to update their snapshots" on public.fine_tune_snapshots
for update
  to authenticated using ((auth.uid () = user_id));

--
-- Name: messages Allow message access for treatment owner; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow message access for treatment owner" on public.messages using (
  (
    exists (
      select
        1
      from
        (
          public.sessions s
          join public.treatments t on ((t.id = s.treatment_id))
        )
      where
        (
          (s.id = messages.session_id)
          and (t.user_id = auth.uid ())
        )
    )
  )
);

--
-- Name: messages Allow message access via shared_with or team; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow message access via shared_with or team" on public.messages using (
  (
    exists (
      select
        1
      from
        (
          (
            public.sessions s
            join public.treatments t on ((t.id = s.treatment_id))
          )
          left join public.team_members tm on ((tm.team_id = t.team_id))
        )
      where
        (
          (s.id = messages.session_id)
          and (
            (auth.uid () = any (t.shared_with))
            or (tm.user_id = auth.uid ())
          )
        )
    )
  )
);

--
-- Name: fine_tune_snapshots Allow read for auth users; Type: POLICY; Schema: public; Owner: -
--
create policy "Users can read their own snapshots" on public.fine_tune_snapshots for
select
  to authenticated using ((auth.role () = 'authenticated'::text) AND (auth.uid() = user_id));

--
-- Name: folders Allow read if folder has treatments shared with user; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow read if folder has treatments shared with user" on public.folders for
select
  using (
    (
      exists (
        select
          1
        from
          public.treatments
        where
          (
            (treatments.folder_id = folders.id)
            and (
              (auth.uid () = treatments.user_id)
              or (auth.uid () = any (treatments.shared_with))
              or (
                treatments.team_id in (
                  select
                    team_members.team_id
                  from
                    public.team_members
                  where
                    (team_members.user_id = auth.uid ())
                )
              )
            )
          )
      )
    )
  );

--
-- Name: treatments Allow reading treatments shared with me; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow reading treatments shared with me" on public.treatments for
select
  using (
    (
      (auth.uid () = user_id)
      or (auth.uid () = any (shared_with))
      or (
        team_id in (
          select
            team_members.team_id
          from
            public.team_members
          where
            (team_members.user_id = auth.uid ())
        )
      )
    )
  );

--
-- Name: users Allow reading users who shared treatments with me; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow reading users who shared treatments with me" on public.users for
select
  using (
    (
      exists (
        select
          1
        from
          public.treatments t
        where
          (
            (t.user_id = users.id)
            and (
              (auth.uid () = any (t.shared_with))
              or (
                t.team_id in (
                  select
                    team_members.team_id
                  from
                    public.team_members
                  where
                    (team_members.user_id = auth.uid ())
                )
              )
            )
          )
      )
    )
  );

CREATE OR REPLACE VIEW v_my_role AS
SELECT id, role
FROM users
WHERE id = auth.uid();


CREATE POLICY "Admins can read all users"
ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM v_my_role
    WHERE role = 'admin'
  )
);

-- Allows admins to "see" all rows (for aggregate functions like count(*))
CREATE POLICY "Admins can count sessions"
ON sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM v_my_role WHERE role = 'admin'
  )
);

-- Allows admins to "see" all rows (for aggregate functions like count(*))
CREATE POLICY "Admins can count invites"
ON invite_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM v_my_role WHERE role = 'admin'
  )
);

create or replace function admin_weekly_trends()
returns table (
  week text,
  new_users integer,
  new_sessions integer
)
language sql
as $$
  select
    to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
    count(*) filter (where source = 'users') as new_users,
    count(*) filter (where source = 'sessions') as new_sessions
  from (
    select created_at, 'users' as source from users
    union all
    select created_at, 'sessions' as source from sessions
  ) as combined
  group by 1
  order by 1;
$$;


--
-- Name: invite_logs Allow service insert only; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow service insert only" on public.invite_logs for INSERT to service_role
with
  check (true);

--
-- Name: users Allow system to insert new users; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow system to insert new users" on public.users for INSERT
with
  check (true);

--
-- Name: teams Allow system to read from teams; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow system to read from teams" on public.teams for
select
  using (true);

--
-- Name: team_members Allow system to read team members; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow system to read team members" on public.team_members for
select
  using (true);

--
-- Name: debug_trigger_log Allow system to write logs; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow system to write logs" on public.debug_trigger_log for INSERT
with
  check (true);

--
-- Name: teams Allow team members to see their team metadata; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow team members to see their team metadata" on public.teams for
select
  using (
    (
      exists (
        select
          1
        from
          public.team_members
        where
          (
            (team_members.team_id = teams.id)
            and (team_members.user_id = auth.uid ())
          )
      )
    )
  );

--
-- Name: team_members Allow therapists to see their team memberships; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow therapists to see their team memberships" on public.team_members for
select
  using ((auth.uid () = user_id));

--
-- Name: treatments Allow treatment owner to access their treatments; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow treatment owner to access their treatments" on public.treatments using ((user_id = auth.uid ()));

--
-- Name: sessions Allow treatment owner to insert new sessions; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow treatment owner to insert new sessions" on public.sessions for INSERT to authenticated
with
  check (
    (
      exists (
        select
          1
        from
          public.treatments tr
        where
          (
            (tr.id = sessions.treatment_id)
            and (tr.user_id = auth.uid ())
          )
      )
    )
  );

--
-- Name: team_members Allow user to see own team memberships; Type: POLICY; Schema: public; Owner: -
--
create policy "Allow user to see own team memberships" on public.team_members for
select
  using ((user_id = auth.uid ()));

--
-- Name: users Everyone can read therapists; Type: POLICY; Schema: public; Owner: -
--
create policy "Everyone can read therapists" on public.users for
select
  to authenticated using (
    (
      (auth.role () = 'authenticated'::text)
      and (role = 'therapist'::text)
    )
  );

--
-- Name: teams Members can read their teams; Type: POLICY; Schema: public; Owner: -
--
create policy "Members can read their teams" on public.teams for
select
  using (
    (
      exists (
        select
          1
        from
          public.team_members tm
        where
          (
            (tm.team_id = teams.id)
            and (tm.user_id = auth.uid ())
          )
      )
    )
  );

--
-- Name: invite_logs users can read their own sent invites; Type: POLICY; Schema: public; Owner: -
--
CREATE POLICY "Users can read their own sent invites"
ON invite_logs
FOR SELECT
USING (
  auth.uid() = inviter_id
);

--
-- Name: users Team members can read users in their team; Type: POLICY; Schema: public; Owner: -
--
create policy "Team members can read users in their team" on public.users for
select
  using (
    (
      exists (
        select
          1
        from
          public.team_members tm
        where
          (
            (tm.user_id = users.id)
            and (
              tm.team_id in (
                select
                  team_members.team_id
                from
                  public.team_members
                where
                  (team_members.user_id = auth.uid ())
              )
            )
          )
      )
    )
  );

--
-- Name: sessions Therapist can access shared sessions; Type: POLICY; Schema: public; Owner: -
--
create policy "Therapist can access shared sessions" on public.sessions to authenticated using (
  (
    exists (
      select
        1
      from
        public.treatments tr
      where
        (
          (tr.id = sessions.treatment_id)
          and (
            (auth.uid () = any (tr.shared_with))
            or (
              exists (
                select
                  1
                from
                  public.team_members tm
                where
                  (
                    (tm.team_id = tr.team_id)
                    and (tm.user_id = auth.uid ())
                  )
              )
            )
          )
        )
    )
  )
);

--
-- Name: sessions Users can access their own sessions; Type: POLICY; Schema: public; Owner: -
--
create policy "Users can access their own sessions" on public.sessions to authenticated using (
  (
    exists (
      select
        1
      from
        public.treatments tr
      where
        (
          (tr.id = sessions.treatment_id)
          and (tr.user_id = auth.uid ())
        )
    )
  )
);

--
-- Name: folders Users can delete their folders; Type: POLICY; Schema: public; Owner: -
--
create policy "Users can delete their folders" on public.folders for DELETE using ((auth.uid () = user_id));

--
-- Name: folders Users can insert their own folders; Type: POLICY; Schema: public; Owner: -
--
create policy "Users can insert their own folders" on public.folders for INSERT
with
  check ((auth.uid () = user_id));

--
-- Name: users Users can read their own profile; Type: POLICY; Schema: public; Owner: -
--
create policy "Users can read their own profile" on public.users for
select
  to authenticated using (
    (
      (auth.role () = 'authenticated'::text)
      and (id = auth.uid ())
    )
  );

--
-- Name: invite_logs Users can update their sent invites; Type: POLICY; Schema: public; Owner: -
--
create policy "Users can update their sent or received invites"
on public.invite_logs
for update
using (
  (
    inviter_id = auth.uid()
    OR
    to_email = (
      select users.email
      from public.users
      where users.id = auth.uid()
    )
  )
)
with check (
  (
    inviter_id = auth.uid()
    OR
    to_email = (
      select users.email
      from public.users
      where users.id = auth.uid()
    )
  )
);

--
-- Name: session_events Users can view events of sessions they own or have access to; Type: POLICY; Schema: public; Owner: -
--
create policy "Users can view events of sessions they own or have access to" on public.session_events using (
  (
    exists (
      select
        1
      from
        (
          (
            public.sessions s
            join public.treatments t on ((t.id = s.treatment_id))
          )
          left join public.team_members tm on ((tm.team_id = t.team_id))
        )
      where
        (
          (s.id = session_events.session_id)
          and (
            (t.user_id = auth.uid ())
            or (auth.uid () = any (t.shared_with))
            or (tm.user_id = auth.uid ())
          )
        )
    )
  )
);

--
-- Name: fine_tune_events allow authenticated users to insert events; Type: POLICY; Schema: public; Owner: -
--
create policy "allow authenticated users to insert events" on public.fine_tune_events for INSERT to authenticated
with
  check (true);

--
-- Name: fine_tune_events allow authenticated users to update their own events; Type: POLICY; Schema: public; Owner: -
--
create policy "allow authenticated users to update their own events" on public.fine_tune_events
for update
  to authenticated using ((auth.uid () = user_id))
with
  check ((auth.uid () = user_id));

--
-- Name: team_members allow system to insert new team members; Type: POLICY; Schema: public; Owner: -
--
create policy "allow system to insert new team members" on public.team_members for INSERT
with
  check (true);

--
-- Name: invite_logs allow_inviter_insert_own_log; Type: POLICY; Schema: public; Owner: -
--
create policy allow_inviter_insert_own_log on public.invite_logs for INSERT
with
  check ((inviter_id = auth.uid ()));

--
-- Name: debug_trigger_log; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.debug_trigger_log ENABLE row LEVEL SECURITY;

--
-- Name: fine_tune_events; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.fine_tune_events ENABLE row LEVEL SECURITY;

--
-- Name: fine_tune_locks; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.fine_tune_locks ENABLE row LEVEL SECURITY;

--
-- Name: fine_tune_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.fine_tune_snapshots ENABLE row LEVEL SECURITY;

--
-- Name: folders; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.folders ENABLE row LEVEL SECURITY;

--
-- Name: invite_logs; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.invite_logs ENABLE row LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.messages ENABLE row LEVEL SECURITY;

--
-- Name: session_events; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.session_events ENABLE row LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.sessions ENABLE row LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.team_members ENABLE row LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.teams ENABLE row LEVEL SECURITY;

--
-- Name: treatments; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.treatments ENABLE row LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--
alter table public.users ENABLE row LEVEL SECURITY;

--
-- Name: folders users can view their folders; Type: POLICY; Schema: public; Owner: -
--
create policy "users can view their folders" on public.folders for
select
  using (
    (
      (auth.uid () = user_id)
      or (auth.uid () = any (shared_with))
    )
  );

-- Enable RLS
alter table admin_audit_logs enable row level security;

CREATE POLICY "Users can read their own audit logs"
ON admin_audit_logs
FOR SELECT
TO authenticated
USING (
  actor_id = auth.uid()
);

CREATE POLICY "Users can update their own audit logs"
ON admin_audit_logs
FOR UPDATE
TO authenticated
USING (
  actor_id = auth.uid()
)
WITH CHECK (
  actor_id = auth.uid()
);

CREATE POLICY "Admins can insert audit logs"
ON admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--
grant USAGE on SCHEMA public to postgres;

grant USAGE on SCHEMA public to anon;

grant USAGE on SCHEMA public to authenticated;

grant USAGE on SCHEMA public to service_role;

--
-- Name: FUNCTION call_poll_fn(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.call_poll_fn () to anon;

grant all on FUNCTION public.call_poll_fn () to authenticated;

grant all on FUNCTION public.call_poll_fn () to service_role;

--
-- Name: FUNCTION check_invite_limit(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.check_invite_limit () to anon;

grant all on FUNCTION public.check_invite_limit () to authenticated;

grant all on FUNCTION public.check_invite_limit () to service_role;

--
-- Name: FUNCTION copy_email_from_auth(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.copy_email_from_auth () to anon;

grant all on FUNCTION public.copy_email_from_auth () to authenticated;

grant all on FUNCTION public.copy_email_from_auth () to service_role;

--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.handle_new_user () to anon;

grant all on FUNCTION public.handle_new_user () to authenticated;

grant all on FUNCTION public.handle_new_user () to service_role;

--
-- Name: FUNCTION handle_session_end(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.handle_session_end () to anon;

grant all on FUNCTION public.handle_session_end () to authenticated;

grant all on FUNCTION public.handle_session_end () to service_role;

--
-- Name: FUNCTION is_team_member(session_team_id uuid); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.is_team_member (session_team_id uuid) to anon;

grant all on FUNCTION public.is_team_member (session_team_id uuid) to authenticated;

grant all on FUNCTION public.is_team_member (session_team_id uuid) to service_role;

--
-- Name: FUNCTION list_clients_for_therapist(therapist_uuid uuid); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.list_clients_for_therapist (therapist_uuid uuid) to anon;

grant all on FUNCTION public.list_clients_for_therapist (therapist_uuid uuid) to authenticated;

grant all on FUNCTION public.list_clients_for_therapist (therapist_uuid uuid) to service_role;

--
-- Name: FUNCTION list_flagged_sessions(therapist_uuid uuid); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.list_flagged_sessions (therapist_uuid uuid) to anon;

grant all on FUNCTION public.list_flagged_sessions (therapist_uuid uuid) to authenticated;

grant all on FUNCTION public.list_flagged_sessions (therapist_uuid uuid) to service_role;

--
-- Name: FUNCTION list_therapist_clients(therapist_uuid uuid); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.list_therapist_clients (therapist_uuid uuid) to anon;

grant all on FUNCTION public.list_therapist_clients (therapist_uuid uuid) to authenticated;

grant all on FUNCTION public.list_therapist_clients (therapist_uuid uuid) to service_role;

--
-- Name: FUNCTION set_team_from_invite(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.set_team_from_invite () to anon;

grant all on FUNCTION public.set_team_from_invite () to authenticated;

grant all on FUNCTION public.set_team_from_invite () to service_role;

--
-- Name: FUNCTION set_user_role_from_invite(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.set_user_role_from_invite () to anon;

grant all on FUNCTION public.set_user_role_from_invite () to authenticated;

grant all on FUNCTION public.set_user_role_from_invite () to service_role;

--
-- Name: FUNCTION track_emotion_log_delete(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.track_emotion_log_delete () to anon;

grant all on FUNCTION public.track_emotion_log_delete () to authenticated;

grant all on FUNCTION public.track_emotion_log_delete () to service_role;

--
-- Name: FUNCTION track_emotion_log_insert(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.track_emotion_log_insert () to anon;

grant all on FUNCTION public.track_emotion_log_insert () to authenticated;

grant all on FUNCTION public.track_emotion_log_insert () to service_role;

--
-- Name: FUNCTION track_emotion_log_update(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.track_emotion_log_update () to anon;

grant all on FUNCTION public.track_emotion_log_update () to authenticated;

grant all on FUNCTION public.track_emotion_log_update () to service_role;

--
-- Name: FUNCTION validate_emotion_log_source(); Type: ACL; Schema: public; Owner: -
--
grant all on FUNCTION public.validate_emotion_log_source () to anon;

grant all on FUNCTION public.validate_emotion_log_source () to authenticated;

grant all on FUNCTION public.validate_emotion_log_source () to service_role;

--
-- Name: TABLE annotations; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.annotations to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.annotations to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.annotations to service_role;

--
-- Name: TABLE category_team_links; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.category_team_links to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.category_team_links to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.category_team_links to service_role;

--
-- Name: TABLE category_user_links; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.category_user_links to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.category_user_links to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.category_user_links to service_role;

--
-- Name: TABLE debug_trigger_log; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.debug_trigger_log to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.debug_trigger_log to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.debug_trigger_log to service_role;

grant INSERT on table public.debug_trigger_log to supabase_auth_admin;

--
-- Name: TABLE emotion_log_changes; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.emotion_log_changes to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.emotion_log_changes to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.emotion_log_changes to service_role;

--
-- Name: SEQUENCE emotion_log_changes_id_seq; Type: ACL; Schema: public; Owner: -
--
grant all on SEQUENCE public.emotion_log_changes_id_seq to anon;

grant all on SEQUENCE public.emotion_log_changes_id_seq to authenticated;

grant all on SEQUENCE public.emotion_log_changes_id_seq to service_role;

--
-- Name: TABLE emotion_logs; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.emotion_logs to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.emotion_logs to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.emotion_logs to service_role;

--
-- Name: TABLE fine_tune_events; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.fine_tune_events to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.fine_tune_events to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.fine_tune_events to service_role;

--
-- Name: TABLE fine_tune_locks; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.fine_tune_locks to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.fine_tune_locks to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.fine_tune_locks to service_role;

--
-- Name: TABLE fine_tune_snapshots; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.fine_tune_snapshots to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.fine_tune_snapshots to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.fine_tune_snapshots to service_role;

--
-- Name: TABLE folders; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.folders to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.folders to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.folders to service_role;

--
-- Name: TABLE goal_categories; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.goal_categories to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.goal_categories to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.goal_categories to service_role;

--
-- Name: TABLE goal_category_links; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.goal_category_links to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.goal_category_links to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.goal_category_links to service_role;

--
-- Name: TABLE goals; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.goals to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.goals to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.goals to service_role;

--
-- Name: TABLE invite_logs; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.invite_logs to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.invite_logs to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.invite_logs to service_role;

grant
select
  on table public.invite_logs to supabase_auth_admin;

--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.messages to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.messages to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.messages to service_role;

--
-- Name: TABLE session_events; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.session_events to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.session_events to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.session_events to service_role;

--
-- Name: TABLE sessions; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.sessions to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.sessions to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.sessions to service_role;

--
-- Name: TABLE settings; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.settings to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.settings to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.settings to service_role;

--
-- Name: TABLE team_members; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.team_members to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.team_members to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.team_members to service_role;

grant
select
,
  INSERT on table public.team_members to supabase_auth_admin;

--
-- Name: SEQUENCE team_members_id_seq; Type: ACL; Schema: public; Owner: -
--
grant all on SEQUENCE public.team_members_id_seq to anon;

grant all on SEQUENCE public.team_members_id_seq to authenticated;

grant all on SEQUENCE public.team_members_id_seq to service_role;

--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.teams to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.teams to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.teams to service_role;

grant
select
  on table public.teams to supabase_auth_admin;

--
-- Name: TABLE treatments; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.treatments to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.treatments to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.treatments to service_role;

--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.users to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.users to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.users to service_role;

grant
select
,
  INSERT,
  DELETE,
update on table public.users to supabase_auth_admin;

--
-- Name: TABLE v_emotion_training_data; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.v_emotion_training_data to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.v_emotion_training_data to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.v_emotion_training_data to service_role;

--
-- Name: TABLE v_snapshot_status; Type: ACL; Schema: public; Owner: -
--
grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.v_snapshot_status to anon;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.v_snapshot_status to authenticated;

grant
select
,
  INSERT,
  references,
  DELETE,
  TRIGGER,
truncate,
update on table public.v_snapshot_status to service_role;

insert into
  "public"."goal_categories" (
    "id",
    "name",
    "description",
    "created_at",
    "updated_at"
  )
values
  (
    '2ce121d5-fece-4bfa-9157-3bc1ee3e7731',
    'Cognitive Goals',
    'Challenging thinking patterns and building mental clarity',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '3e9b34c3-6975-4e44-b3d3-865b925b5fbb',
    'Trauma & Healing',
    'Processing trauma and building safety',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '454db690-41bf-4ba1-acbc-1224c56d6440',
    'Life Transition Goals',
    'Adapting to new roles and life changes',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '57919896-cf20-46b2-a804-092dc8a3892d',
    'Behavioral Goals',
    'Developing better habits and routines',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '7030b9af-9e1b-467b-ac8b-eedee7559065',
    'Self‑Awareness & Personal Growth',
    'Understanding and developing oneself',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'cf9a8e78-3724-4b90-8f1d-9574fc6c17a0',
    'Mindset & Well‑being',
    'Fostering resilience, balance, and quality of life',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'd4fce785-3c4e-4087-82e7-0c19589f8d44',
    'Relationship & Social Goals',
    'Improving connections with others',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'e91c71c2-ce5f-43e8-bd25-574133e956f6',
    'Emotional Regulation',
    'Managing feelings like anxiety, anger, and depression',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  );

insert into
  "public"."goals" (
    "id",
    "title",
    "description",
    "created_at",
    "updated_at"
  )
values
  (
    '0984eebb-4200-4707-9cb4-a2863a8af1e1',
    'Minimize addictive or harmful behavior',
    'Develop coping strategies for addiction and harmful habits',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '0e209d19-0e43-4939-9be4-7c2c9f9f01bc',
    'Develop relaxation and mindfulness practices',
    'Develop relaxation techniques and mindfulness habits',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '191c01d1-93d3-4ad3-8f3a-aeefe66abd10',
    'Reduce anxiety',
    'Develop strategies to decrease feelings of anxiety',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '1a192f43-0290-4f22-96d2-9fa8b794a91d',
    'Establish or maintain boundaries',
    'Develop the ability to set and respect boundaries',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '1a75f437-d027-4b1b-889b-14e52239128c',
    'Increase social connections',
    'Develop habits and skills for nurturing connections',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '1be09ae8-813d-4180-b3a6-a9acb51e8c76',
    'Integrate trauma narratives in a healthy way',
    'Develop methods for processing and integrating trauma narratives',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '1d335213-d2c5-4dca-821b-a8dc8242ba2a',
    'Enhance productivity and focus',
    'Develop habits for increased efficiency and productivity',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '20b5eb65-c80b-472a-8765-4c0fa4a6241e',
    'Build better habits (sleep, exercise, routine)',
    'Develop consistent habits for overall well‑being',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '22817c89-2d34-4628-8b77-10358b9bd998',
    'Develop problem‑solving strategies',
    'Develop structured approaches to problem‑solving',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '2d36ddbb-1c33-40b7-9b21-18cc15b7fab4',
    'Maintain balance during relocations or moves',
    'Develop strategies for maintaining stability during moves',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '2f4b4c35-33ee-49f2-8fe3-8ab241ff5afc',
    'Improve communication with partner/family',
    'Develop effective communication skills for closer relationships',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '3253cde7-0b84-4833-b5e9-bc0e7a334cc2',
    'Build resilience through divorce or separation',
    'Develop habits and coping strategies for navigating separation',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '32632c5f-5892-4c23-bbf7-86d638cec10b',
    'Maintain consistency and discipline',
    'Develop structures and accountability for sustaining habits',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '38fb5068-b5e7-4aa4-83ba-66f047c28c59',
    'Reduce conflict or tension',
    'Develop tools to de-escalate conflict and reduce tension',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '3d42cb46-5ae0-4129-ab26-d63e3a1dcea4',
    'Practice self‑compassion',
    'Develop habits and techniques for nurturing self-compassion',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '40579765-5d6a-4b55-90ab-62adb171f4d8',
    'Increase mental clarity and decision‑making',
    'Develop habits for making clearer, more confident decisions',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '40d4f1de-8b09-46ee-b0f4-9dadf7e63a1f',
    'Maintain a sense of purpose and meaning',
    'Develop habits for aligning daily life with deeper values',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '413ad659-2f29-4d47-af04-d76e6d682f49',
    'Reduce avoidance or procrastination',
    'Develop discipline and techniques for addressing avoidance',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '44c5fc46-152b-496b-a523-4f68e9a5404d',
    'Build resilience and grit',
    'Develop strength and resilience for challenging times',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '4cf2e10f-f29d-4c8b-8596-5b7253b0da89',
    'Manage sadness or depression',
    'Develop tools and habits for managing depressive thoughts',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '4f4910a9-83e1-4791-bf42-099ea609e515',
    'Enhance mindfulness and present‑moment focus',
    'Develop habits for focusing attention on the present',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '543bccaa-bc22-4e94-b65f-ee0f7ccdf6e0',
    'Build emotional resilience',
    'Develop the ability to recover quickly from emotional setbacks',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '55c460f0-5d67-43a9-9f9e-4566ca6a5a55',
    'Challenge and reframe negative thoughts',
    'Develop habits for identifying and reshaping thought patterns',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '5943ce50-8bbc-4c72-9460-8ee5c95310f1',
    'Reduce self‑criticism',
    'Develop strategies for cultivating a compassionate inner voice',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '5f4e0126-cc35-4f07-b221-0fe8451b95a3',
    'Develop a sense of safety and stability',
    'Develop habits for cultivating a safe and stable environment',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '6015ae1b-03e0-4114-a9a7-2a4155ecadc3',
    'Clarify personal values and priorities',
    'Develop a deeper understanding of core values',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '61a16e8d-ce53-48de-a7c8-729188dd62eb',
    'Reduce catastrophic thinking',
    'Develop techniques for managing and reframing catastrophic thoughts',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '66f6bf91-a538-4dd2-a937-a8a1d5424057',
    'Develop a calmer state of mind',
    'Practice mindfulness and relaxation to maintain a calmer state',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '67cf4f28-a53a-4c69-87f8-65b86422eab6',
    'Build trust and intimacy',
    'Develop deeper trust and intimacy in relationships',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '8ce5d9bf-e8cc-4f19-a04a-773df021b2dd',
    'Increase gratitude and positivity',
    'Develop habits for nurturing a grateful, optimistic outlook',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '95917e8e-5da6-489d-bdfc-7ccbdb734001',
    'Cope with trauma or PTSD',
    'Develop coping strategies for managing trauma and PTSD',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '96fbec9c-17f1-4b30-937e-60f031299be1',
    'Reduce flashbacks or intrusive memories',
    'Develop techniques for managing intrusive thoughts',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    '9a770540-7cc1-4033-a64b-726e800ea572',
    'Improve overall quality of life',
    'Develop habits for nurturing long‑term well‑being',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'a01a2c6f-afe3-4df7-a518-0e9a15c8eb87',
    'Enhance focus and motivation',
    'Develop habits for increased focus and motivation',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'b336aba2-9775-4e41-86a3-0743b27fd3c1',
    'Enhance assertiveness',
    'Develop assertiveness and the ability to express needs clearly',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'b9f471d9-8389-4a0e-b4f4-c3ad9d248397',
    'Develop better work‑life balance',
    'Develop habits for aligning personal and professional priorities',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'be25659e-158a-46c2-9abd-396a67f001d3',
    'Build a growth mindset',
    'Develop resilience and a mindset oriented toward learning and improvement',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'c28681a5-325c-4d2b-a475-649dd9a879e5',
    'Cope with grief and loss',
    'Develop coping and support strategies for managing loss',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'c3a05853-6708-4640-b780-263509b93693',
    'Build self‑confidence and self‑esteem',
    'Develop habits and mindset for greater self-worth',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'd316f4a8-1ebe-499d-89ab-d5cc16cf87ca',
    'Adjust to a new role (parent, caregiver, employee)',
    'Develop coping strategies for role changes',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'dce3ff13-094a-40c7-b7a6-143060eb5703',
    'Minimize overthinking or rumination',
    'Develop mindfulness techniques to reduce overthinking',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'e009ce4d-6006-4170-937d-5204d4f85182',
    'Identify and understand emotions',
    'Develop emotional literacy and self-awareness',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'e2e98a6c-70dd-4d3e-8a67-a22d5d3c6fda',
    'Build trust in relationships post‑trauma',
    'Develop trust and emotional safety after trauma',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'e97b7a07-1a02-4177-b447-e05f6d7bb4bc',
    'Minimize intrusive thoughts',
    'Develop habits and techniques for reducing intrusive thoughts',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'eb686095-2295-4d90-b7c2-c189400c9808',
    'Decrease feelings of anger',
    'Learn techniques to recognize and reduce anger',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'ebd82bc4-f1ab-474a-8cd5-01114db48349',
    'Cope with heartbreak or separation',
    'Develop resilience and coping strategies for heartbreak',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'f0efaa81-676e-4e41-a691-1142130c07a8',
    'Reduce overwhelm',
    'Develop coping strategies for feelings of being overwhelmed',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  ),
  (
    'fb3612ab-15ce-4aa8-8af8-bb423aed3725',
    'Adapt to career changes or job loss',
    'Develop resilience and adaptability for career transitions',
    '2025-06-25 17:38:22.781922+00',
    '2025-06-25 17:38:22.781922+00'
  );

insert into
  "public"."goal_category_links" ("goal_id", "category_id")
values
  (
    '0984eebb-4200-4707-9cb4-a2863a8af1e1',
    '57919896-cf20-46b2-a804-092dc8a3892d'
  ),
  (
    '0e209d19-0e43-4939-9be4-7c2c9f9f01bc',
    '57919896-cf20-46b2-a804-092dc8a3892d'
  ),
  (
    '191c01d1-93d3-4ad3-8f3a-aeefe66abd10',
    'e91c71c2-ce5f-43e8-bd25-574133e956f6'
  ),
  (
    '1a192f43-0290-4f22-96d2-9fa8b794a91d',
    'd4fce785-3c4e-4087-82e7-0c19589f8d44'
  ),
  (
    '1a75f437-d027-4b1b-889b-14e52239128c',
    'd4fce785-3c4e-4087-82e7-0c19589f8d44'
  ),
  (
    '1be09ae8-813d-4180-b3a6-a9acb51e8c76',
    '3e9b34c3-6975-4e44-b3d3-865b925b5fbb'
  ),
  (
    '1d335213-d2c5-4dca-821b-a8dc8242ba2a',
    '57919896-cf20-46b2-a804-092dc8a3892d'
  ),
  (
    '20b5eb65-c80b-472a-8765-4c0fa4a6241e',
    '57919896-cf20-46b2-a804-092dc8a3892d'
  ),
  (
    '22817c89-2d34-4628-8b77-10358b9bd998',
    '2ce121d5-fece-4bfa-9157-3bc1ee3e7731'
  ),
  (
    '2d36ddbb-1c33-40b7-9b21-18cc15b7fab4',
    '454db690-41bf-4ba1-acbc-1224c56d6440'
  ),
  (
    '2f4b4c35-33ee-49f2-8fe3-8ab241ff5afc',
    'd4fce785-3c4e-4087-82e7-0c19589f8d44'
  ),
  (
    '3253cde7-0b84-4833-b5e9-bc0e7a334cc2',
    '454db690-41bf-4ba1-acbc-1224c56d6440'
  ),
  (
    '32632c5f-5892-4c23-bbf7-86d638cec10b',
    '57919896-cf20-46b2-a804-092dc8a3892d'
  ),
  (
    '38fb5068-b5e7-4aa4-83ba-66f047c28c59',
    'd4fce785-3c4e-4087-82e7-0c19589f8d44'
  ),
  (
    '3d42cb46-5ae0-4129-ab26-d63e3a1dcea4',
    '7030b9af-9e1b-467b-ac8b-eedee7559065'
  ),
  (
    '40579765-5d6a-4b55-90ab-62adb171f4d8',
    '2ce121d5-fece-4bfa-9157-3bc1ee3e7731'
  ),
  (
    '40d4f1de-8b09-46ee-b0f4-9dadf7e63a1f',
    'cf9a8e78-3724-4b90-8f1d-9574fc6c17a0'
  ),
  (
    '413ad659-2f29-4d47-af04-d76e6d682f49',
    '57919896-cf20-46b2-a804-092dc8a3892d'
  ),
  (
    '44c5fc46-152b-496b-a523-4f68e9a5404d',
    'cf9a8e78-3724-4b90-8f1d-9574fc6c17a0'
  ),
  (
    '4cf2e10f-f29d-4c8b-8596-5b7253b0da89',
    'e91c71c2-ce5f-43e8-bd25-574133e956f6'
  ),
  (
    '4f4910a9-83e1-4791-bf42-099ea609e515',
    'cf9a8e78-3724-4b90-8f1d-9574fc6c17a0'
  ),
  (
    '543bccaa-bc22-4e94-b65f-ee0f7ccdf6e0',
    'e91c71c2-ce5f-43e8-bd25-574133e956f6'
  ),
  (
    '55c460f0-5d67-43a9-9f9e-4566ca6a5a55',
    '2ce121d5-fece-4bfa-9157-3bc1ee3e7731'
  ),
  (
    '5943ce50-8bbc-4c72-9460-8ee5c95310f1',
    '7030b9af-9e1b-467b-ac8b-eedee7559065'
  ),
  (
    '5f4e0126-cc35-4f07-b221-0fe8451b95a3',
    '3e9b34c3-6975-4e44-b3d3-865b925b5fbb'
  ),
  (
    '6015ae1b-03e0-4114-a9a7-2a4155ecadc3',
    '7030b9af-9e1b-467b-ac8b-eedee7559065'
  ),
  (
    '61a16e8d-ce53-48de-a7c8-729188dd62eb',
    '2ce121d5-fece-4bfa-9157-3bc1ee3e7731'
  ),
  (
    '66f6bf91-a538-4dd2-a937-a8a1d5424057',
    'e91c71c2-ce5f-43e8-bd25-574133e956f6'
  ),
  (
    '67cf4f28-a53a-4c69-87f8-65b86422eab6',
    'd4fce785-3c4e-4087-82e7-0c19589f8d44'
  ),
  (
    '8ce5d9bf-e8cc-4f19-a04a-773df021b2dd',
    'cf9a8e78-3724-4b90-8f1d-9574fc6c17a0'
  ),
  (
    '95917e8e-5da6-489d-bdfc-7ccbdb734001',
    '3e9b34c3-6975-4e44-b3d3-865b925b5fbb'
  ),
  (
    '96fbec9c-17f1-4b30-937e-60f031299be1',
    '3e9b34c3-6975-4e44-b3d3-865b925b5fbb'
  ),
  (
    '9a770540-7cc1-4033-a64b-726e800ea572',
    'cf9a8e78-3724-4b90-8f1d-9574fc6c17a0'
  ),
  (
    'a01a2c6f-afe3-4df7-a518-0e9a15c8eb87',
    '7030b9af-9e1b-467b-ac8b-eedee7559065'
  ),
  (
    'b336aba2-9775-4e41-86a3-0743b27fd3c1',
    'd4fce785-3c4e-4087-82e7-0c19589f8d44'
  ),
  (
    'b9f471d9-8389-4a0e-b4f4-c3ad9d248397',
    'cf9a8e78-3724-4b90-8f1d-9574fc6c17a0'
  ),
  (
    'be25659e-158a-46c2-9abd-396a67f001d3',
    '7030b9af-9e1b-467b-ac8b-eedee7559065'
  ),
  (
    'c28681a5-325c-4d2b-a475-649dd9a879e5',
    '454db690-41bf-4ba1-acbc-1224c56d6440'
  ),
  (
    'c3a05853-6708-4640-b780-263509b93693',
    '7030b9af-9e1b-467b-ac8b-eedee7559065'
  ),
  (
    'd316f4a8-1ebe-499d-89ab-d5cc16cf87ca',
    '454db690-41bf-4ba1-acbc-1224c56d6440'
  ),
  (
    'dce3ff13-094a-40c7-b7a6-143060eb5703',
    '2ce121d5-fece-4bfa-9157-3bc1ee3e7731'
  ),
  (
    'e009ce4d-6006-4170-937d-5204d4f85182',
    '7030b9af-9e1b-467b-ac8b-eedee7559065'
  ),
  (
    'e2e98a6c-70dd-4d3e-8a67-a22d5d3c6fda',
    '3e9b34c3-6975-4e44-b3d3-865b925b5fbb'
  ),
  (
    'e97b7a07-1a02-4177-b447-e05f6d7bb4bc',
    'e91c71c2-ce5f-43e8-bd25-574133e956f6'
  ),
  (
    'eb686095-2295-4d90-b7c2-c189400c9808',
    'e91c71c2-ce5f-43e8-bd25-574133e956f6'
  ),
  (
    'ebd82bc4-f1ab-474a-8cd5-01114db48349',
    'd4fce785-3c4e-4087-82e7-0c19589f8d44'
  ),
  (
    'f0efaa81-676e-4e41-a691-1142130c07a8',
    'e91c71c2-ce5f-43e8-bd25-574133e956f6'
  ),
  (
    'fb3612ab-15ce-4aa8-8af8-bb423aed3725',
    '454db690-41bf-4ba1-acbc-1224c56d6440'
  );
--
-- PostgreSQL database dump complete
--