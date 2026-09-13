"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useKingdomQueryAuth } from "@/lib/kingdom-query/use-auth";
import {
  deleteMyResponse,
  getMyResponseDetail,
  listMyResponses,
  recomputeMyResponseScores,
  updateMyAnswer,
  type MyResponseSummary,
} from "@/lib/kingdom-query/db";
import { computeScores } from "@/lib/kingdom-query/scoring";
import { resolveArchetype, resolveSubProfile } from "@/lib/kingdom-query/archetype";
import type { AnswerValue, SurveyAnswer, SurveyWithQuestions } from "@/lib/kingdom-query/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnswerEditor } from "@/components/kingdom-query/my-results/answer-editor";
import { ArrowLeft } from "lucide-react";

export default function MyResultsPage() {
  const { user, loading } = useKingdomQueryAuth();
  const router = useRouter();
  const [summaries, setSummaries] = useState<MyResponseSummary[] | null>(null);

  const load = useCallback(async () => {
    try {
      setSummaries(await listMyResponses());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load your results");
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/kingdom-query/login");
      return;
    }
    load();
  }, [user, loading, router, load]);

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/kingdom-query">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">My Results</h1>
          <p className="text-sm text-muted-foreground">Surveys you&apos;ve taken and saved to this account</p>
        </div>
      </div>

      {summaries === null && <p className="text-sm text-muted-foreground">Loading…</p>}
      {summaries && summaries.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No saved results yet. When you take a survey, choose &quot;Save my results&quot; on the
          thank-you screen to see it here.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {summaries?.map((summary) => (
          <MyResponseCard
            key={summary.response.id}
            summary={summary}
            onDeleted={() => setSummaries((prev) => prev?.filter((s) => s.response.id !== summary.response.id) ?? null)}
          />
        ))}
      </div>
    </div>
  );
}

function MyResponseCard({
  summary,
  onDeleted,
}: {
  summary: MyResponseSummary;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<{
    survey: SurveyWithQuestions;
    answers: SurveyAnswer[];
  } | null>(null);
  const [edits, setEdits] = useState<Record<string, AnswerValue>>({});
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function expand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!detail) {
      try {
        const data = await getMyResponseDetail(summary.response.id);
        setDetail({ survey: data.survey, answers: data.answers });
        setEdits(Object.fromEntries(data.answers.map((a) => [a.question_id, a.value])));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load this response");
      }
    }
  }

  async function saveChanges() {
    if (!detail) return;
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(edits).map(([questionId, value]) =>
          updateMyAnswer(summary.response.id, questionId, value)
        )
      );
      const { scores, vars } = computeScores(
        detail.survey.questions,
        Object.entries(edits).map(([question_id, value]) => ({ question_id, value })),
        detail.survey.scoring_profiles
      );
      const archetype = resolveArchetype(vars, detail.survey.archetypes);
      const subProfile = archetype
        ? resolveSubProfile(vars, archetype, detail.survey.subprofiles)
        : null;
      await recomputeMyResponseScores(summary.response.id, {
        scores,
        archetype_id: archetype?.id ?? null,
        subprofile_id: subProfile?.id ?? null,
      });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteMyResponse(summary.response.id);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const archetype = detail?.survey.archetypes.find((a) => a.id === summary.response.archetype_id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">{summary.survey.title}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {summary.response.completed_at
              ? new Date(summary.response.completed_at).toLocaleString()
              : "In progress"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {archetype && <Badge variant="outline">{archetype.label}</Badge>}
          <Button variant="outline" size="sm" onClick={expand}>
            {expanded ? "Hide" : "View"}
          </Button>
        </div>
      </CardHeader>

      {expanded && detail && (
        <CardContent className="flex flex-col gap-4 border-t pt-4">
          {[...detail.survey.questions]
            .sort((a, b) => a.position - b.position)
            .map((question) => (
              <div key={question.id} className="flex flex-col gap-1.5">
                <p className="text-sm font-medium">{question.title}</p>
                <AnswerEditor
                  question={question}
                  value={edits[question.id] ?? null}
                  onChange={(value) => setEdits((prev) => ({ ...prev, [question.id]: value }))}
                />
              </div>
            ))}

          <div className="flex items-center justify-between border-t pt-3">
            <Button onClick={saveChanges} disabled={saving}>
              Save changes
            </Button>

            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Delete this response?</span>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  Yes, delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
                Delete response
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
