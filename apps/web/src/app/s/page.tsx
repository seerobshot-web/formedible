"use client";

/**
 * Public survey-taking page.
 *
 * Kingdom Query is a static export (see next.config.ts `output: "export"`),
 * so this route cannot be a dynamic `[slug]` segment -- every survey slug is
 * created at runtime, long after the site is built, and static export can
 * only pre-render params known at build time.
 *
 * Instead this is a single static page (exported to `/s.html`) and the host
 * rewrites pretty URLs like `/s/my-survey` to this file *without* redirecting
 * (see the `.htaccess` rule shipped in `public/.htaccess`), so the browser
 * still shows `/s/my-survey` while this file's JS reads the slug straight out
 * of `window.location.pathname`. A `?slug=` query param is also supported as
 * a fallback, which is what you get for free when running `next dev`.
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPublishedSurveyBySlug } from "@/lib/kingdom-query/db";
import type { SurveyWithQuestions } from "@/lib/kingdom-query/types";
import { SurveyRunner } from "@/components/kingdom-query/runtime/survey-runner";

function resolveSlugFromPath(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/\/s\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function TakeSurveyPageInner() {
  const searchParams = useSearchParams();
  const [slug, setSlug] = useState<string | null>(null);
  const [survey, setSurvey] = useState<SurveyWithQuestions | null | undefined>(undefined);

  useEffect(() => {
    setSlug(resolveSlugFromPath() ?? searchParams.get("slug"));
  }, [searchParams]);

  useEffect(() => {
    if (!slug) return;
    getPublishedSurveyBySlug(slug)
      .then(setSurvey)
      .catch(() => setSurvey(null));
  }, [slug]);

  if (slug === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Missing survey link</h1>
        <p className="text-muted-foreground">Check that you used the full link you were given.</p>
      </div>
    );
  }

  if (survey === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (survey === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Survey not found</h1>
        <p className="text-muted-foreground">This survey may be unpublished or the link is incorrect.</p>
      </div>
    );
  }

  return <SurveyRunner survey={survey} />;
}

export default function TakeSurveyPage() {
  return (
    <Suspense fallback={null}>
      <TakeSurveyPageInner />
    </Suspense>
  );
}
