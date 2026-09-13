import { v4 as uuidv4 } from "uuid";

const TOKEN_COOKIE_PREFIX = "kq_token_";
const DRAFT_KEY_PREFIX = "kq_draft_";
const COMPLETED_KEY_PREFIX = "kq_completed_";

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; samesite=lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/**
 * Returns a stable per-browser respondent token for a survey, creating one
 * (backed by both localStorage and a cookie for resilience) on first visit.
 * This is the "one response per browser" anti-abuse mechanism in cookie mode.
 */
export function getOrCreateRespondentToken(surveySlug: string): string {
  const key = `${TOKEN_COOKIE_PREFIX}${surveySlug}`;
  if (typeof window === "undefined") return uuidv4();

  const fromStorage = window.localStorage.getItem(key);
  const fromCookie = getCookie(key);
  const existing = fromStorage ?? fromCookie;
  if (existing) {
    window.localStorage.setItem(key, existing);
    setCookie(key, existing);
    return existing;
  }

  const token = uuidv4();
  window.localStorage.setItem(key, token);
  setCookie(key, token);
  return token;
}

export function hasCompletedSurvey(surveySlug: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(`${COMPLETED_KEY_PREFIX}${surveySlug}`) === "1";
}

export function markSurveyCompleted(surveySlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${COMPLETED_KEY_PREFIX}${surveySlug}`, "1");
}

export interface DraftState {
  currentQuestionId: string | null;
  answers: Record<string, unknown>;
}

export function loadDraft(surveySlug: string): DraftState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${surveySlug}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DraftState;
  } catch {
    return null;
  }
}

export function saveDraft(surveySlug: string, draft: DraftState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${DRAFT_KEY_PREFIX}${surveySlug}`, JSON.stringify(draft));
}

export function clearDraft(surveySlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${surveySlug}`);
}
