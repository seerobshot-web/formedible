-- Kingdom Query: archetypes/sub-profiles, respondent accounts (CRUD on own
-- responses), and growth scaffolding (leads, newsletter, payment embeds).
-- Depends on 0001_kingdom_query.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Archetypes: the top-level "you are a ___" result, chosen by whichever
-- archetype's scoring_rule evaluates highest against a completed response's
-- trait scores.
-- ---------------------------------------------------------------------------
create table if not exists kq_archetypes (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references kq_surveys (id) on delete cascade,
  key text not null,
  label text not null,
  description text,
  -- { type: 'highest_trait', trait: string }
  -- | { type: 'expression', expression: string }
  -- | { type: 'weighted_sum', weights: Record<string, number> }
  scoring_rule jsonb not null default '{"type":"highest_trait","trait":""}',
  result_title text,
  result_body text,
  result_cta_label text,
  result_cta_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (survey_id, key)
);

create index if not exists kq_archetypes_survey_idx on kq_archetypes (survey_id, position);

-- ---------------------------------------------------------------------------
-- Sub-profiles: a second-tier result nested under one archetype, resolved
-- the same way but only among sub-profiles belonging to the winning archetype.
-- ---------------------------------------------------------------------------
create table if not exists kq_subprofiles (
  id uuid primary key default gen_random_uuid(),
  archetype_id uuid not null references kq_archetypes (id) on delete cascade,
  survey_id uuid not null references kq_surveys (id) on delete cascade,
  key text not null,
  label text not null,
  description text,
  scoring_rule jsonb not null default '{"type":"highest_trait","trait":""}',
  result_title text,
  result_body text,
  result_cta_label text,
  result_cta_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (archetype_id, key)
);

create index if not exists kq_subprofiles_archetype_idx on kq_subprofiles (archetype_id, position);
create index if not exists kq_subprofiles_survey_idx on kq_subprofiles (survey_id);

-- ---------------------------------------------------------------------------
-- Responses: record which archetype/sub-profile a completed response landed
-- on, and (optionally) which signed-up user claimed the response so they can
-- come back and view/edit/delete it later.
-- ---------------------------------------------------------------------------
alter table kq_responses add column if not exists archetype_id uuid references kq_archetypes (id) on delete set null;
alter table kq_responses add column if not exists subprofile_id uuid references kq_subprofiles (id) on delete set null;
alter table kq_responses add column if not exists respondent_user_id uuid references auth.users (id) on delete set null;

create index if not exists kq_responses_respondent_user_idx on kq_responses (respondent_user_id);

-- ---------------------------------------------------------------------------
-- Growth scaffolding: leads, newsletter subscriptions, payment embeds.
-- These tables are intentionally simple/normalized so a UI can be layered on
-- top; only newsletter + lead capture are wired into the survey runtime for
-- now (see kingdom-query README), payment embeds are config-only until a
-- real payment provider integration is added.
-- ---------------------------------------------------------------------------
create table if not exists kq_leads (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references kq_surveys (id) on delete cascade,
  response_id uuid references kq_responses (id) on delete set null,
  name text,
  email text,
  phone text,
  source text not null default 'survey_completion',
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists kq_leads_survey_idx on kq_leads (survey_id, created_at desc);

create table if not exists kq_newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references kq_surveys (id) on delete cascade,
  response_id uuid references kq_responses (id) on delete set null,
  email text not null,
  subscribed boolean not null default true,
  source text not null default 'survey_opt_in',
  created_at timestamptz not null default now(),
  unique (survey_id, email)
);

create table if not exists kq_payment_embeds (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references kq_surveys (id) on delete cascade,
  -- optional: attach the embed to a specific question step instead of the
  -- thank-you screen (e.g. an upsell shown right after an archetype reveal)
  question_id uuid references kq_questions (id) on delete set null,
  provider text not null default 'stripe' check (provider in ('stripe', 'paypal', 'custom')),
  embed_type text not null default 'checkout_link' check (embed_type in ('checkout_link', 'payment_element', 'custom_html')),
  label text not null default 'Checkout',
  -- checkout_link: { url: string }
  -- payment_element: { publishableKey: string, priceId: string }
  -- custom_html: { html: string }
  config jsonb not null default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists kq_payment_embeds_survey_idx on kq_payment_embeds (survey_id, position);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table kq_archetypes enable row level security;
alter table kq_subprofiles enable row level security;
alter table kq_leads enable row level security;
alter table kq_newsletter_subscriptions enable row level security;
alter table kq_payment_embeds enable row level security;

-- archetypes: owner CRUD, public read on published survey
drop policy if exists kq_archetypes_owner_all on kq_archetypes;
create policy kq_archetypes_owner_all on kq_archetypes
  for all using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  );

drop policy if exists kq_archetypes_public_read on kq_archetypes;
create policy kq_archetypes_public_read on kq_archetypes
  for select using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.status = 'published')
  );

-- subprofiles: same shape
drop policy if exists kq_subprofiles_owner_all on kq_subprofiles;
create policy kq_subprofiles_owner_all on kq_subprofiles
  for all using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  );

drop policy if exists kq_subprofiles_public_read on kq_subprofiles;
create policy kq_subprofiles_public_read on kq_subprofiles
  for select using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.status = 'published')
  );

-- leads: owner reads/manages; public (anon) can insert only, from the survey flow
drop policy if exists kq_leads_owner_all on kq_leads;
create policy kq_leads_owner_all on kq_leads
  for all using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  );

drop policy if exists kq_leads_public_insert on kq_leads;
create policy kq_leads_public_insert on kq_leads
  for insert with check (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.status = 'published')
  );

-- newsletter subscriptions: same shape as leads
drop policy if exists kq_newsletter_owner_all on kq_newsletter_subscriptions;
create policy kq_newsletter_owner_all on kq_newsletter_subscriptions
  for all using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  );

drop policy if exists kq_newsletter_public_insert on kq_newsletter_subscriptions;
create policy kq_newsletter_public_insert on kq_newsletter_subscriptions
  for insert with check (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.status = 'published')
  );

-- payment embeds: owner-managed; public can read configs on a published
-- survey so the runtime can render them
drop policy if exists kq_payment_embeds_owner_all on kq_payment_embeds;
create policy kq_payment_embeds_owner_all on kq_payment_embeds
  for all using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.owner_id = auth.uid())
  );

drop policy if exists kq_payment_embeds_public_read on kq_payment_embeds;
create policy kq_payment_embeds_public_read on kq_payment_embeds
  for select using (
    exists (select 1 from kq_surveys s where s.id = survey_id and s.status = 'published')
  );

-- ---------------------------------------------------------------------------
-- Respondent CRUD: a respondent who signs up after taking a survey can claim
-- their (anonymous) response and later view/edit/delete it, independent of
-- the survey's open/closed status or the owner-only policies above.
-- ---------------------------------------------------------------------------
drop policy if exists kq_responses_respondent_all on kq_responses;
create policy kq_responses_respondent_all on kq_responses
  for all using (respondent_user_id = auth.uid())
  with check (respondent_user_id = auth.uid());

drop policy if exists kq_answers_respondent_all on kq_answers;
create policy kq_answers_respondent_all on kq_answers
  for all using (
    exists (select 1 from kq_responses r where r.id = response_id and r.respondent_user_id = auth.uid())
  ) with check (
    exists (select 1 from kq_responses r where r.id = response_id and r.respondent_user_id = auth.uid())
  );

-- Claiming a response requires proving you hold its respondent_token (the
-- opaque id stored in the browser that created it) -- a plain RLS UPDATE
-- policy can't express "you know a secret", so this is a security-definer
-- RPC instead. It only ever sets respondent_user_id on a still-unclaimed row.
create or replace function kq_claim_response(p_response_id uuid, p_token text)
returns void as $$
begin
  update kq_responses
  set respondent_user_id = auth.uid()
  where id = p_response_id
    and respondent_token = p_token
    and respondent_user_id is null
    and auth.uid() is not null;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Let a respondent keep reading a survey's questions/archetypes/scoring
-- profiles/sub-profiles from their "My results" page even after the survey
-- is unpublished or closed, as long as they hold a claimed response for it.
-- (The existing *_public_read policies only allow status = 'published'.)
-- ---------------------------------------------------------------------------
drop policy if exists kq_surveys_respondent_read on kq_surveys;
create policy kq_surveys_respondent_read on kq_surveys
  for select using (
    exists (
      select 1 from kq_responses r
      where r.survey_id = id and r.respondent_user_id = auth.uid()
    )
  );

drop policy if exists kq_questions_respondent_read on kq_questions;
create policy kq_questions_respondent_read on kq_questions
  for select using (
    exists (
      select 1 from kq_responses r
      where r.survey_id = kq_questions.survey_id and r.respondent_user_id = auth.uid()
    )
  );

drop policy if exists kq_scoring_respondent_read on kq_scoring_profiles;
create policy kq_scoring_respondent_read on kq_scoring_profiles
  for select using (
    exists (
      select 1 from kq_responses r
      where r.survey_id = kq_scoring_profiles.survey_id and r.respondent_user_id = auth.uid()
    )
  );

drop policy if exists kq_archetypes_respondent_read on kq_archetypes;
create policy kq_archetypes_respondent_read on kq_archetypes
  for select using (
    exists (
      select 1 from kq_responses r
      where r.survey_id = kq_archetypes.survey_id and r.respondent_user_id = auth.uid()
    )
  );

drop policy if exists kq_subprofiles_respondent_read on kq_subprofiles;
create policy kq_subprofiles_respondent_read on kq_subprofiles
  for select using (
    exists (
      select 1 from kq_responses r
      where r.survey_id = kq_subprofiles.survey_id and r.respondent_user_id = auth.uid()
    )
  );

drop policy if exists kq_payment_embeds_respondent_read on kq_payment_embeds;
create policy kq_payment_embeds_respondent_read on kq_payment_embeds
  for select using (
    exists (
      select 1 from kq_responses r
      where r.survey_id = kq_payment_embeds.survey_id and r.respondent_user_id = auth.uid()
    )
  );
