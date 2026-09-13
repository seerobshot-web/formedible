"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/kingdom-query/supabase-client";
import { claimResponse } from "@/lib/kingdom-query/db";
import { toast } from "sonner";

interface Props {
  responseId: string;
  respondentToken: string;
  accentColor: string;
}

/**
 * Lets a respondent create an account right after finishing a survey so they
 * can come back later to view/edit/delete this response (see
 * /kingdom-query/my-results). Purely optional -- the response already exists
 * anonymously either way.
 */
export function ClaimAccountForm({ responseId, respondentToken, accentColor }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.session) {
        await claimResponse(responseId, respondentToken);
        setClaimed(true);
        toast.success("Saved! You can view your results anytime from My Results.");
      } else {
        setNeedsConfirmation(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create your account");
    } finally {
      setBusy(false);
    }
  }

  if (claimed) {
    return <p className="text-sm text-muted-foreground">Your results are saved to your account.</p>;
  }

  if (needsConfirmation) {
    return (
      <p className="text-sm text-muted-foreground">
        Check your email to confirm your account, then sign in from My Results to save this response.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-2">
      <p className="text-sm text-muted-foreground">Save your results to an account (optional)</p>
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border px-3 py-2 text-sm"
      />
      <input
        type="password"
        required
        minLength={6}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md px-4 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: accentColor }}
      >
        Save my results
      </button>
    </form>
  );
}
