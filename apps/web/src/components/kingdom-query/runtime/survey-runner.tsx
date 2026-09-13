"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AnswerValue, SurveyQuestion, SurveyWithQuestions } from "@/lib/kingdom-query/types";
import { resolveNextQuestionId } from "@/lib/kingdom-query/logic";
import { computeScores } from "@/lib/kingdom-query/scoring";
import { ProgressBar } from "./progress-bar";
import { QuestionScreen } from "./question-screen";
import {
  clearDraft,
  getOrCreateRespondentToken,
  hasCompletedSurvey,
  loadDraft,
  markSurveyCompleted,
  saveDraft,
} from "@/lib/kingdom-query/storage";
import {
  completeResponse,
  getOrCreateResponse,
  saveAnswer,
  setRespondentEmail,
} from "@/lib/kingdom-query/db";

type Stage = "intro" | "question" | "opt_in" | "thank_you" | "already_completed" | "closed";

interface Props {
  survey: SurveyWithQuestions;
  /** Preview mode never persists to Supabase or local storage. */
  preview?: boolean;
}

export function SurveyRunner({ survey, preview = false }: Props) {
  const sortedQuestions = useMemo(
    () => [...survey.questions].sort((a, b) => a.position - b.position),
    [survey.questions]
  );

  const [stage, setStage] = useState<Stage>("intro");
  const [currentId, setCurrentId] = useState<string | null>(sortedQuestions[0]?.id ?? null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [optedIn, setOptedIn] = useState(false);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);

  const isClosed =
    survey.status === "closed" ||
    (survey.close_at ? new Date(survey.close_at) < new Date() : false);

  useEffect(() => {
    if (preview) return;
    if (isClosed) {
      setStage("closed");
      return;
    }
    if (hasCompletedSurvey(survey.slug)) {
      setStage("already_completed");
      return;
    }
    const draft = loadDraft(survey.slug);
    if (draft) {
      setAnswers(draft.answers as Record<string, AnswerValue>);
      if (draft.currentQuestionId) {
        setCurrentId(draft.currentQuestionId);
        setStage("question");
      }
    }
  }, [preview, isClosed, survey.slug]);

  async function ensureResponse(): Promise<string | null> {
    if (preview) return null;
    if (responseId) return responseId;
    const token = getOrCreateRespondentToken(survey.slug);
    const response = await getOrCreateResponse(survey.id, token);
    setResponseId(response.id);
    return response.id;
  }

  function currentQuestion(): SurveyQuestion | null {
    return sortedQuestions.find((q) => q.id === currentId) ?? null;
  }

  async function handleAnswerChange(value: AnswerValue) {
    const q = currentQuestion();
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  async function handleAdvance() {
    const q = currentQuestion();
    if (!q) return;
    const value = answers[q.id] ?? null;

    if (q.required && (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0))) {
      return;
    }

    if (!preview) {
      try {
        const id = await ensureResponse();
        if (id) {
          await saveAnswer(id, q.id, value);
          if (q.type === "email" && typeof value === "string" && value) {
            await setRespondentEmail(id, value);
          }
        }
      } catch {
        // Best-effort autosave; the respondent can still continue locally.
      }
    }

    const nextId = resolveNextQuestionId(q, value, sortedQuestions);
    setDirection(1);

    if (nextId === "end") {
      if (!preview && survey.ask_opt_in) {
        setStage("opt_in");
        return;
      }
      await finish();
      return;
    }

    setCurrentId(nextId);
    if (!preview) saveDraft(survey.slug, { currentQuestionId: nextId, answers });
  }

  async function finish() {
    if (preview) {
      setStage("thank_you");
      return;
    }
    try {
      const id = await ensureResponse();
      if (id) {
        const scores = computeScores(
          sortedQuestions,
          Object.entries(answers).map(([question_id, value]) => ({ question_id, value })),
          survey.scoring_profiles
        );
        await completeResponse(id, { scores, opted_in: optedIn });
      }
      markSurveyCompleted(survey.slug);
      clearDraft(survey.slug);
    } finally {
      setStage("thank_you");
    }
  }

  function start() {
    setStage("question");
  }

  const accentColor = survey.theme.primaryColor;
  const answeredCount = sortedQuestions.filter((q) => {
    const v = answers[q.id];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progress = sortedQuestions.length
    ? Math.round((answeredCount / sortedQuestions.length) * 100)
    : 0;

  return (
    <div
      className={`flex w-full flex-col items-center justify-center px-4 py-12 ${
        preview ? "min-h-full" : "min-h-screen"
      }`}
      style={{ backgroundColor: survey.theme.backgroundColor }}
    >
      {stage === "question" && <ProgressBar value={progress} color={accentColor} />}

      <AnimatePresence mode="wait" custom={direction}>
        {stage === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex w-full max-w-xl flex-col gap-6 text-center"
          >
            <h1 className="text-3xl font-bold sm:text-4xl">{survey.intro.title}</h1>
            {survey.intro.body && <p className="text-lg text-muted-foreground">{survey.intro.body}</p>}
            <button
              type="button"
              onClick={start}
              className="mx-auto w-fit rounded-md px-8 py-3 text-lg font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              {survey.intro.buttonLabel || "Start"}
            </button>
          </motion.div>
        )}

        {stage === "question" && currentQuestion() && (
          <motion.div
            key={currentId}
            custom={direction}
            initial={{ opacity: 0, x: 40 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 * direction }}
            transition={{ duration: 0.25 }}
            className="flex w-full justify-center"
          >
            <QuestionScreen
              question={currentQuestion()!}
              value={answers[currentQuestion()!.id] ?? null}
              onChange={handleAnswerChange}
              onAdvance={handleAdvance}
              accentColor={accentColor}
            />
          </motion.div>
        )}

        {stage === "opt_in" && (
          <motion.div
            key="opt_in"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex w-full max-w-xl flex-col gap-6 text-center"
          >
            <h2 className="text-2xl font-semibold">One last thing</h2>
            <label className="mx-auto flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={optedIn}
                onChange={(e) => setOptedIn(e.target.checked)}
              />
              {survey.opt_in_label}
            </label>
            <button
              type="button"
              onClick={finish}
              className="mx-auto w-fit rounded-md px-8 py-3 text-lg font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              Finish
            </button>
          </motion.div>
        )}

        {stage === "thank_you" && (
          <motion.div
            key="thank_you"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex w-full max-w-xl flex-col gap-4 text-center"
          >
            <h1 className="text-3xl font-bold">{survey.thank_you.title}</h1>
            {survey.thank_you.body && <p className="text-muted-foreground">{survey.thank_you.body}</p>}
          </motion.div>
        )}

        {stage === "already_completed" && (
          <motion.div key="already" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <h1 className="text-2xl font-semibold">You&apos;ve already responded</h1>
            <p className="mt-2 text-muted-foreground">Thanks again for your time!</p>
          </motion.div>
        )}

        {stage === "closed" && (
          <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <h1 className="text-2xl font-semibold">This survey is closed</h1>
            <p className="mt-2 text-muted-foreground">Responses are no longer being accepted.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
