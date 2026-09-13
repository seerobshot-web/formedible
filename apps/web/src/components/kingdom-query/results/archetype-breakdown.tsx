"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Archetype, SubProfile, SurveyResponse } from "@/lib/kingdom-query/types";

interface Props {
  archetypes: Archetype[];
  subprofiles: SubProfile[];
  responses: SurveyResponse[];
}

export function ArchetypeBreakdown({ archetypes, subprofiles, responses }: Props) {
  if (archetypes.length === 0) return null;

  const completed = responses.filter((r) => r.status === "completed");
  if (completed.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Archetype distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No completed responses yet.</p>
        </CardContent>
      </Card>
    );
  }

  const archetypeData = archetypes.map((a) => ({
    name: a.label || a.key,
    count: completed.filter((r) => r.archetype_id === a.id).length,
  }));

  const subprofileData = subprofiles.map((s) => ({
    name: s.label || s.key,
    count: completed.filter((r) => r.subprofile_id === s.id).length,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Archetype distribution ({completed.length} completed)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={archetypeData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} />
                <Tooltip />
                <Bar dataKey="count" fill="#6d28d9" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {subprofiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sub-profile distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={subprofileData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={140} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#9333ea" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
