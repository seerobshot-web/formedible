"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AnswerValue, SurveyQuestion } from "@/lib/kingdom-query/types";

interface Props {
  question: SurveyQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
}

/** A plain (non-keyboard-shortcut) editable control per question type, used
 * when several questions are edited at once on the same page -- unlike the
 * survey runtime's QuestionScreen, this never binds global key listeners. */
export function AnswerEditor({ question, value, onChange }: Props) {
  if (question.type === "short_text" || question.type === "email") {
    return (
      <Input
        type={question.type === "email" ? "email" : "text"}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (question.type === "long_text") {
    return <Textarea value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }

  if (question.type === "multiple_choice" || question.type === "yes_no") {
    return (
      <div className="flex flex-wrap gap-2">
        {question.options?.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              value === option.id ? "border-primary bg-primary/10" : "hover:bg-accent"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "checkboxes") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-2">
        {question.options?.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange(
                  isSelected ? selected.filter((v) => v !== option.id) : [...selected, option.id]
                )
              }
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                isSelected ? "border-primary bg-primary/10" : "hover:bg-accent"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "rating") {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full border text-sm",
              value === n ? "border-primary bg-primary/10" : "hover:bg-accent"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "nps") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, n) => n).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex size-8 items-center justify-center rounded border text-xs",
              value === n ? "border-primary bg-primary/10" : "hover:bg-accent"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  return null;
}
