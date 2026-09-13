"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SurveyWithQuestions } from "@/lib/kingdom-query/types";

interface Props {
  survey: SurveyWithQuestions;
  onChange: (patch: Partial<SurveyWithQuestions>) => void;
}

export function ThemeEditor({ survey, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Theme</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6">
          <div className="flex flex-col gap-1.5">
            <Label>Primary color</Label>
            <input
              type="color"
              value={survey.theme.primaryColor}
              onChange={(e) => onChange({ theme: { ...survey.theme, primaryColor: e.target.value } })}
              className="h-9 w-16 rounded border"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Background color</Label>
            <input
              type="color"
              value={survey.theme.backgroundColor}
              onChange={(e) =>
                onChange({ theme: { ...survey.theme, backgroundColor: e.target.value } })
              }
              className="h-9 w-16 rounded border"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Intro screen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            placeholder="Title"
            value={survey.intro.title}
            onChange={(e) => onChange({ intro: { ...survey.intro, title: e.target.value } })}
          />
          <Textarea
            placeholder="Body"
            value={survey.intro.body}
            onChange={(e) => onChange({ intro: { ...survey.intro, body: e.target.value } })}
          />
          <Input
            placeholder="Start button label"
            value={survey.intro.buttonLabel ?? ""}
            onChange={(e) => onChange({ intro: { ...survey.intro, buttonLabel: e.target.value } })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thank-you screen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            placeholder="Title"
            value={survey.thank_you.title}
            onChange={(e) => onChange({ thank_you: { ...survey.thank_you, title: e.target.value } })}
          />
          <Textarea
            placeholder="Body"
            value={survey.thank_you.body}
            onChange={(e) => onChange({ thank_you: { ...survey.thank_you, body: e.target.value } })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
