"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useKingdomQueryAuth } from "@/lib/kingdom-query/use-auth";
import {
  getSurveyForEditing,
  listAnswersForSurvey,
  listResponsesForSurvey,
} from "@/lib/kingdom-query/db";
import type { SurveyAnswer, SurveyResponse, SurveyWithQuestions } from "@/lib/kingdom-query/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ResultsOverview } from "@/components/kingdom-query/results/results-overview";
import { QuestionCharts } from "@/components/kingdom-query/results/question-charts";
import { ScoringBreakdown } from "@/components/kingdom-query/results/scoring-breakdown";
import { ResponseBrowser } from "@/components/kingdom-query/results/response-browser";
import { ExportCsvButton } from "@/components/kingdom-query/results/export-csv-button";

function ResultsPageInner() {
  const { user, loading } = useKingdomQueryAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id") ?? "";

  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);

  const load = useCallback(async () => {
    if (!surveyId) return;
    try {
      const [surveyData, responseData, answerData] = await Promise.all([
        getSurveyForEditing(surveyId),
        listResponsesForSurvey(surveyId),
        listAnswersForSurvey(surveyId),
      ]);
      setSurvey(surveyData);
      setResponses(responseData);
      setAnswers(answerData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load results");
    }
  }, [surveyId]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/kingdom-query/login");
      return;
    }
    load();
  }, [user, loading, router, load]);

  if (!survey) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/kingdom-query/edit?id=${survey.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">{survey.title} — Results</h1>
        <ExportCsvButton
          survey={survey}
          questions={survey.questions}
          answers={answers}
          responses={responses}
          profiles={survey.scoring_profiles}
        />
      </div>

      <div className="flex flex-col gap-6">
        <ResultsOverview responses={responses} />
        <ScoringBreakdown profiles={survey.scoring_profiles} responses={responses} />
        <QuestionCharts questions={survey.questions} answers={answers} />
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Individual responses</h2>
          <ResponseBrowser
            responses={responses}
            answers={answers}
            questions={survey.questions}
            profiles={survey.scoring_profiles}
          />
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsPageInner />
    </Suspense>
  );
}
