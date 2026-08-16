/**
 * API client for the shared Citizenly backend (same Next.js server that powers
 * the website). Endpoints live under `${EXPO_PUBLIC_API_BASE}/api/*`.
 *
 * EXPO_PUBLIC_API_BASE is read from the environment at build/start time. Any
 * env var prefixed with EXPO_PUBLIC_ is inlined into the JS bundle by Expo, so
 * it's available in the app without extra config. See the README / setup notes
 * for how to point this at your dev machine when testing on a physical phone.
 */

import type { LanguageCode } from '@/constants/brand';

/**
 * A string localized into the supported languages. Only `en`, `ml`, and `gu`
 * are guaranteed to be present in the data; the other 8 are optional and may be
 * missing for a given question, so callers should fall back (usually to `en`).
 */
export type LocalizedText = { en: string; ml: string; gu: string } & Partial<
  Record<LanguageCode, string>
>;

export interface Question {
  id: string;
  topic: string;
  /** The prompt, localized. */
  question: LocalizedText;
  /** Answer choices; each choice is localized into all 11 languages. */
  options: LocalizedText[];
  /** Index into `options` of the single correct answer. */
  correctIndex: number;
  /** For multi-select questions, all correct indices into `options`. */
  correctIndices?: number[];
  /** Why the answer is correct, localized. */
  explanation: LocalizedText;
  /** True for questions specific to the 65/20 exemption question set. */
  is6520: boolean;
}

/** Shape returned by the `/api/questions` endpoint. */
export interface QuestionsResponse {
  count: number;
  questions: Question[];
}

/** Which question set to request. Omit for the default set. */
export type QuestionSet = 'official' | '6520';

export interface FetchQuestionsOptions {
  set?: QuestionSet;
  /** Optional AbortSignal to cancel the request (e.g. on unmount). */
  signal?: AbortSignal;
}

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

/**
 * Fetch the citizenship-test questions from the shared backend.
 *
 * @throws if EXPO_PUBLIC_API_BASE is not set or the request fails.
 */
export async function fetchQuestions(
  options: FetchQuestionsOptions = {},
): Promise<Question[]> {
  if (!API_BASE) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE is not set. Create a .env file with ' +
        'EXPO_PUBLIC_API_BASE=http://<your-computer-ip>:3000 and restart Expo ' +
        'with `npx expo start -c`.',
    );
  }

  const url = new URL('/api/questions', API_BASE);
  if (options.set) {
    url.searchParams.set('set', options.set);
  }

  const response = await fetch(url.toString(), { signal: options.signal });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch questions: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as QuestionsResponse;
  return data.questions;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/** The user object returned by the website's auth endpoints. */
export interface AuthUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  /** 2-letter place code, e.g. "TX". */
  state?: string;
  district?: number;
  preferredLang?: string;
  eligibilityRule?: string;
}

export interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  pin: string;
  state?: string;
  district?: number;
  lang?: string;
  eligibilityRule?: string;
}

/** Thrown when the server answered with an error body (vs. network failure). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Abort after `ms` so unreachable hosts fail fast instead of dangling. */
function timeoutSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

async function authFetch(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; token?: string } = {},
): Promise<unknown> {
  if (!API_BASE) {
    throw new Error('EXPO_PUBLIC_API_BASE is not set.');
  }
  const { signal, cancel } = timeoutSignal(12000);
  try {
    const response = await fetch(new URL(path, API_BASE).toString(), {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal,
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new ApiError(data.error ?? `Request failed (${response.status})`, response.status);
    }
    return data;
  } finally {
    cancel();
  }
}

export async function apiLogin(
  email: string,
  pin: string,
): Promise<{ user: AuthUser; token: string }> {
  return (await authFetch('/api/auth/login', {
    method: 'POST',
    body: { email, pin },
  })) as { user: AuthUser; token: string };
}

export async function apiSignup(
  payload: SignupPayload,
): Promise<{ user: { id: string; name: string }; token: string }> {
  return (await authFetch('/api/signup', { method: 'POST', body: payload })) as {
    user: { id: string; name: string };
    token: string;
  };
}

/** Fetch the current user for a stored token; null when the session is invalid. */
export async function apiMe(token: string): Promise<AuthUser | null> {
  const data = (await authFetch('/api/auth/me', { token })) as { user: AuthUser | null };
  return data.user;
}

/** Add one question to the user's mistake set (server-side idempotent). */
export async function apiAddMistake(questionId: string, token: string): Promise<void> {
  await authFetch('/api/mistakes', {
    method: 'POST',
    body: { question_id: questionId },
    token,
  });
}

/** The user's current mistake set as question ids, newest first. */
export async function apiGetMistakes(token: string): Promise<string[]> {
  const data = (await authFetch('/api/mistakes', { token })) as {
    mistakes: { question_id: string }[];
  };
  return (data.mistakes ?? []).map((m) => m.question_id);
}

/** Resolve one mistake (the review screen is the only caller). */
export async function apiRemoveMistake(questionId: string, token: string): Promise<void> {
  await authFetch('/api/mistakes', {
    method: 'DELETE',
    body: { question_id: questionId },
    token,
  });
}

/** Clear the user's whole mistake set. */
export async function apiClearMistakes(token: string): Promise<void> {
  await authFetch('/api/mistakes', { method: 'DELETE', token });
}

/** Change email; requires the current PIN. Returns the normalized new email. */
export async function apiUpdateEmail(
  newEmail: string,
  pin: string,
  token: string,
): Promise<string> {
  const data = (await authFetch('/api/users/email', {
    method: 'PATCH',
    body: { newEmail, pin },
    token,
  })) as { email: string };
  return data.email;
}

/** Change PIN; requires the current PIN. */
export async function apiUpdatePin(
  currentPin: string,
  newPin: string,
  token: string,
): Promise<void> {
  await authFetch('/api/users/pin', { method: 'PATCH', body: { currentPin, newPin }, token });
}

/** Change state/district (no PIN) — re-drives personalized questions. */
export async function apiUpdatePlace(
  state: string,
  district: number | null,
  token: string,
): Promise<void> {
  await authFetch('/api/users/place', { method: 'PATCH', body: { state, district }, token });
}

export interface FetchPersonalizedOptions {
  /** 2-letter place code, e.g. "CA" (the endpoint also accepts full names). */
  state: string;
  /** Congressional district; omit for none/unknown (and for DC/territories). */
  district?: number;
  signal?: AbortSignal;
}

/**
 * Fetch the runtime-generated personalized questions (governor, senators,
 * representative, capital — with DC/territory special cases) for the user's
 * place. Returns the same Question shape as fetchQuestions.
 */
export async function fetchPersonalizedQuestions(
  options: FetchPersonalizedOptions,
): Promise<Question[]> {
  if (!API_BASE) {
    throw new Error('EXPO_PUBLIC_API_BASE is not set.');
  }

  const url = new URL('/api/personalized-questions', API_BASE);
  url.searchParams.set('state', options.state);
  if (options.district !== undefined) {
    url.searchParams.set('district', String(options.district));
  }

  const response = await fetch(url.toString(), { signal: options.signal });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch personalized questions: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as QuestionsResponse;
  return data.questions;
}
