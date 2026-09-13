"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useKingdomQueryAuth } from "@/lib/kingdom-query/use-auth";
import { getSupabaseClient } from "@/lib/kingdom-query/supabase-client";
import { createSurvey, listMySurveys } from "@/lib/kingdom-query/db";
import { slugify, randomSlugSuffix } from "@/lib/kingdom-query/utils";
import type { Survey } from "@/lib/kingdom-query/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function KingdomQueryDashboard() {
  const { user, loading } = useKingdomQueryAuth();
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[] | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/kingdom-query/login");
      return;
    }
    listMySurveys().then(setSurveys).catch((err) => toast.error(err.message));
  }, [user, loading, router]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const slug = `${slugify(newTitle)}-${randomSlugSuffix()}`;
      const survey = await createSurvey({ title: newTitle.trim(), slug });
      setDialogOpen(false);
      setNewTitle("");
      router.push(`/kingdom-query/edit?id=${survey.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create survey");
    } finally {
      setCreating(false);
    }
  }

  async function handleSignOut() {
    await getSupabaseClient().auth.signOut();
    router.push("/kingdom-query/login");
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kingdom Query</h1>
          <p className="text-sm text-muted-foreground">Your surveys and assessments</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> New survey
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new survey</DialogTitle>
              </DialogHeader>
              <Input
                autoFocus
                placeholder="e.g. Spiritual Gifts Assessment"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      {surveys === null && <p className="text-sm text-muted-foreground">Loading…</p>}
      {surveys && surveys.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No surveys yet. Create your first one above.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {surveys?.map((survey) => (
          <Link key={survey.id} href={`/kingdom-query/edit?id=${survey.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">{survey.title}</CardTitle>
                <Badge variant={survey.status === "published" ? "default" : "secondary"}>
                  {survey.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="truncate text-xs text-muted-foreground">/s/{survey.slug}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
