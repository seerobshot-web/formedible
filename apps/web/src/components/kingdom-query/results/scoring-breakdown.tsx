"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoringProfile, SurveyResponse } from "@/lib/kingdom-query/types";

interface Props {
  profiles: ScoringProfile[];
  responses: SurveyResponse[];
}

export function ScoringBreakdown({ profiles, responses }: Props) {
  if (profiles.length === 0) return null;

  const completed = responses.filter((r) => r.status === "completed" && r.scores);
  if (completed.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Personality scoring</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No completed responses yet.</p>
        </CardContent>
      </Card>
    );
  }

  const data = profiles.map((profile) => {
    const values = completed.map((r) => r.scores?.[profile.key] ?? 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { name: profile.label || profile.key, average: Math.round(avg * 100) / 100 };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Average trait scores ({completed.length} completed)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} />
              <Tooltip />
              <Bar dataKey="average" fill="#4f46e5" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
