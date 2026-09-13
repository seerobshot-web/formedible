export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "checkboxes"
  | "rating"
  | "nps"
  | "email"
  | "yes_no";

export interface ChoiceOption {
  id: string;
  label: string;
  /** Optional per-trait score weight awarded when this option is picked. */
  scores?: Record<string, number>;
}

export type LogicOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "is_answered"
  | "is_empty";

export interface LogicRule {
  id: string;
  /** Value to compare the answer against (option id, number, text, etc). */
  operator: LogicOperator;
  value?: string;
  /** Question id to jump to. "end" jumps straight to the thank-you screen. */
  targetQuestionId: string | "end";
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  position: number;
  options: ChoiceOption[] | null;
  /** Rules evaluated in order; first match wins. Falls through to next question otherwise. */
  logic: LogicRule[];
}

export interface ScoringProfile {
  id: string;
  survey_id: string;
  /** Short machine key used inside expressions, e.g. "openness". */
  key: string;
  label: string;
  description: string | null;
  /**
   * Optional custom algorithm expression combining raw trait sums, e.g.
   * "(openness * 1.5 - neuroticism) / total". Leave blank to use the raw sum.
   */
  expression: string | null;
}

export type SurveyStatus = "draft" | "published" | "closed";
export type AntiAbuseMode = "cookie" | "email";

export interface SurveyTheme {
  primaryColor: string;
  backgroundColor: string;
  fontFamily?: string;
}

export interface SurveyScreenContent {
  title: string;
  body: string;
  buttonLabel?: string;
}

export interface Survey {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  slug: string;
  status: SurveyStatus;
  theme: SurveyTheme;
  intro: SurveyScreenContent;
  thank_you: SurveyScreenContent;
  close_at: string | null;
  response_cap: number | null;
  anti_abuse_mode: AntiAbuseMode;
  ask_opt_in: boolean;
  opt_in_label: string;
  created_at: string;
  updated_at: string;
}

export type ResponseStatus = "partial" | "completed";

export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_token: string;
  status: ResponseStatus;
  opted_in: boolean;
  started_at: string;
  completed_at: string | null;
  scores: Record<string, number> | null;
}

export type AnswerValue = string | string[] | number | boolean | null;

export interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  value: AnswerValue;
}

export interface SurveyWithQuestions extends Survey {
  questions: SurveyQuestion[];
  scoring_profiles: ScoringProfile[];
}
