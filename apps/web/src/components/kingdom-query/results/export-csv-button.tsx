"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadTextFile, toCsv } from "@/lib/kingdom-query/utils";
import type {
  Archetype,
  ScoringProfile,
  SubProfile,
  Survey,
  SurveyAnswer,
  SurveyQuestion,
  SurveyResponse,
} from "@/lib/kingdom-query/types";

interface Props {
  survey: Survey;
  questions: SurveyQuestion[];
  answers: SurveyAnswer[];
  responses: SurveyResponse[];
  profiles: ScoringProfile[];
  archetypes: Archetype[];
  subprofiles: SubProfile[];
}

export function ExportCsvButton({
  survey,
  questions,
  answers,
  responses,
  profiles,
  archetypes,
  subprofiles,
}: Props) {
  function handleExport() {
    const sortedQuestions = [...questions].sort((a, b) => a.position - b.position);
    const archetypeById = new Map(archetypes.map((a) => [a.id, a]));
    const subprofileById = new Map(subprofiles.map((s) => [s.id, s]));
    const rows = responses.map((response) => {
      const row: Record<string, string | number> = {
        response_id: response.id,
        status: response.status,
        started_at: response.started_at,
        completed_at: response.completed_at ?? "",
        opted_in: response.opted_in ? "yes" : "no",
        archetype: response.archetype_id ? archetypeById.get(response.archetype_id)?.label ?? "" : "",
        subprofile: response.subprofile_id
          ? subprofileById.get(response.subprofile_id)?.label ?? ""
          : "",
      };
      for (const question of sortedQuestions) {
        const answer = answers.find(
          (a) => a.response_id === response.id && a.question_id === question.id
        );
        row[question.title || question.id] = formatCsvValue(question, answer?.value);
      }
      for (const profile of profiles) {
        row[`score_${profile.key}`] = response.scores?.[profile.key] ?? "";
      }
      return row;
    });

    downloadTextFile(`${survey.slug}-responses.csv`, toCsv(rows));
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="size-4" /> Export CSV
    </Button>
  );
}

function formatCsvValue(question: SurveyQuestion, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((id) => question.options?.find((o) => o.id === id)?.label ?? String(id))
      .join("; ");
  }
  if (typeof value === "string" && question.options) {
    return question.options.find((o) => o.id === value)?.label ?? value;
  }
  return String(value);
}
