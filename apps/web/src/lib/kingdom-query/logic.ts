import type { AnswerValue, LogicRule, SurveyQuestion } from "./types";

function toComparable(value: AnswerValue): string {
  if (Array.isArray(value)) return value.join(",");
  if (value === null || value === undefined) return "";
  return String(value);
}

function isAnswered(value: AnswerValue): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== "";
}

export function matchesRule(rule: LogicRule, value: AnswerValue): boolean {
  switch (rule.operator) {
    case "is_answered":
      return isAnswered(value);
    case "is_empty":
      return !isAnswered(value);
    case "equals":
      return toComparable(value) === (rule.value ?? "");
    case "not_equals":
      return toComparable(value) !== (rule.value ?? "");
    case "contains":
      return toComparable(value).includes(rule.value ?? "");
    case "greater_than":
      return Number(toComparable(value)) > Number(rule.value ?? 0);
    case "less_than":
      return Number(toComparable(value)) < Number(rule.value ?? 0);
    default:
      return false;
  }
}

/**
 * Given the current question, its answer, and the ordered list of all
 * questions, returns the id of the next question to show ("end" means jump
 * straight to the thank-you screen), following the first matching logic
 * rule, or falling through to the next question in order.
 */
export function resolveNextQuestionId(
  currentQuestion: SurveyQuestion,
  value: AnswerValue,
  allQuestions: SurveyQuestion[]
): string | "end" {
  for (const rule of currentQuestion.logic ?? []) {
    if (matchesRule(rule, value)) {
      return rule.targetQuestionId;
    }
  }
  const sorted = [...allQuestions].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((q) => q.id === currentQuestion.id);
  const next = sorted[idx + 1];
  return next ? next.id : "end";
}
