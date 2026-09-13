"use client";

import { useEffect, useRef } from "react";
import type { AnswerValue, SurveyQuestion } from "@/lib/kingdom-query/types";
import { cn } from "@/lib/utils";

interface Props {
  question: SurveyQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onAdvance: () => void;
  accentColor: string;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function QuestionScreen({ question, value, onChange, onAdvance, accentColor }: Props) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [question.id]);

  // Keyboard shortcuts: letters select multiple-choice/checkbox options,
  // number keys select rating/NPS, Enter advances.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement;
      const typingInField =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

      if (question.type === "multiple_choice" && question.options) {
        const idx = LETTERS.indexOf(e.key.toUpperCase());
        if (idx >= 0 && idx < question.options.length) {
          onChange(question.options[idx].id);
          return;
        }
      }
      if (question.type === "checkboxes" && question.options) {
        const idx = LETTERS.indexOf(e.key.toUpperCase());
        if (idx >= 0 && idx < question.options.length) {
          const current = Array.isArray(value) ? value : [];
          const optionId = question.options[idx].id;
          onChange(
            current.includes(optionId)
              ? current.filter((v) => v !== optionId)
              : [...current, optionId]
          );
          return;
        }
      }
      if (question.type === "yes_no" && !typingInField) {
        if (e.key.toLowerCase() === "y") onChange("yes");
        if (e.key.toLowerCase() === "n") onChange("no");
      }
      if (question.type === "rating" && /^[1-5]$/.test(e.key)) {
        onChange(Number(e.key));
      }
      if (question.type === "nps" && /^[0-9]$/.test(e.key) && !typingInField) {
        onChange(Number(e.key));
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onAdvance();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [question, value, onChange, onAdvance]);

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold sm:text-3xl">
          {question.title}
          {question.required && <span style={{ color: accentColor }}> *</span>}
        </h2>
        {question.description && (
          <p className="mt-2 text-muted-foreground">{question.description}</p>
        )}
      </div>

      {question.type === "short_text" && (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          className="border-b-2 bg-transparent py-2 text-xl outline-none"
          style={{ borderColor: accentColor }}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {question.type === "email" && (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="email"
          className="border-b-2 bg-transparent py-2 text-xl outline-none"
          style={{ borderColor: accentColor }}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {question.type === "long_text" && (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          className="min-h-32 border-b-2 bg-transparent py-2 text-xl outline-none"
          style={{ borderColor: accentColor }}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {(question.type === "multiple_choice" || question.type === "yes_no") && (
        <div className="flex flex-col gap-2">
          {question.options?.map((option, i) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-lg transition-colors",
                value === option.id ? "border-current" : "hover:bg-accent"
              )}
              style={value === option.id ? { borderColor: accentColor, color: accentColor } : undefined}
            >
              {question.type === "multiple_choice" && (
                <span className="flex size-7 shrink-0 items-center justify-center rounded border text-sm">
                  {LETTERS[i]}
                </span>
              )}
              {option.label}
            </button>
          ))}
        </div>
      )}

      {question.type === "checkboxes" && (
        <div className="flex flex-col gap-2">
          {question.options?.map((option, i) => {
            const selected = Array.isArray(value) && value.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  onChange(
                    selected ? current.filter((v) => v !== option.id) : [...current, option.id]
                  );
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-lg transition-colors",
                  selected ? "border-current" : "hover:bg-accent"
                )}
                style={selected ? { borderColor: accentColor, color: accentColor } : undefined}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded border text-sm">
                  {LETTERS[i]}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "rating" && (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "flex size-14 items-center justify-center rounded-full border text-xl font-medium",
                value === n ? "text-white" : "hover:bg-accent"
              )}
              style={value === n ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {question.type === "nps" && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 11 }, (_, n) => n).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "flex size-11 items-center justify-center rounded-md border text-base font-medium",
                value === n ? "text-white" : "hover:bg-accent"
              )}
              style={value === n ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAdvance}
        className="mt-2 w-fit rounded-md px-6 py-2.5 font-medium text-white"
        style={{ backgroundColor: accentColor }}
      >
        OK ↵
      </button>
    </div>
  );
}
