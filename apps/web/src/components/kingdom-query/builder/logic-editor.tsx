"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, CornerDownRight } from "lucide-react";
import { newId } from "@/lib/kingdom-query/id";
import type { LogicOperator, LogicRule, SurveyQuestion } from "@/lib/kingdom-query/types";

interface Props {
  question: SurveyQuestion;
  allQuestions: SurveyQuestion[];
  onChange: (fields: Partial<SurveyQuestion>) => void;
}

const OPERATOR_LABELS: Record<LogicOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  greater_than: "is greater than",
  less_than: "is less than",
  is_answered: "is answered",
  is_empty: "is empty",
};

const NO_VALUE_OPERATORS: LogicOperator[] = ["is_answered", "is_empty"];

export function LogicEditor({ question, allQuestions, onChange }: Props) {
  const rules = question.logic ?? [];
  const otherQuestions = allQuestions.filter((q) => q.id !== question.id);
  const orderedIndex = new Map(
    [...allQuestions].sort((a, b) => a.position - b.position).map((q, i) => [q.id, i + 1])
  );

  function addRule() {
    const rule: LogicRule = {
      id: newId(),
      operator: "equals",
      value: "",
      targetQuestionId: "end",
    };
    onChange({ logic: [...rules, rule] });
  }

  function updateRule(id: string, fields: Partial<LogicRule>) {
    onChange({ logic: rules.map((r) => (r.id === id ? { ...r, ...fields } : r)) });
  }

  function removeRule(id: string) {
    onChange({ logic: rules.filter((r) => r.id !== id) });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Logic jumps (evaluated top to bottom; first match wins)
      </p>
      {rules.map((rule) => (
        <div key={rule.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">If answer</span>
          <Select
            value={rule.operator}
            onValueChange={(operator) => updateRule(rule.id, { operator: operator as LogicOperator })}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!NO_VALUE_OPERATORS.includes(rule.operator) && (
            <Input
              className="h-8 w-28"
              placeholder="value"
              value={rule.value ?? ""}
              onChange={(e) => updateRule(rule.id, { value: e.target.value })}
            />
          )}

          <CornerDownRight className="size-3.5 text-muted-foreground" />

          <Select
            value={rule.targetQuestionId}
            onValueChange={(targetQuestionId) => updateRule(rule.id, { targetQuestionId })}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="end">End of survey</SelectItem>
              {otherQuestions.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  Q{orderedIndex.get(q.id)}: {q.title || "Untitled"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={() => removeRule(rule.id)}>
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addRule} className="self-start">
        <Plus className="size-3.5" /> Add jump rule
      </Button>
    </div>
  );
}
