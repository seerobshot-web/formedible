"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Lead, NewsletterSubscription } from "@/lib/kingdom-query/types";

interface Props {
  leads: Lead[];
  subscriptions: NewsletterSubscription[];
}

export function GrowthPanel({ leads, subscriptions }: Props) {
  if (leads.length === 0 && subscriptions.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {leads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between text-sm">
              <span>{lead.email || lead.name || "Unknown"}</span>
              <Badge variant="secondary">{lead.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Newsletter sign-ups ({subscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="text-sm">
              {sub.email}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
