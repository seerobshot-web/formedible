"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { buildResultsSummaryPdf } from "@/lib/kingdom-query/pdf";
import type { Archetype, ScoringProfile, Survey, SurveyResponse } from "@/lib/kingdom-query/types";

interface Props {
  survey: Survey;
  responses: SurveyResponse[];
  archetypes: Archetype[];
  scoringProfiles: ScoringProfile[];
}

export function ExportPdfButton({ survey, responses, archetypes, scoringProfiles }: Props) {
  function handleExport() {
    const doc = buildResultsSummaryPdf({ survey, responses, archetypes, scoringProfiles });
    doc.save(`${survey.slug}-results-summary.pdf`);
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <FileDown className="size-4" /> Export PDF
    </Button>
  );
}
