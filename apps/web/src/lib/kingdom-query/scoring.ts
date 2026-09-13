import { evaluateExpression } from "./expression";
import type {
  AnswerValue,
  ChoiceOption,
  ScoringProfile,
  SurveyQuestion,
} from "./types";

export interface AnswerRecord {
  question_id: string;
  value: AnswerValue;
}

export interface ScoreResult {
  /** Final per-trait scores (after each profile's optional expression runs). */
  scores: Record<string, number>;
  /**
   * All variables available for archetype/sub-profile scoring rules: raw
   * trait sums, the final per-profile scores (these win on key collision),
   * and `total`.
   */
  vars: Record<string, number>;
}

/**
 * Computes final trait scores for a completed response.
 *
 * Step 1: sum raw per-trait weights from every selected choice option
 *         (multiple_choice / checkboxes / yes_no) across all questions.
 * Step 2: also expose `total` (sum of all raw trait values) as a variable.
 * Step 3: run each scoring profile's expression against those raw sums to
 *         produce the profile's final score; profiles without an expression
 *         just use their raw sum.
 */
export function computeScores(
  questions: SurveyQuestion[],
  answers: AnswerRecord[],
  profiles: ScoringProfile[]
): ScoreResult {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const rawSums: Record<string, number> = {};

  for (const answer of answers) {
    const question = questionById.get(answer.question_id);
    if (!question?.options) continue;

    const selectedIds = normalizeToOptionIds(answer.value);
    for (const optionId of selectedIds) {
      const option = question.options.find((o: ChoiceOption) => o.id === optionId);
      if (!option?.scores) continue;
      for (const [trait, weight] of Object.entries(option.scores)) {
        rawSums[trait] = (rawSums[trait] ?? 0) + weight;
      }
    }
  }

  const total = Object.values(rawSums).reduce((a, b) => a + b, 0);
  const evalVars: Record<string, number> = { ...rawSums, total };
  // ensure every declared profile key is at least 0 so expressions referencing
  // a trait with no responses yet don't blow up
  for (const profile of profiles) {
    if (!(profile.key in evalVars)) evalVars[profile.key] = 0;
  }

  const finalScores: Record<string, number> = {};
  for (const profile of profiles) {
    if (profile.expression && profile.expression.trim().length > 0) {
      finalScores[profile.key] = evaluateExpression(profile.expression, evalVars);
    } else {
      finalScores[profile.key] = evalVars[profile.key] ?? 0;
    }
  }

  return {
    scores: finalScores,
    vars: { ...rawSums, ...finalScores, total },
  };
}

function normalizeToOptionIds(value: AnswerValue): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  if (typeof value === "boolean") return [value ? "yes" : "no"];
  return [];
}
