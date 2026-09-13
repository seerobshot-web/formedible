"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useKingdomQueryAuth } from "@/lib/kingdom-query/use-auth";
import {
  getSurveyForEditing,
  listAnswersForSurvey,
  listLeadsForSurvey,
  listNewsletterSubscriptionsForSurvey,
  listResponsesForSurvey,
} from "@/lib/kingdom-query/db";
import type {
  Lead,
  NewsletterSubscription,
  SurveyAnswer,
  SurveyResponse,
  SurveyWithQuestions,
} from "@/lib/kingdom-query/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ResultsOverview } from "@/components/kingdom-query/results/results-overview";
import { QuestionCharts } from "@/components/kingdom-query/results/question-charts";
import { ScoringBreakdown } from "@/components/kingdom-query/results/scoring-breakdown";
import { ArchetypeBreakdown } from "@/components/kingdom-query/results/archetype-breakdown";
import { GrowthPanel } from "@/components/kingdom-query/results/growth-panel";
import { ResponseBrowser } from "@/components/kingdom-query/results/response-browser";
import { ExportCsvButton } from "@/components/kingdom-query/results/export-csv-button";
import { ExportPdfButton } from "@/components/kingdom-query/results/export-pdf-button";

function ResultsPageInner() {
  const { user, loading } = useKingdomQueryAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id") ?? "";

  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([]);

  const load = useCallback(async () => {
    if (!surveyId) return;
    try {
      const [surveyData, responseData, answerData, leadData, subscriptionData] = await Promise.all([
        getSurveyForEditing(surveyId),
        listResponsesForSurvey(surveyId),
        listAnswersForSurvey(surveyId),
        listLeadsForSurvey(surveyId),
        listNewsletterSubscriptionsForSurvey(surveyId),
      ]);
      setSurvey(surveyData);
      setResponses(responseData);
      setAnswers(answerData);
      setLeads(leadData);
      setSubscriptions(subscriptionData);
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
        <div className="ml-auto flex gap-2">
          <ExportPdfButton
            survey={survey}
            responses={responses}
            archetypes={survey.archetypes}
            scoringProfiles={survey.scoring_profiles}
          />
          <ExportCsvButton
            survey={survey}
            questions={survey.questions}
            answers={answers}
            responses={responses}
            profiles={survey.scoring_profiles}
            archetypes={survey.archetypes}
            subprofiles={survey.subprofiles}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <ResultsOverview responses={responses} />
        <ArchetypeBreakdown
          archetypes={survey.archetypes}
          subprofiles={survey.subprofiles}
          responses={responses}
        />
        <ScoringBreakdown profiles={survey.scoring_profiles} responses={responses} />
        <QuestionCharts questions={survey.questions} answers={answers} />
        <GrowthPanel leads={leads} subscriptions={subscriptions} />
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Individual responses</h2>
          <ResponseBrowser
            responses={responses}
            answers={answers}
            questions={survey.questions}
            profiles={survey.scoring_profiles}
            archetypes={survey.archetypes}
            subprofiles={survey.subprofiles}
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
