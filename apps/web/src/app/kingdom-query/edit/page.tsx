"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useKingdomQueryAuth } from "@/lib/kingdom-query/use-auth";
import {
  deleteQuestion,
  deleteScoringProfile,
  getSurveyForEditing,
  updateSurvey,
  upsertQuestions,
  upsertScoringProfiles,
} from "@/lib/kingdom-query/db";
import type {
  ScoringProfile,
  SurveyQuestion,
  SurveyWithQuestions,
} from "@/lib/kingdom-query/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { QuestionList } from "@/components/kingdom-query/builder/question-list";
import { ThemeEditor } from "@/components/kingdom-query/builder/theme-editor";
import { ScoringEditor } from "@/components/kingdom-query/builder/scoring-editor";
import { DistributionPanel } from "@/components/kingdom-query/builder/distribution-panel";
import { PreviewMode } from "@/components/kingdom-query/builder/preview-mode";

export default function SurveyBuilderPage() {
  return (
    <Suspense fallback={null}>
      <SurveyBuilderPageInner />
    </Suspense>
  );
}

function SurveyBuilderPageInner() {
  const { user, loading } = useKingdomQueryAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id") ?? "";
  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!surveyId) return;
    try {
      const data = await getSurveyForEditing(surveyId);
      setSurvey(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load survey");
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

  async function persistTitle(title: string) {
    setSurvey((s) => (s ? { ...s, title } : s));
  }

  async function commitTitle() {
    if (!survey) return;
    setSaving(true);
    try {
      await updateSurvey(survey.id, { title: survey.title });
    } finally {
      setSaving(false);
    }
  }

  async function handleQuestionsChange(questions: SurveyQuestion[]) {
    if (!survey) return;
    setSurvey((s) => (s ? { ...s, questions } : s));
    try {
      const saved = await upsertQuestions(survey.id, questions);
      setSurvey((s) => (s ? { ...s, questions: saved } : s));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save questions");
    }
  }

  async function handleDeleteQuestion(id: string) {
    setSurvey((s) => (s ? { ...s, questions: s.questions.filter((q) => q.id !== id) } : s));
    try {
      await deleteQuestion(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete question");
    }
  }

  async function handleScoringChange(profiles: ScoringProfile[]) {
    if (!survey) return;
    setSurvey((s) => (s ? { ...s, scoring_profiles: profiles } : s));
    try {
      const saved = await upsertScoringProfiles(survey.id, profiles);
      setSurvey((s) => (s ? { ...s, scoring_profiles: saved } : s));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save scoring profiles");
    }
  }

  async function handleDeleteScoringProfile(id: string) {
    setSurvey((s) =>
      s ? { ...s, scoring_profiles: s.scoring_profiles.filter((p) => p.id !== id) } : s
    );
    try {
      await deleteScoringProfile(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete profile");
    }
  }

  async function handleSurveyPatch(patch: Partial<SurveyWithQuestions>) {
    if (!survey) return;
    setSurvey((s) => (s ? { ...s, ...patch } : s));
    try {
      await updateSurvey(survey.id, patch);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/kingdom-query">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <Input
          value={survey.title}
          onChange={(e) => persistTitle(e.target.value)}
          onBlur={commitTitle}
          className="max-w-md text-lg font-semibold"
        />
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
        <Link href={`/kingdom-query/results?id=${survey.id}`} className="ml-auto">
          <Button variant="outline">Results</Button>
        </Link>
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="distribute">Distribute</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-4">
          <QuestionList
            questions={survey.questions}
            onChange={handleQuestionsChange}
            onDelete={handleDeleteQuestion}
          />
        </TabsContent>

        <TabsContent value="scoring" className="mt-4">
          <ScoringEditor
            profiles={survey.scoring_profiles}
            onChange={handleScoringChange}
            onDelete={handleDeleteScoringProfile}
          />
        </TabsContent>

        <TabsContent value="design" className="mt-4">
          <ThemeEditor survey={survey} onChange={handleSurveyPatch} />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <PreviewMode survey={survey} />
        </TabsContent>

        <TabsContent value="distribute" className="mt-4">
          <DistributionPanel survey={survey} onChange={handleSurveyPatch} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
