"use client";

import { useMemo } from "react";
import { SurveyRunner } from "@/components/kingdom-query/runtime/survey-runner";
import type { SurveyWithQuestions } from "@/lib/kingdom-query/types";
import { AlertTriangle } from "lucide-react";

interface Props {
  survey: SurveyWithQuestions;
}

export function PreviewMode({ survey }: Props) {
  const warnings = useMemo(() => validate(survey), [survey]);

  return (
    <div className="flex flex-col gap-4">
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-4" /> Validation warnings
          </div>
          <ul className="list-disc pl-5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border">
        <div className="relative h-[600px] overflow-y-auto">
          <SurveyRunner survey={survey} preview />
        </div>
      </div>
    </div>
  );
}

function validate(survey: SurveyWithQuestions): string[] {
  const warnings: string[] = [];
  if (survey.questions.length === 0) {
    warnings.push("This survey has no questions yet.");
  }
  for (const q of survey.questions) {
    if (!q.title.trim()) warnings.push(`Question at position ${q.position + 1} is missing a title.`);
    if ((q.type === "multiple_choice" || q.type === "checkboxes") && (q.options?.length ?? 0) < 2) {
      warnings.push(`"${q.title || "Untitled"}" needs at least two options.`);
    }
    for (const rule of q.logic ?? []) {
      if (rule.targetQuestionId !== "end" && !survey.questions.some((o) => o.id === rule.targetQuestionId)) {
        warnings.push(`A logic rule on "${q.title || "Untitled"}" points to a question that no longer exists.`);
      }
    }
  }
  const keys = new Set<string>();
  for (const p of survey.scoring_profiles) {
    if (!p.key.trim()) warnings.push("A scoring trait is missing its key.");
    if (keys.has(p.key)) warnings.push(`Duplicate scoring trait key "${p.key}".`);
    keys.add(p.key);
  }
  return warnings;
}
