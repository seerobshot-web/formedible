"use client";

import { KingdomQueryErrorFallback } from "@/components/kingdom-query/shared/error-fallback";

export default function KingdomQueryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <KingdomQueryErrorFallback error={error} reset={reset} />;
}
