"use client";

export function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="sticky left-0 top-0 z-10 h-1 w-full bg-black/5">
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}
