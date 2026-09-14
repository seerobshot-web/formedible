"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/kingdom-query/supabase-client";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Shared error boundary UI for the Kingdom Query section (see
 * app/kingdom-query/error.tsx and app/s/error.tsx). Recognizes the specific
 * "missing Supabase env vars" throw from lib/kingdom-query/supabase-client.ts
 * and shows a clear setup message instead of a generic crash screen --
 * that's the one error every fresh deployment is guaranteed to hit before
 * `.env.local` is filled in.
 */
export function KingdomQueryErrorFallback({ error, reset }: Props) {
  const isMissingEnv = error.message.includes(MISSING_SUPABASE_ENV_MESSAGE);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="size-8 text-amber-500" />

      {isMissingEnv ? (
        <>
          <h1 className="text-xl font-semibold">Kingdom Query isn&apos;t configured yet</h1>
          <p className="text-sm text-muted-foreground">
            This deployment is missing its Supabase credentials. Set{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            (see <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.example</code>), then
            rebuild -- these are read at build time, so a running site won&apos;t pick up new env
            vars without one.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
        </>
      )}

      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
