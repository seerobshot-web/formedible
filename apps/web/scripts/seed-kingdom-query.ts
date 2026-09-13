/**
 * Seeds a demo "Kingdom Query" personality assessment survey.
 *
 * Usage:
 *   1. Apply supabase/migrations/0001_kingdom_query.sql and
 *      0002_kingdom_query_archetypes_and_growth.sql to your Supabase project.
 *   2. Sign up once at /kingdom-query/login so an owner account exists.
 *   3. Fill in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      KINGDOM_QUERY_SEED_OWNER_EMAIL.
 *   4. Run: npx tsx scripts/seed-kingdom-query.ts
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerEmail = process.env.KINGDOM_QUERY_SEED_OWNER_EMAIL;

if (!url || !serviceKey || !ownerEmail) {
  console.error(
    "Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KINGDOM_QUERY_SEED_OWNER_EMAIL"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) throw userErr;
  const owner = users.users.find((u) => u.email === ownerEmail);
  if (!owner) {
    throw new Error(
      `No Supabase Auth user found for ${ownerEmail}. Sign up at /kingdom-query/login first.`
    );
  }

  const surveyId = randomUUID();
  const slug = "spiritual-gifts-demo";

  const { error: surveyErr } = await supabase.from("kq_surveys").upsert({
    id: surveyId,
    owner_id: owner.id,
    title: "Spiritual Gifts Assessment (Demo)",
    description: "A short demo personality/gifting assessment for Kingdom Query.",
    slug,
    status: "published",
    theme: { primaryColor: "#6d28d9", backgroundColor: "#ffffff" },
    intro: {
      title: "Discover Your Spiritual Gifts",
      body: "Answer a few quick questions and we'll surface where you're naturally gifted to serve.",
      buttonLabel: "Begin",
    },
    thank_you: {
      title: "Thank you!",
      body: "Your results have been recorded. A leader may follow up with you soon.",
    },
    ask_opt_in: true,
    opt_in_label: "I'd like a leader to follow up with me about serving opportunities",
    anti_abuse_mode: "cookie",
  });
  if (surveyErr) throw surveyErr;

  const q = (overrides: Record<string, unknown>) => ({ id: randomUUID(), survey_id: surveyId, ...overrides });

  const questions = [
    q({
      type: "short_text",
      title: "What's your first name?",
      position: 0,
      required: true,
      options: null,
      logic: [],
    }),
    q({
      type: "multiple_choice",
      title: "When a project needs doing, you're the one who...",
      description: "Pick the option that sounds most like you.",
      position: 1,
      required: true,
      logic: [],
      options: [
        { id: "leading", label: "Rallies people and casts the vision", scores: { leadership: 3, teaching: 1 } },
        { id: "serving", label: "Quietly gets the practical work done", scores: { service: 3 } },
        { id: "teaching", label: "Explains what everyone needs to know", scores: { teaching: 3 } },
        { id: "encouraging", label: "Checks in on how people are doing", scores: { mercy: 3, service: 1 } },
      ],
    }),
    q({
      type: "multiple_choice",
      title: "You feel most energized when...",
      position: 2,
      required: true,
      logic: [],
      options: [
        { id: "planning", label: "Planning and organizing the next big thing", scores: { leadership: 2 } },
        { id: "helping", label: "Helping someone who's struggling", scores: { mercy: 2, service: 1 } },
        { id: "studying", label: "Digging into a topic and sharing what you learned", scores: { teaching: 2 } },
        { id: "giving", label: "Giving generously toward a need", scores: { giving: 3 } },
      ],
    }),
    q({
      type: "rating",
      title: "How comfortable are you speaking in front of a group?",
      position: 3,
      required: true,
      options: null,
      logic: [],
    }),
    q({
      type: "long_text",
      title: "Tell us about a time you felt you were exactly where you were meant to be.",
      position: 4,
      required: false,
      options: null,
      logic: [],
    }),
    q({
      type: "email",
      title: "What's your email?",
      description: "So a leader can follow up if you opt in.",
      position: 5,
      required: true,
      options: null,
      logic: [],
    }),
  ];

  const { error: qErr } = await supabase.from("kq_questions").upsert(questions);
  if (qErr) throw qErr;

  const profiles = [
    { id: randomUUID(), survey_id: surveyId, key: "leadership", label: "Leadership", description: "Natural at casting vision and rallying others.", expression: null },
    { id: randomUUID(), survey_id: surveyId, key: "service", label: "Service", description: "Gifted at practical, behind-the-scenes help.", expression: null },
    { id: randomUUID(), survey_id: surveyId, key: "teaching", label: "Teaching", description: "Gifted at explaining and clarifying truth.", expression: "teaching * 1.2" },
    { id: randomUUID(), survey_id: surveyId, key: "mercy", label: "Mercy", description: "Gifted at comforting and caring for the hurting.", expression: null },
    { id: randomUUID(), survey_id: surveyId, key: "giving", label: "Giving", description: "Gifted at generosity.", expression: null },
  ];

  const { error: pErr } = await supabase.from("kq_scoring_profiles").upsert(profiles);
  if (pErr) throw pErr;

  const leaderId = randomUUID();
  const serverId = randomUUID();
  const archetypes = [
    {
      id: leaderId,
      survey_id: surveyId,
      key: "leader",
      label: "The Leader",
      scoring_rule: { type: "highest_trait", trait: "leadership" },
      result_title: "You're a Leader!",
      result_body: "You're wired to cast vision and rally people toward a goal.",
      position: 0,
    },
    {
      id: serverId,
      survey_id: surveyId,
      key: "server",
      label: "The Servant",
      scoring_rule: { type: "weighted_sum", weights: { service: 1, mercy: 0.5 } },
      result_title: "You're a Servant!",
      result_body: "You're gifted at practical, behind-the-scenes care for others.",
      position: 1,
    },
    {
      id: randomUUID(),
      survey_id: surveyId,
      key: "teacher",
      label: "The Teacher",
      scoring_rule: { type: "expression", expression: "teaching + giving * 0.2" },
      result_title: "You're a Teacher!",
      result_body: "You're gifted at explaining truth in a way that sticks.",
      position: 2,
    },
  ];
  const { error: archErr } = await supabase.from("kq_archetypes").upsert(archetypes);
  if (archErr) throw archErr;

  const subprofiles = [
    {
      id: randomUUID(),
      archetype_id: leaderId,
      survey_id: surveyId,
      key: "leader_visionary",
      label: "Visionary",
      scoring_rule: { type: "highest_trait", trait: "leadership" },
      result_title: "Visionary Leader",
      result_body: "You see where things could go before anyone else does.",
      position: 0,
    },
    {
      id: randomUUID(),
      archetype_id: serverId,
      survey_id: surveyId,
      key: "server_encourager",
      label: "Encourager",
      scoring_rule: { type: "highest_trait", trait: "mercy" },
      result_title: "Encouraging Servant",
      result_body: "People feel cared for the moment they're around you.",
      position: 0,
    },
  ];
  const { error: subErr } = await supabase.from("kq_subprofiles").upsert(subprofiles);
  if (subErr) throw subErr;

  console.log(`Seeded demo survey "${slug}" for ${ownerEmail}.`);
  console.log(`Take it at /s/${slug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
