"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SurveyResponse } from "@/lib/kingdom-query/types";

export function ResultsOverview({ responses }: { responses: SurveyResponse[] }) {
  const total = responses.length;
  const completed = responses.filter((r) => r.status === "completed").length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const optedIn = responses.filter((r) => r.opted_in).length;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="Responses" value={total} />
      <StatCard label="Completed" value={completed} />
      <StatCard label="Completion rate" value={`${rate}%`} />
      <StatCard label="Opted in" value={optedIn} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
