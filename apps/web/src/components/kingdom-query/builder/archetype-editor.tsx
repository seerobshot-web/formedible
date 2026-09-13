"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { newId } from "@/lib/kingdom-query/id";
import { ScoringRuleEditor } from "./scoring-rule-editor";
import type { Archetype, SubProfile } from "@/lib/kingdom-query/types";

interface Props {
  archetypes: Archetype[];
  subprofiles: SubProfile[];
  onArchetypesChange: (archetypes: Archetype[]) => void;
  onDeleteArchetype: (id: string) => void;
  onSubProfilesChange: (subprofiles: SubProfile[]) => void;
  onDeleteSubProfile: (id: string) => void;
}

export function ArchetypeEditor({
  archetypes,
  subprofiles,
  onArchetypesChange,
  onDeleteArchetype,
  onSubProfilesChange,
  onDeleteSubProfile,
}: Props) {
  const sorted = [...archetypes].sort((a, b) => a.position - b.position);

  function addArchetype() {
    const archetype: Archetype = {
      id: newId(),
      survey_id: "",
      key: `archetype_${sorted.length + 1}`,
      label: "",
      description: null,
      scoring_rule: { type: "highest_trait", trait: "" },
      result_title: null,
      result_body: null,
      result_cta_label: null,
      result_cta_url: null,
      position: sorted.length,
    };
    onArchetypesChange([...sorted, archetype]);
  }

  function update(id: string, fields: Partial<Archetype>) {
    onArchetypesChange(sorted.map((a) => (a.id === id ? { ...a, ...fields } : a)));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Archetypes are the top-level &quot;you are a ___&quot; result. Each one is scored against a
        respondent&apos;s trait totals (see the Scoring tab) and whichever scores highest wins.
        Nest sub-profiles under an archetype for a second, more specific result (e.g. Archetype{" "}
        <em>Leader</em> → sub-profile <em>Visionary</em> or <em>Executor</em>).
      </p>

      {sorted.map((archetype) => (
        <ArchetypeRow
          key={archetype.id}
          archetype={archetype}
          subprofiles={subprofiles.filter((s) => s.archetype_id === archetype.id)}
          onUpdate={update}
          onDelete={onDeleteArchetype}
          onSubProfilesChange={onSubProfilesChange}
          onDeleteSubProfile={onDeleteSubProfile}
          allSubProfiles={subprofiles}
        />
      ))}

      <Button variant="outline" size="sm" onClick={addArchetype} className="self-start">
        <Plus className="size-3.5" /> Add archetype
      </Button>
    </div>
  );
}

function ArchetypeRow({
  archetype,
  subprofiles,
  allSubProfiles,
  onUpdate,
  onDelete,
  onSubProfilesChange,
  onDeleteSubProfile,
}: {
  archetype: Archetype;
  subprofiles: SubProfile[];
  allSubProfiles: SubProfile[];
  onUpdate: (id: string, fields: Partial<Archetype>) => void;
  onDelete: (id: string) => void;
  onSubProfilesChange: (subprofiles: SubProfile[]) => void;
  onDeleteSubProfile: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function addSubProfile() {
    const sub: SubProfile = {
      id: newId(),
      archetype_id: archetype.id,
      survey_id: "",
      key: `${archetype.key}_sub_${subprofiles.length + 1}`,
      label: "",
      description: null,
      scoring_rule: { type: "highest_trait", trait: "" },
      result_title: null,
      result_body: null,
      result_cta_label: null,
      result_cta_url: null,
      position: subprofiles.length,
    };
    onSubProfilesChange([...allSubProfiles, sub]);
  }

  function updateSubProfile(id: string, fields: Partial<SubProfile>) {
    onSubProfilesChange(allSubProfiles.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-center gap-2">
          <Input
            className="w-40 font-mono text-xs"
            placeholder="key"
            value={archetype.key}
            onChange={(e) => onUpdate(archetype.id, { key: e.target.value })}
          />
          <Input
            className="flex-1"
            placeholder="Label (e.g. The Leader)"
            value={archetype.label}
            onChange={(e) => onUpdate(archetype.id, { label: e.target.value })}
          />
          <Button variant="ghost" size="icon" onClick={() => setExpanded((e) => !e)}>
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(archetype.id)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>

        {expanded && (
          <>
            <Textarea
              placeholder="Internal description (optional)"
              rows={2}
              value={archetype.description ?? ""}
              onChange={(e) => onUpdate(archetype.id, { description: e.target.value || null })}
            />

            <div className="flex flex-col gap-1.5 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">Scoring rule</p>
              <ScoringRuleEditor
                rule={archetype.scoring_rule}
                onChange={(scoring_rule) => onUpdate(archetype.id, { scoring_rule })}
              />
            </div>

            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Result shown to the respondent
              </p>
              <Input
                placeholder="Result title (e.g. You're a Leader!)"
                value={archetype.result_title ?? ""}
                onChange={(e) => onUpdate(archetype.id, { result_title: e.target.value || null })}
              />
              <Textarea
                placeholder="Result body"
                rows={2}
                value={archetype.result_body ?? ""}
                onChange={(e) => onUpdate(archetype.id, { result_body: e.target.value || null })}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="CTA button label (optional)"
                  value={archetype.result_cta_label ?? ""}
                  onChange={(e) =>
                    onUpdate(archetype.id, { result_cta_label: e.target.value || null })
                  }
                />
                <Input
                  placeholder="CTA URL (optional)"
                  value={archetype.result_cta_url ?? ""}
                  onChange={(e) =>
                    onUpdate(archetype.id, { result_cta_url: e.target.value || null })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">Sub-profiles</p>
              {subprofiles.map((sub) => (
                <SubProfileRow
                  key={sub.id}
                  subprofile={sub}
                  onUpdate={updateSubProfile}
                  onDelete={onDeleteSubProfile}
                />
              ))}
              <Button variant="outline" size="sm" onClick={addSubProfile} className="self-start">
                <Plus className="size-3.5" /> Add sub-profile
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SubProfileRow({
  subprofile,
  onUpdate,
  onDelete,
}: {
  subprofile: SubProfile;
  onUpdate: (id: string, fields: Partial<SubProfile>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border p-2">
      <div className="flex items-center gap-2">
        <Input
          className="w-36 font-mono text-xs"
          placeholder="key"
          value={subprofile.key}
          onChange={(e) => onUpdate(subprofile.id, { key: e.target.value })}
        />
        <Input
          className="flex-1"
          placeholder="Label (e.g. Visionary)"
          value={subprofile.label}
          onChange={(e) => onUpdate(subprofile.id, { label: e.target.value })}
        />
        <Button variant="ghost" size="icon" onClick={() => setExpanded((e) => !e)}>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(subprofile.id)}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          <ScoringRuleEditor
            rule={subprofile.scoring_rule}
            onChange={(scoring_rule) => onUpdate(subprofile.id, { scoring_rule })}
          />
          <Input
            placeholder="Result title"
            value={subprofile.result_title ?? ""}
            onChange={(e) => onUpdate(subprofile.id, { result_title: e.target.value || null })}
          />
          <Textarea
            placeholder="Result body"
            rows={2}
            value={subprofile.result_body ?? ""}
            onChange={(e) => onUpdate(subprofile.id, { result_body: e.target.value || null })}
          />
        </div>
      )}
    </div>
  );
}
