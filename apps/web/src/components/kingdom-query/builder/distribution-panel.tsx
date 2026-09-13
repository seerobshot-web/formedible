"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { SurveyWithQuestions } from "@/lib/kingdom-query/types";

interface Props {
  survey: SurveyWithQuestions;
  onChange: (patch: Partial<SurveyWithQuestions>) => void;
}

export function DistributionPanel({ survey, onChange }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicUrl = origin ? `${origin}/s/${survey.slug}` : `/s/${survey.slug}`;

  useEffect(() => {
    if (!origin) return;
    QRCode.toDataURL(publicUrl, { margin: 1, width: 220 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [publicUrl, origin]);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  const embedSnippet = `<iframe src="${publicUrl}" width="100%" height="700" frameborder="0"></iframe>`;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Status</CardTitle>
          <Badge variant={survey.status === "published" ? "default" : "secondary"}>
            {survey.status}
          </Badge>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            size="sm"
            variant={survey.status === "published" ? "outline" : "default"}
            onClick={() => onChange({ status: survey.status === "published" ? "draft" : "published" })}
          >
            {survey.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={survey.status !== "published"}
            onClick={() => onChange({ status: "closed" })}
          >
            Close survey
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Public link</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input readOnly value={publicUrl} />
            <Button variant="outline" size="icon" onClick={() => copy(publicUrl)}>
              <Copy className="size-4" />
            </Button>
          </div>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR code linking to the survey" className="size-40 rounded border" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Embed snippet</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <textarea
            readOnly
            value={embedSnippet}
            rows={3}
            className="w-full rounded-md border bg-muted/40 p-2 font-mono text-xs"
          />
          <Button variant="outline" size="sm" className="self-start" onClick={() => copy(embedSnippet)}>
            <Copy className="size-3.5" /> Copy embed code
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Limits</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-1.5">
            <Label>Close date</Label>
            <Input
              type="datetime-local"
              value={survey.close_at ? toLocalInputValue(survey.close_at) : ""}
              onChange={(e) =>
                onChange({ close_at: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Response cap</Label>
            <Input
              type="number"
              min={1}
              placeholder="No limit"
              value={survey.response_cap ?? ""}
              onChange={(e) =>
                onChange({ response_cap: e.target.value ? Number(e.target.value) : null })
              }
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Anti-abuse</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={survey.anti_abuse_mode === "cookie" ? "default" : "outline"}
              onClick={() => onChange({ anti_abuse_mode: "cookie" })}
            >
              One response per browser (cookie)
            </Button>
            <Button
              size="sm"
              variant={survey.anti_abuse_mode === "email" ? "default" : "outline"}
              onClick={() => onChange({ anti_abuse_mode: "email" })}
            >
              Strict: require email verification
            </Button>
          </div>
          <Label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={survey.ask_opt_in}
              onChange={(e) => onChange({ ask_opt_in: e.target.checked })}
            />
            Ask respondents to opt in/out of follow-up contact
          </Label>
          {survey.ask_opt_in && (
            <Input
              value={survey.opt_in_label}
              onChange={(e) => onChange({ opt_in_label: e.target.value })}
              placeholder="Opt-in checkbox label"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
