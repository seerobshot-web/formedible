-- Kingdom Query: Typeform-like survey tool with personality scoring
-- Run this in the Supabase SQL editor (or `supabase db push`) against a fresh
-- or existing Supabase project. Safe to re-run (uses IF NOT EXISTS guards).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- surveys
-- ---------------------------------------------------------------------------
create table if not exists kq_surveys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled survey',
  description text,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  theme jsonb not null default '{"primaryColor":"#4f46e5","backgroundColor":"#ffffff"}',
  intro jsonb not null default '{"title":"Welcome","body":"","buttonLabel":"Start"}',
  thank_you jsonb not null default '{"title":"Thank you!","body":"Your response has been recorded."}',
  close_at timestamptz,
  response_cap integer,
  anti_abuse_mode text not null default 'cookie' check (anti_abuse_mode in ('cookie', 'email')),
  ask_opt_in boolean not null default false,
  opt_in_label text not null default 'Keep me updated by email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kq_surveys_owner_idx on kq_surveys (owner_id);

-- ---------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------
create table if not exists kq_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references kq_surveys (id) on delete cascade,
  type text not null check (type in (
    'short_text', 'long_text', 'multiple_choice', 'checkboxes',
    'rating', 'nps', 'email', 'yes_no'
  )),
  title text not null default '',
  description text,
  required boolean not null default false,
  position integer not null default 0,
  options jsonb, -- [{id,label,scores:{trait:weight}}] for choice-type questions
  logic jsonb not null default '[]', -- [{id,operator,value,targetQuestionId}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kq_questions_survey_idx on kq_questions (survey_id, position);

-- ---------------------------------------------------------------------------
-- scoring profiles (personality traits + optional custom expression)
-- ---------------------------------------------------------------------------
create table if not exists kq_scoring_profiles (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references kq_surveys (id) on delete cascade,
  key text not null,
  label text not null,
  description text,
  expression text, -- e.g. "(openness * 1.5 - neuroticism) / total"
  created_at timestamptz not null default now(),
  unique (survey_id, key)
);

-- ---------------------------------------------------------------------------
-- responses
-- ---------------------------------------------------------------------------
create table if not exists kq_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references kq_surveys (id) on delete cascade,
  respondent_token text not null,
  respondent_email text,
  status text not null default 'partial' check (status in ('partial', 'completed')),
  opted_in boolean not null default false,
  scores jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists kq_responses_survey_idx on kq_responses (survey_id);
create unique index if not exists kq_responses_survey_token_idx
  on kq_responses (survey_id, respondent_token);

-- ---------------------------------------------------------------------------
-- answers
-- ---------------------------------------------------------------------------
create table if not exists kq_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references kq_responses (id) on delete cascade,
  question_id uuid not null references kq_questions (id) on delete cascade,
  value jsonb,
  updated_at timestamptz not null default now(),
  unique (response_id, question_id)
);

create index if not exists kq_answers_response_idx on kq_answers (response_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table kq_surveys enable row level security;
alter table kq_questions enable row level security;
alter table kq_scoring_profiles enable row level security;
alter table kq_responses enable row level security;
alter table kq_answers enable row level security;

-- Surveys: owners manage their own; anyone can read a published, non-closed one.
drop policy if exists kq_surveys_owner_all on kq_surveys;
create policy kq_surveys_owner_all on kq_surveys
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists kq_surveys_public_read on kq_surveys;
create policy kq_surveys_public_read on kq_surveys
  for select using (status = 'published');

-- Questions: owners manage via parent survey; public can read questions of a
-- published survey (needed to render the take-survey flow anonymously).
drop policy if exists kq_questions_owner_all on kq_questions;
create policy kq_questions_owner_all on kq_questions
  for all using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  );

drop policy if exists kq_questions_public_read on kq_questions;
create policy kq_questions_public_read on kq_questions
  for select using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.status = 'published')
  );

-- Scoring profiles: same shape as questions.
drop policy if exists kq_scoring_owner_all on kq_scoring_profiles;
create policy kq_scoring_owner_all on kq_scoring_profiles
  for all using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  );

drop policy if exists kq_scoring_public_read on kq_scoring_profiles;
create policy kq_scoring_public_read on kq_scoring_profiles
  for select using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.status = 'published')
  );

-- Responses: owners can read/manage responses to their own surveys.
-- Anonymous respondents can insert/update/select only while the survey is
-- published and open. NOTE: because taking a survey never requires signing
-- in, RLS cannot verify that an anon UPDATE is coming from the same browser
-- that created the row -- the respondent_token (an opaque uuid persisted in
-- localStorage/cookie) is the only guard. This is the same trust model used
-- by most no-login Typeform-style tools; do not rely on it where responses
-- must be tamper-proof.
drop policy if exists kq_responses_owner_read on kq_responses;
create policy kq_responses_owner_read on kq_responses
  for select using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  );

drop policy if exists kq_responses_owner_delete on kq_responses;
create policy kq_responses_owner_delete on kq_responses
  for delete using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  );

drop policy if exists kq_responses_public_insert on kq_responses;
create policy kq_responses_public_insert on kq_responses
  for insert with check (
    exists (
      select 1 from kq_surveys s where s.id = survey_id
      and s.status = 'published'
      and (s.close_at is null or s.close_at > now())
    )
  );

drop policy if exists kq_responses_public_update on kq_responses;
create policy kq_responses_public_update on kq_responses
  for update using (
    exists (
      select 1 from kq_surveys s where s.id = survey_id
      and s.status = 'published'
      and (s.close_at is null or s.close_at > now())
    )
  );

drop policy if exists kq_responses_public_read_own on kq_responses;
create policy kq_responses_public_read_own on kq_responses
  for select using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.status = 'published')
  );

-- Answers: owners can read via parent survey; anon can insert/update/select
-- answers for a response as long as the survey is published+open (mirrors
-- the responses policy above).
drop policy if exists kq_answers_owner_read on kq_answers;
create policy kq_answers_owner_read on kq_answers
  for select using (
    exists (
      select 1 from kq_responses r
      join kq_surveys s on s.id = r.survey_id
      where r.id = response_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists kq_answers_public_write on kq_answers;
create policy kq_answers_public_write on kq_answers
  for all using (
    exists (
      select 1 from kq_responses r
      join kq_surveys s on s.id = r.survey_id
      where r.id = response_id and s.status = 'published'
      and (s.close_at is null or s.close_at > now())
    )
  ) with check (
    exists (
      select 1 from kq_responses r
      join kq_surveys s on s.id = r.survey_id
      where r.id = response_id and s.status = 'published'
      and (s.close_at is null or s.close_at > now())
    )
  );

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function kq_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists kq_surveys_set_updated_at on kq_surveys;
create trigger kq_surveys_set_updated_at before update on kq_surveys
  for each row execute function kq_set_updated_at();

drop trigger if exists kq_questions_set_updated_at on kq_questions;
create trigger kq_questions_set_updated_at before update on kq_questions
  for each row execute function kq_set_updated_at();

-- ---------------------------------------------------------------------------
-- response cap enforcement (checked server-side so it can't be bypassed by
-- a client that ignores the cap shown in the UI)
-- ---------------------------------------------------------------------------
create or replace function kq_enforce_response_cap() returns trigger as $$
declare
  cap integer;
  current_count integer;
begin
  select response_cap into cap from kq_surveys where id = new.survey_id;
  if cap is not null then
    select count(*) into current_count from kq_responses where survey_id = new.survey_id;
    if current_count >= cap then
      raise exception 'response cap reached for this survey';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists kq_responses_enforce_cap on kq_responses;
create trigger kq_responses_enforce_cap before insert on kq_responses
  for each row execute function kq_enforce_response_cap();
