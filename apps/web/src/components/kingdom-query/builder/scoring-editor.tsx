"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { newId } from "@/lib/kingdom-query/id";
import { assertValidExpression } from "@/lib/kingdom-query/expression";
import type { ScoringProfile } from "@/lib/kingdom-query/types";

interface Props {
  profiles: ScoringProfile[];
  onChange: (profiles: ScoringProfile[]) => void;
  onDelete: (id: string) => void;
}

export function ScoringEditor({ profiles, onChange, onDelete }: Props) {
  function addProfile() {
    onChange([
      ...profiles,
      { id: newId(), survey_id: "", key: `trait_${profiles.length + 1}`, label: "", description: null, expression: null },
    ]);
  }

  function update(id: string, fields: Partial<ScoringProfile>) {
    onChange(profiles.map((p) => (p.id === id ? { ...p, ...fields } : p)));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Define the personality traits this assessment scores. Give each trait a short <code>key</code>{" "}
        (used in answer weights like <code>{"key:2"}</code>) and, optionally, a custom expression that
        combines raw trait sums into a final score — e.g.{" "}
        <code>(openness * 1.5 - neuroticism) / max(total, 1)</code>. Leave the expression blank to use
        the raw sum directly.
      </p>

      {profiles.map((profile) => (
        <ScoringRow key={profile.id} profile={profile} onUpdate={update} onDelete={onDelete} />
      ))}

      <Button variant="outline" size="sm" onClick={addProfile} className="self-start">
        <Plus className="size-3.5" /> Add trait
      </Button>
    </div>
  );
}

function ScoringRow({
  profile,
  onUpdate,
  onDelete,
}: {
  profile: ScoringProfile;
  onUpdate: (id: string, fields: Partial<ScoringProfile>) => void;
  onDelete: (id: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  function validate(expression: string) {
    if (!expression.trim()) {
      setError(null);
      return;
    }
    try {
      assertValidExpression(expression, { [profile.key]: 1, total: 1 });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid expression");
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-4">
        <div className="flex items-center gap-2">
          <Input
            className="w-40"
            placeholder="key (e.g. openness)"
            value={profile.key}
            onChange={(e) => onUpdate(profile.id, { key: e.target.value })}
          />
          <Input
            className="flex-1"
            placeholder="Label (e.g. Openness to Experience)"
            value={profile.label}
            onChange={(e) => onUpdate(profile.id, { label: e.target.value })}
          />
          <Button variant="ghost" size="icon" onClick={() => onDelete(profile.id)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
        <Textarea
          placeholder="Description shown alongside the score (optional)"
          rows={2}
          value={profile.description ?? ""}
          onChange={(e) => onUpdate(profile.id, { description: e.target.value || null })}
        />
        <div className="flex items-center gap-2">
          <Input
            className="flex-1 font-mono text-xs"
            placeholder="Custom expression (optional)"
            value={profile.expression ?? ""}
            onChange={(e) => {
              onUpdate(profile.id, { expression: e.target.value || null });
              validate(e.target.value);
            }}
          />
          {profile.expression &&
            (error ? (
              <AlertCircle className="size-4 shrink-0 text-destructive" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0 text-green-600" />
            ))}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
