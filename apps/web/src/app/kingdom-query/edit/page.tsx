"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useKingdomQueryAuth } from "@/lib/kingdom-query/use-auth";
import {
  deleteArchetype,
  deletePaymentEmbed,
  deleteQuestion,
  deleteScoringProfile,
  deleteSubProfile,
  getSurveyForEditing,
  updateSurvey,
  upsertArchetypes,
  upsertPaymentEmbeds,
  upsertQuestions,
  upsertScoringProfiles,
  upsertSubProfiles,
} from "@/lib/kingdom-query/db";
import type {
  Archetype,
  PaymentEmbed,
  ScoringProfile,
  SubProfile,
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
import { ArchetypeEditor } from "@/components/kingdom-query/builder/archetype-editor";
import { GrowthEditor } from "@/components/kingdom-query/builder/growth-editor";
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

  async function handleArchetypesChange(archetypes: Archetype[]) {
    if (!survey) return;
    setSurvey((s) => (s ? { ...s, archetypes } : s));
    try {
      const saved = await upsertArchetypes(survey.id, archetypes);
      setSurvey((s) => (s ? { ...s, archetypes: saved } : s));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save archetypes");
    }
  }

  async function handleDeleteArchetype(id: string) {
    setSurvey((s) =>
      s
        ? {
            ...s,
            archetypes: s.archetypes.filter((a) => a.id !== id),
            subprofiles: s.subprofiles.filter((sp) => sp.archetype_id !== id),
          }
        : s
    );
    try {
      await deleteArchetype(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete archetype");
    }
  }

  async function handleSubProfilesChange(subprofiles: SubProfile[]) {
    if (!survey) return;
    setSurvey((s) => (s ? { ...s, subprofiles } : s));
    try {
      const saved = await upsertSubProfiles(survey.id, subprofiles);
      setSurvey((s) => (s ? { ...s, subprofiles: saved } : s));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save sub-profiles");
    }
  }

  async function handleDeleteSubProfile(id: string) {
    setSurvey((s) => (s ? { ...s, subprofiles: s.subprofiles.filter((sp) => sp.id !== id) } : s));
    try {
      await deleteSubProfile(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete sub-profile");
    }
  }

  async function handlePaymentEmbedsChange(embeds: PaymentEmbed[]) {
    if (!survey) return;
    setSurvey((s) => (s ? { ...s, payment_embeds: embeds } : s));
    try {
      const saved = await upsertPaymentEmbeds(survey.id, embeds);
      setSurvey((s) => (s ? { ...s, payment_embeds: saved } : s));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payment embeds");
    }
  }

  async function handleDeletePaymentEmbed(id: string) {
    setSurvey((s) => (s ? { ...s, payment_embeds: s.payment_embeds.filter((e) => e.id !== id) } : s));
    try {
      await deletePaymentEmbed(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete payment embed");
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
          <TabsTrigger value="archetypes">Archetypes</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
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

        <TabsContent value="archetypes" className="mt-4">
          <ArchetypeEditor
            archetypes={survey.archetypes}
            subprofiles={survey.subprofiles}
            onArchetypesChange={handleArchetypesChange}
            onDeleteArchetype={handleDeleteArchetype}
            onSubProfilesChange={handleSubProfilesChange}
            onDeleteSubProfile={handleDeleteSubProfile}
          />
        </TabsContent>

        <TabsContent value="design" className="mt-4">
          <ThemeEditor survey={survey} onChange={handleSurveyPatch} />
        </TabsContent>

        <TabsContent value="growth" className="mt-4">
          <GrowthEditor
            survey={survey}
            paymentEmbeds={survey.payment_embeds}
            onPaymentEmbedsChange={handlePaymentEmbedsChange}
            onDeletePaymentEmbed={handleDeletePaymentEmbed}
          />
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
