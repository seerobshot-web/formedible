"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScoringRule } from "@/lib/kingdom-query/types";

interface Props {
  rule: ScoringRule;
  onChange: (rule: ScoringRule) => void;
}

const TYPE_LABELS: Record<ScoringRule["type"], string> = {
  highest_trait: "Highest trait wins",
  expression: "Custom expression",
  weighted_sum: "Weighted sum of traits",
};

export function ScoringRuleEditor({ rule, onChange }: Props) {
  function changeType(type: ScoringRule["type"]) {
    if (type === "highest_trait") onChange({ type, trait: "" });
    if (type === "expression") onChange({ type, expression: "" });
    if (type === "weighted_sum") onChange({ type, weights: {} });
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={rule.type} onValueChange={(v) => changeType(v as ScoringRule["type"])}>
        <SelectTrigger size="sm" className="w-56">
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

      {rule.type === "highest_trait" && (
        <Input
          className="font-mono text-xs"
          placeholder="trait key (e.g. leadership)"
          value={rule.trait}
          onChange={(e) => onChange({ type: "highest_trait", trait: e.target.value })}
        />
      )}

      {rule.type === "expression" && (
        <Input
          className="font-mono text-xs"
          placeholder="e.g. (leadership * 1.5 - mercy) / max(total, 1)"
          value={rule.expression}
          onChange={(e) => onChange({ type: "expression", expression: e.target.value })}
        />
      )}

      {rule.type === "weighted_sum" && (
        <Input
          className="font-mono text-xs"
          placeholder="trait:weight, trait:weight (e.g. leadership:2, teaching:1)"
          defaultValue={weightsToString(rule.weights)}
          onBlur={(e) => onChange({ type: "weighted_sum", weights: parseWeights(e.target.value) })}
        />
      )}
    </div>
  );
}

function weightsToString(weights: Record<string, number>): string {
  return Object.entries(weights)
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");
}

function parseWeights(input: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const part of input.split(",")) {
    const [key, value] = part.split(":").map((s) => s.trim());
    if (!key) continue;
    const num = Number(value);
    result[key] = Number.isFinite(num) ? num : 1;
  }
  return result;
}
