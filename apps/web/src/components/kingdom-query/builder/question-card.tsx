"use client";

import { useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type { ChoiceOption, QuestionType, SurveyQuestion } from "@/lib/kingdom-query/types";
import { newId } from "@/lib/kingdom-query/id";
import { LogicEditor } from "./logic-editor";

interface Props {
  question: SurveyQuestion;
  allQuestions: SurveyQuestion[];
  onChange: (question: SurveyQuestion) => void;
  onDelete: () => void;
  dragHandle: ReactNode;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  multiple_choice: "Multiple choice",
  checkboxes: "Checkboxes",
  rating: "Rating (1-5)",
  nps: "NPS (0-10)",
  email: "Email",
  yes_no: "Yes / No",
};

const HAS_OPTIONS: QuestionType[] = ["multiple_choice", "checkboxes"];

export function QuestionCard({ question, allQuestions, onChange, onDelete, dragHandle }: Props) {
  const [expanded, setExpanded] = useState(false);

  function patch(fields: Partial<SurveyQuestion>) {
    onChange({ ...question, ...fields });
  }

  function updateOption(id: string, fields: Partial<ChoiceOption>) {
    patch({
      options: (question.options ?? []).map((o) => (o.id === id ? { ...o, ...fields } : o)),
    });
  }

  function addOption() {
    const options = question.options ?? [];
    patch({
      options: [...options, { id: newId(), label: `Option ${options.length + 1}` }],
    });
  }

  function removeOption(id: string) {
    patch({ options: (question.options ?? []).filter((o) => o.id !== id) });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-start gap-2">
          {dragHandle}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={question.type}
                onValueChange={(type) =>
                  patch({
                    type: type as QuestionType,
                    options: HAS_OPTIONS.includes(type as QuestionType)
                      ? question.options ?? [
                          { id: newId(), label: "Option 1" },
                          { id: newId(), label: "Option 2" },
                        ]
                      : type === "yes_no"
                      ? [
                          { id: "yes", label: "Yes" },
                          { id: "no", label: "No" },
                        ]
                      : null,
                  })
                }
              >
                <SelectTrigger size="sm" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={question.required}
                    onCheckedChange={(required) => patch({ required })}
                  />
                  Required
                </Label>
                <Button variant="ghost" size="icon" onClick={() => setExpanded((e) => !e)}>
                  {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={onDelete}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>

            <Input
              placeholder="Question title"
              value={question.title}
              onChange={(e) => patch({ title: e.target.value })}
            />

            {expanded && (
              <>
                <Textarea
                  placeholder="Description (optional)"
                  value={question.description ?? ""}
                  onChange={(e) => patch({ description: e.target.value || null })}
                  rows={2}
                />

                {HAS_OPTIONS.includes(question.type) && (
                  <div className="flex flex-col gap-2 rounded-md border p-3">
                    <p className="text-xs font-medium text-muted-foreground">Options & scoring</p>
                    {(question.options ?? []).map((option) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <Input
                          value={option.label}
                          onChange={(e) => updateOption(option.id, { label: e.target.value })}
                          className="flex-1"
                        />
                        <Input
                          placeholder="trait:weight"
                          className="w-40 text-xs"
                          defaultValue={scoresToString(option.scores)}
                          onBlur={(e) => updateOption(option.id, { scores: parseScores(e.target.value) })}
                          title="e.g. openness:2, empathy:1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeOption(option.id)}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addOption} className="self-start">
                      <Plus className="size-3.5" /> Add option
                    </Button>
                  </div>
                )}

                <LogicEditor question={question} allQuestions={allQuestions} onChange={patch} />
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function scoresToString(scores?: Record<string, number>): string {
  if (!scores) return "";
  return Object.entries(scores)
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");
}

function parseScores(input: string): Record<string, number> | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const result: Record<string, number> = {};
  for (const part of trimmed.split(",")) {
    const [key, value] = part.split(":").map((s) => s.trim());
    if (!key) continue;
    const num = Number(value);
    result[key] = Number.isFinite(num) ? num : 1;
  }
  return result;
}
