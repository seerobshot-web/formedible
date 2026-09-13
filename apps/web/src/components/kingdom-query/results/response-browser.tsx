"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ScoringProfile, SurveyAnswer, SurveyQuestion, SurveyResponse } from "@/lib/kingdom-query/types";

interface Props {
  responses: SurveyResponse[];
  answers: SurveyAnswer[];
  questions: SurveyQuestion[];
  profiles: ScoringProfile[];
}

export function ResponseBrowser({ responses, answers, questions, profiles }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sortedQuestions = [...questions].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-2">
      {responses.map((response) => {
        const isOpen = expandedId === response.id;
        const responseAnswers = answers.filter((a) => a.response_id === response.id);
        return (
          <Card key={response.id}>
            <CardContent className="flex flex-col gap-2 pt-4">
              <button
                type="button"
                className="flex items-center justify-between gap-2 text-left"
                onClick={() => setExpandedId(isOpen ? null : response.id)}
              >
                <div className="flex items-center gap-2">
                  <Badge variant={response.status === "completed" ? "default" : "secondary"}>
                    {response.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(response.started_at).toLocaleString()}
                  </span>
                  {response.opted_in && <Badge variant="outline">opted in</Badge>}
                </div>
                {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>

              {isOpen && (
                <div className="flex flex-col gap-3 border-t pt-3">
                  {sortedQuestions.map((question) => {
                    const answer = responseAnswers.find((a) => a.question_id === question.id);
                    if (!answer) return null;
                    return (
                      <div key={question.id} className="text-sm">
                        <p className="font-medium">{question.title || "Untitled question"}</p>
                        <p className="text-muted-foreground">{formatValue(question, answer.value)}</p>
                      </div>
                    );
                  })}

                  {profiles.length > 0 && response.scores && (
                    <div className="flex flex-wrap gap-2 border-t pt-2">
                      {profiles.map((p) => (
                        <Badge key={p.id} variant="outline">
                          {p.label || p.key}: {response.scores?.[p.key] ?? 0}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function formatValue(question: SurveyQuestion, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    return value
      .map((id) => question.options?.find((o) => o.id === id)?.label ?? String(id))
      .join(", ");
  }
  if (typeof value === "string" && question.options) {
    return question.options.find((o) => o.id === value)?.label ?? value;
  }
  return String(value);
}
