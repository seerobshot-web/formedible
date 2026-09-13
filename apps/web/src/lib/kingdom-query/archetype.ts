import { evaluateExpression } from "./expression";
import type { Archetype, ScoringRule, SubProfile } from "./types";

/** Evaluates a scoring rule against the trait variables computed for a response. */
export function evalScoringRule(rule: ScoringRule, vars: Record<string, number>): number {
  switch (rule.type) {
    case "highest_trait":
      return vars[rule.trait] ?? 0;
    case "expression":
      return evaluateExpression(rule.expression, vars);
    case "weighted_sum":
      return Object.entries(rule.weights).reduce(
        (sum, [trait, weight]) => sum + (vars[trait] ?? 0) * weight,
        0
      );
    default:
      return 0;
  }
}

/**
 * Picks the archetype whose scoring_rule evaluates highest against `vars`
 * (the trait scores computed by computeScores). Ties fall to whichever
 * archetype comes first by position. Returns null if there are no archetypes
 * defined for the survey.
 */
export function resolveArchetype(
  vars: Record<string, number>,
  archetypes: Archetype[]
): Archetype | null {
  if (archetypes.length === 0) return null;
  const sorted = [...archetypes].sort((a, b) => a.position - b.position);
  let best = sorted[0];
  let bestScore = evalScoringRule(best.scoring_rule, vars);
  for (const archetype of sorted.slice(1)) {
    const score = evalScoringRule(archetype.scoring_rule, vars);
    if (score > bestScore) {
      best = archetype;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Picks the highest-scoring sub-profile among those belonging to `archetype`.
 * Returns null if the archetype has no sub-profiles.
 */
export function resolveSubProfile(
  vars: Record<string, number>,
  archetype: Archetype,
  allSubProfiles: SubProfile[]
): SubProfile | null {
  const candidates = allSubProfiles.filter((s) => s.archetype_id === archetype.id);
  if (candidates.length === 0) return null;
  const sorted = candidates.sort((a, b) => a.position - b.position);
  let best = sorted[0];
  let bestScore = evalScoringRule(best.scoring_rule, vars);
  for (const sub of sorted.slice(1)) {
    const score = evalScoringRule(sub.scoring_rule, vars);
    if (score > bestScore) {
      best = sub;
      bestScore = score;
    }
  }
  return best;
}
