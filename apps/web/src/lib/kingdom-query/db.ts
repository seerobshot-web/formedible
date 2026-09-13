import { getSupabaseClient } from "./supabase-client";
import type {
  AnswerValue,
  Archetype,
  Lead,
  NewsletterSubscription,
  PaymentEmbed,
  ScoringProfile,
  SubProfile,
  Survey,
  SurveyAnswer,
  SurveyQuestion,
  SurveyResponse,
  SurveyWithQuestions,
} from "./types";

// ---------------------------------------------------------------------------
// Surveys (creator/owner side)
// ---------------------------------------------------------------------------

export async function listMySurveys(): Promise<Survey[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("kq_surveys")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Survey[];
}

export async function createSurvey(input: {
  title: string;
  slug: string;
}): Promise<Survey> {
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Must be signed in to create a survey");

  const { data, error } = await supabase
    .from("kq_surveys")
    .insert({
      title: input.title,
      slug: input.slug,
      owner_id: userData.user.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Survey;
}

export async function updateSurvey(
  id: string,
  patch: Partial<Survey>
): Promise<Survey> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("kq_surveys")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Survey;
}

export async function deleteSurvey(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("kq_surveys").delete().eq("id", id);
  if (error) throw error;
}

export async function getSurveyForEditing(id: string): Promise<SurveyWithQuestions> {
  const supabase = getSupabaseClient();
  const [
    { data: survey, error: surveyErr },
    { data: questions, error: qErr },
    { data: profiles, error: pErr },
    { data: archetypes, error: aErr },
    { data: subprofiles, error: spErr },
    { data: paymentEmbeds, error: peErr },
  ] = await Promise.all([
    supabase.from("kq_surveys").select("*").eq("id", id).single(),
    supabase.from("kq_questions").select("*").eq("survey_id", id).order("position"),
    supabase.from("kq_scoring_profiles").select("*").eq("survey_id", id),
    supabase.from("kq_archetypes").select("*").eq("survey_id", id).order("position"),
    supabase.from("kq_subprofiles").select("*").eq("survey_id", id).order("position"),
    supabase.from("kq_payment_embeds").select("*").eq("survey_id", id).order("position"),
  ]);
  if (surveyErr) throw surveyErr;
  if (qErr) throw qErr;
  if (pErr) throw pErr;
  if (aErr) throw aErr;
  if (spErr) throw spErr;
  if (peErr) throw peErr;
  return {
    ...(survey as Survey),
    questions: questions as SurveyQuestion[],
    scoring_profiles: profiles as ScoringProfile[],
    archetypes: archetypes as Archetype[],
    subprofiles: subprofiles as SubProfile[],
    payment_embeds: paymentEmbeds as PaymentEmbed[],
  };
}

export async function getPublishedSurveyBySlug(
  slug: string
): Promise<SurveyWithQuestions | null> {
  const supabase = getSupabaseClient();
  const { data: survey, error: surveyErr } = await supabase
    .from("kq_surveys")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (surveyErr) throw surveyErr;
  if (!survey) return null;

  const [
    { data: questions, error: qErr },
    { data: profiles, error: pErr },
    { data: archetypes, error: aErr },
    { data: subprofiles, error: spErr },
    { data: paymentEmbeds, error: peErr },
  ] = await Promise.all([
    supabase.from("kq_questions").select("*").eq("survey_id", survey.id).order("position"),
    supabase.from("kq_scoring_profiles").select("*").eq("survey_id", survey.id),
    supabase.from("kq_archetypes").select("*").eq("survey_id", survey.id).order("position"),
    supabase.from("kq_subprofiles").select("*").eq("survey_id", survey.id).order("position"),
    supabase.from("kq_payment_embeds").select("*").eq("survey_id", survey.id).order("position"),
  ]);
  if (qErr) throw qErr;
  if (pErr) throw pErr;
  if (aErr) throw aErr;
  if (spErr) throw spErr;
  if (peErr) throw peErr;

  return {
    ...(survey as Survey),
    questions: questions as SurveyQuestion[],
    scoring_profiles: profiles as ScoringProfile[],
    archetypes: archetypes as Archetype[],
    subprofiles: subprofiles as SubProfile[],
    payment_embeds: paymentEmbeds as PaymentEmbed[],
  };
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export async function upsertQuestions(
  surveyId: string,
  questions: SurveyQuestion[]
): Promise<SurveyQuestion[]> {
  const supabase = getSupabaseClient();
  const rows = questions.map((q, index) => ({
    ...q,
    survey_id: surveyId,
    position: index,
  }));
  const { data, error } = await supabase
    .from("kq_questions")
    .upsert(rows, { onConflict: "id" })
    .select("*");
  if (error) throw error;
  return data as SurveyQuestion[];
}

export async function deleteQuestion(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("kq_questions").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertScoringProfiles(
  surveyId: string,
  profiles: ScoringProfile[]
): Promise<ScoringProfile[]> {
  const supabase = getSupabaseClient();
  const rows = profiles.map((p) => ({ ...p, survey_id: surveyId }));
  const { data, error } = await supabase
    .from("kq_scoring_profiles")
    .upsert(rows, { onConflict: "id" })
    .select("*");
  if (error) throw error;
  return data as ScoringProfile[];
}

export async function deleteScoringProfile(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("kq_scoring_profiles").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Archetypes & sub-profiles
// ---------------------------------------------------------------------------

export async function upsertArchetypes(
  surveyId: string,
  archetypes: Archetype[]
): Promise<Archetype[]> {
  const supabase = getSupabaseClient();
  const rows = archetypes.map((a, index) => ({ ...a, survey_id: surveyId, position: index }));
  const { data, error } = await supabase
    .from("kq_archetypes")
    .upsert(rows, { onConflict: "id" })
    .select("*");
  if (error) throw error;
  return data as Archetype[];
}

export async function deleteArchetype(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("kq_archetypes").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertSubProfiles(
  surveyId: string,
  subprofiles: SubProfile[]
): Promise<SubProfile[]> {
  const supabase = getSupabaseClient();
  const rows = subprofiles.map((s) => ({ ...s, survey_id: surveyId }));
  const { data, error } = await supabase
    .from("kq_subprofiles")
    .upsert(rows, { onConflict: "id" })
    .select("*");
  if (error) throw error;
  return data as SubProfile[];
}

export async function deleteSubProfile(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("kq_subprofiles").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Growth: leads, newsletter subscriptions, payment embeds
// ---------------------------------------------------------------------------

export async function createLead(input: {
  survey_id: string;
  response_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string;
  notes?: string | null;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("kq_leads").insert(input);
  if (error) throw error;
}

export async function listLeadsForSurvey(surveyId: string): Promise<Lead[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("kq_leads")
    .select("*")
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function createNewsletterSubscription(input: {
  survey_id: string;
  response_id?: string | null;
  email: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("kq_newsletter_subscriptions")
    .upsert(input, { onConflict: "survey_id,email" });
  if (error) throw error;
}

export async function listNewsletterSubscriptionsForSurvey(
  surveyId: string
): Promise<NewsletterSubscription[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("kq_newsletter_subscriptions")
    .select("*")
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as NewsletterSubscription[];
}

export async function upsertPaymentEmbeds(
  surveyId: string,
  embeds: PaymentEmbed[]
): Promise<PaymentEmbed[]> {
  const supabase = getSupabaseClient();
  const rows = embeds.map((e, index) => ({ ...e, survey_id: surveyId, position: index }));
  const { data, error } = await supabase
    .from("kq_payment_embeds")
    .upsert(rows, { onConflict: "id" })
    .select("*");
  if (error) throw error;
  return data as PaymentEmbed[];
}

export async function deletePaymentEmbed(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("kq_payment_embeds").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Responses (public, anonymous respondent side)
// ---------------------------------------------------------------------------

export async function getOrCreateResponse(
  surveyId: string,
  respondentToken: string
): Promise<SurveyResponse> {
  const supabase = getSupabaseClient();
  const { data: existing, error: findErr } = await supabase
    .from("kq_responses")
    .select("*")
    .eq("survey_id", surveyId)
    .eq("respondent_token", respondentToken)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing as SurveyResponse;

  const { data, error } = await supabase
    .from("kq_responses")
    .insert({ survey_id: surveyId, respondent_token: respondentToken })
    .select("*")
    .single();
  if (error) throw error;
  return data as SurveyResponse;
}

export async function saveAnswer(
  responseId: string,
  questionId: string,
  value: AnswerValue
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("kq_answers")
    .upsert(
      { response_id: responseId, question_id: questionId, value },
      { onConflict: "response_id,question_id" }
    );
  if (error) throw error;
}

export async function getAnswersForResponse(responseId: string): Promise<SurveyAnswer[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("kq_answers")
    .select("*")
    .eq("response_id", responseId);
  if (error) throw error;
  return data as SurveyAnswer[];
}

export async function completeResponse(
  responseId: string,
  patch: {
    scores: Record<string, number>;
    opted_in: boolean;
    archetype_id?: string | null;
    subprofile_id?: string | null;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("kq_responses")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      scores: patch.scores,
      opted_in: patch.opted_in,
      archetype_id: patch.archetype_id ?? null,
      subprofile_id: patch.subprofile_id ?? null,
    })
    .eq("id", responseId);
  if (error) throw error;
}

/**
 * Links an anonymous response to the currently signed-in user, so they can
 * come back later (via listMyResponses/updateMyAnswer/deleteMyResponse) to
 * view, edit, or delete it. Verified server-side by the kq_claim_response
 * RPC, which only succeeds if `respondentToken` matches the response's
 * token and it isn't already claimed by someone else.
 */
export async function claimResponse(responseId: string, respondentToken: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("kq_claim_response", {
    p_response_id: responseId,
    p_token: respondentToken,
  });
  if (error) throw error;
}

export async function setRespondentEmail(responseId: string, email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("kq_responses")
    .update({ respondent_email: email })
    .eq("id", responseId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Results (owner side)
// ---------------------------------------------------------------------------

export async function listResponsesForSurvey(surveyId: string): Promise<SurveyResponse[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("kq_responses")
    .select("*")
    .eq("survey_id", surveyId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data as SurveyResponse[];
}

export async function listAnswersForSurvey(surveyId: string): Promise<SurveyAnswer[]> {
  const supabase = getSupabaseClient();
  const { data: responses, error: respErr } = await supabase
    .from("kq_responses")
    .select("id")
    .eq("survey_id", surveyId);
  if (respErr) throw respErr;
  const responseIds = (responses ?? []).map((r) => r.id);
  if (responseIds.length === 0) return [];

  const { data, error } = await supabase
    .from("kq_answers")
    .select("*")
    .in("response_id", responseIds);
  if (error) throw error;
  return data as SurveyAnswer[];
}

// ---------------------------------------------------------------------------
// "My results" (respondent CRUD on their own claimed responses)
// ---------------------------------------------------------------------------

export interface MyResponseSummary {
  response: SurveyResponse;
  survey: Survey;
}

export async function listMyResponses(): Promise<MyResponseSummary[]> {
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("kq_responses")
    .select("*, kq_surveys(*)")
    .eq("respondent_user_id", userData.user.id)
    .order("started_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { kq_surveys, ...response } = row as SurveyResponse & { kq_surveys: Survey };
    return { response: response as SurveyResponse, survey: kq_surveys };
  });
}

export async function getMyResponseDetail(
  responseId: string
): Promise<{ survey: SurveyWithQuestions; response: SurveyResponse; answers: SurveyAnswer[] }> {
  const supabase = getSupabaseClient();
  const { data: response, error: rErr } = await supabase
    .from("kq_responses")
    .select("*")
    .eq("id", responseId)
    .single();
  if (rErr) throw rErr;

  // Reuses the same fetch as the creator editor: questions/archetypes/etc.
  // are readable here too because they carry a "published survey" public
  // read policy, which covers a respondent viewing their own claimed answer.
  const [survey, { data: answers, error: aErr }] = await Promise.all([
    getSurveyForEditing(response.survey_id),
    supabase.from("kq_answers").select("*").eq("response_id", responseId),
  ]);
  if (aErr) throw aErr;

  return { survey, response: response as SurveyResponse, answers: answers as SurveyAnswer[] };
}

export async function updateMyAnswer(
  responseId: string,
  questionId: string,
  value: AnswerValue
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("kq_answers")
    .upsert(
      { response_id: responseId, question_id: questionId, value },
      { onConflict: "response_id,question_id" }
    );
  if (error) throw error;
}

export async function recomputeMyResponseScores(
  responseId: string,
  patch: {
    scores: Record<string, number>;
    archetype_id: string | null;
    subprofile_id: string | null;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("kq_responses")
    .update({
      scores: patch.scores,
      archetype_id: patch.archetype_id,
      subprofile_id: patch.subprofile_id,
    })
    .eq("id", responseId);
  if (error) throw error;
}

export async function deleteMyResponse(responseId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("kq_responses").delete().eq("id", responseId);
  if (error) throw error;
}
