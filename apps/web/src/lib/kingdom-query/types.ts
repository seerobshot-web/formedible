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
  respondent_email?: string | null;
  status: ResponseStatus;
  opted_in: boolean;
  started_at: string;
  completed_at: string | null;
  scores: Record<string, number> | null;
  archetype_id: string | null;
  subprofile_id: string | null;
  respondent_user_id: string | null;
}

export type AnswerValue = string | string[] | number | boolean | null;

export interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  value: AnswerValue;
}

/**
 * A scoring rule computes a single number from the trait variables produced
 * by `computeScores` (raw trait sums, custom-expression trait scores, and
 * `total`). Archetypes/sub-profiles pick whichever one of them scores
 * highest against a given response -- this is the "specialized scoring
 * algorithm" a creator can choose per archetype/sub-profile.
 */
export type ScoringRule =
  | { type: "highest_trait"; trait: string }
  | { type: "expression"; expression: string }
  | { type: "weighted_sum"; weights: Record<string, number> };

export interface ResultContent {
  result_title: string | null;
  result_body: string | null;
  result_cta_label: string | null;
  result_cta_url: string | null;
}

export interface Archetype extends ResultContent {
  id: string;
  survey_id: string;
  key: string;
  label: string;
  description: string | null;
  scoring_rule: ScoringRule;
  position: number;
}

export interface SubProfile extends ResultContent {
  id: string;
  archetype_id: string;
  survey_id: string;
  key: string;
  label: string;
  description: string | null;
  scoring_rule: ScoringRule;
  position: number;
}

export interface Lead {
  id: string;
  survey_id: string;
  response_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: "new" | "contacted" | "qualified" | "closed";
  notes: string | null;
  created_at: string;
}

export interface NewsletterSubscription {
  id: string;
  survey_id: string;
  response_id: string | null;
  email: string;
  subscribed: boolean;
  source: string;
  created_at: string;
}

export type PaymentEmbedProvider = "stripe" | "paypal" | "custom";
export type PaymentEmbedType = "checkout_link" | "payment_element" | "custom_html";

export interface PaymentEmbed {
  id: string;
  survey_id: string;
  question_id: string | null;
  provider: PaymentEmbedProvider;
  embed_type: PaymentEmbedType;
  label: string;
  /**
   * checkout_link: { url: string }
   * payment_element: { publishableKey: string; priceId: string }
   * custom_html: { html: string }
   */
  config: Record<string, string>;
  position: number;
}

export interface SurveyWithQuestions extends Survey {
  questions: SurveyQuestion[];
  scoring_profiles: ScoringProfile[];
  archetypes: Archetype[];
  subprofiles: SubProfile[];
  payment_embeds: PaymentEmbed[];
}
