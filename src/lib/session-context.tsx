/**
 * Real auth session, backed by the website's /api/auth endpoints.
 *
 * The JWT lives in SecureStore (AsyncStorage on web — see token-store.ts);
 * the user object is cached alongside it so a
 * launch WITHOUT network still lands on the Dashboard with the cached name
 * (offline questions cover the rest). On every launch with a token we refresh
 * via /api/auth/me in the background: an explicit "not valid" answer signs
 * out, a network failure keeps the cached user.
 *
 * On sign-in/restore the user is also mirrored into the onboarding context
 * (name, language, exemption, state, district) — every existing consumer
 * (greeting, question pool, study language) reads from there.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { LANGUAGES, type LanguageCode } from '@/constants/brand';
import { EXEMPTIONS, type ExemptionChoice } from '@/constants/exemptions';
import { US_STATES } from '@/constants/us-states';
import { apiMe, type AuthUser } from '@/lib/api';
import { clearMistakeQueue, flushMistakeQueue } from '@/lib/mistake-queue';
import { useOnboarding, type OnboardingData } from '@/lib/onboarding-context';
import { deleteStoredItem, getStoredItem, setStoredItem } from '@/lib/token-store';

const TOKEN_KEY = 'citizenly.token';
const USER_KEY = 'citizenly.user';

export type SessionStatus = 'restoring' | 'signedOut' | 'signedIn';

interface SessionContextValue {
  status: SessionStatus;
  user: AuthUser | null;
  token: string | null;
  signIn: (user: AuthUser, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Merge profile changes into the in-memory + cached user (and onboarding mirror). */
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Map a server user onto the onboarding fields the rest of the app reads. */
function userToOnboardingPatch(user: AuthUser): Partial<OnboardingData> {
  const language = LANGUAGES.find((l) => l.code === user.preferredLang)?.code;
  const exemption = EXEMPTIONS.find((e) => e.id === user.eligibilityRule)?.id;
  const place = US_STATES.find((p) => p.code === user.state);
  return {
    firstName: user.firstName ?? user.name.split(/\s+/)[0] ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    languageCode: (language as LanguageCode) ?? null,
    exemption: (exemption as ExemptionChoice) ?? null,
    usState: place?.name ?? null,
    usStateCode: user.state ?? null,
    district: user.district ?? null,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { update, reset } = useOnboarding();
  const [status, setStatus] = useState<SessionStatus>('restoring');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    (async () => {
      try {
        const storedToken = await getStoredItem(TOKEN_KEY);
        if (!storedToken) {
          setStatus('signedOut');
          return;
        }

        // Show the cached user immediately (decision: offline launches still
        // reach the Dashboard) …
        const cachedRaw = await getStoredItem(USER_KEY);
        const cached = cachedRaw ? (JSON.parse(cachedRaw) as AuthUser) : null;
        setToken(storedToken);
        if (cached) {
          setUser(cached);
          update(userToOnboardingPatch(cached));
        }
        setStatus('signedIn');

        // … then refresh in the background. Only an explicit "session invalid"
        // signs out; network errors keep the cached user.
        try {
          const fresh = await apiMe(storedToken);
          if (fresh) {
            setUser(fresh);
            update(userToOnboardingPatch(fresh));
            await setStoredItem(USER_KEY, JSON.stringify(fresh));
          } else {
            await deleteStoredItem(TOKEN_KEY);
            await deleteStoredItem(USER_KEY);
            setToken(null);
            setUser(null);
            setStatus('signedOut');
          }
        } catch {
          // Offline — keep the cached session.
        }
      } catch {
        setStatus('signedOut');
      }
    })();
  }, [update]);

  // Retry any queued offline mistake-writes whenever a session is available
  // and whenever the app returns to the foreground.
  useEffect(() => {
    if (status !== 'signedIn' || !token || !user?.id) return;
    void flushMistakeQueue(user.id, token);
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') {
        void flushMistakeQueue(user.id, token);
      }
    });
    return () => subscription.remove();
  }, [status, token, user?.id]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      token,
      signIn: async (nextUser, nextToken) => {
        // Persist FIRST: if storage fails, the caller gets the error while
        // the app is still cleanly signed out, instead of a signed-in UI
        // whose session evaporates on the next launch.
        await setStoredItem(TOKEN_KEY, nextToken);
        await setStoredItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        setToken(nextToken);
        setStatus('signedIn');
        update(userToOnboardingPatch(nextUser));
      },
      signOut: async () => {
        const departingUserId = user?.id;
        setUser(null);
        setToken(null);
        setStatus('signedOut');
        reset();
        await deleteStoredItem(TOKEN_KEY);
        await deleteStoredItem(USER_KEY);
        // Best-effort: push any queued mistake-writes, then drop the queue so
        // a shared device doesn't carry this user's pending data.
        if (departingUserId && token) {
          await flushMistakeQueue(departingUserId, token).catch(() => {});
        }
        if (departingUserId) {
          await clearMistakeQueue(departingUserId);
        }
      },
      updateUser: async (patch) => {
        if (!user) return;
        const merged = { ...user, ...patch };
        setUser(merged);
        update(userToOnboardingPatch(merged));
        await setStoredItem(USER_KEY, JSON.stringify(merged));
      },
    }),
    [status, user, token, update, reset],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return ctx;
}
