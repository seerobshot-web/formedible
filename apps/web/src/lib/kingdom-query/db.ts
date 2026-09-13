import { getSupabaseClient } from "./supabase-client";
import type {
  AnswerValue,
  ScoringProfile,
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
  const [{ data: survey, error: surveyErr }, { data: questions, error: qErr }, { data: profiles, error: pErr }] =
    await Promise.all([
      supabase.from("kq_surveys").select("*").eq("id", id).single(),
      supabase.from("kq_questions").select("*").eq("survey_id", id).order("position"),
      supabase.from("kq_scoring_profiles").select("*").eq("survey_id", id),
    ]);
  if (surveyErr) throw surveyErr;
  if (qErr) throw qErr;
  if (pErr) throw pErr;
  return {
    ...(survey as Survey),
    questions: questions as SurveyQuestion[],
    scoring_profiles: profiles as ScoringProfile[],
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

  const [{ data: questions, error: qErr }, { data: profiles, error: pErr }] = await Promise.all([
    supabase.from("kq_questions").select("*").eq("survey_id", survey.id).order("position"),
    supabase.from("kq_scoring_profiles").select("*").eq("survey_id", survey.id),
  ]);
  if (qErr) throw qErr;
  if (pErr) throw pErr;

  return {
    ...(survey as Survey),
    questions: questions as SurveyQuestion[],
    scoring_profiles: profiles as ScoringProfile[],
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
  patch: { scores: Record<string, number>; opted_in: boolean }
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("kq_responses")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      scores: patch.scores,
      opted_in: patch.opted_in,
    })
    .eq("id", responseId);
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
