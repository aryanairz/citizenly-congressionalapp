/**
 * The signed-in session - entirely local to this device.
 *
 * There is no server: the account lives in AsyncStorage (src/lib/local-account.ts)
 * and this context just holds whichever profile is currently active. Restoring
 * a session is a single local read, so launching offline works exactly like
 * launching online - because they're the same thing.
 *
 * On sign-in/restore the user is mirrored into the onboarding context (name,
 * language, exemption, state, district) - every consumer (greeting, question
 * pool, study language) reads from there.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { LANGUAGES, type LanguageCode } from '@/constants/brand';
import { EXEMPTIONS, type ExemptionChoice } from '@/constants/exemptions';
import { US_STATES } from '@/constants/us-states';
import { deleteAccount, readAccount, type LocalUser } from '@/lib/local-account';
import { useOnboarding, type OnboardingData } from '@/lib/onboarding-context';
import { getStoredItem, deleteStoredItem, setStoredItem } from '@/lib/token-store';

/** Marks which local account is "signed in" between launches. */
const ACTIVE_KEY = 'citizenly.activeUser';

export type SessionStatus = 'restoring' | 'signedOut' | 'signedIn';

export type AuthUser = LocalUser;

interface SessionContextValue {
  status: SessionStatus;
  user: AuthUser | null;
  signIn: (user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  /** Merge profile changes into the active user (and the onboarding mirror). */
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
  /** Delete the local account entirely and return to signed-out. */
  forgetAccount: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Map a stored user onto the onboarding fields the rest of the app reads. */
function userToOnboardingPatch(user: AuthUser): Partial<OnboardingData> {
  const language = LANGUAGES.find((l) => l.code === user.preferredLang)?.code;
  const exemption = EXEMPTIONS.find((e) => e.id === user.eligibilityRule)?.id;
  const place = US_STATES.find((p) => p.code === user.state);
  return {
    firstName: user.firstName || user.name.split(/\s+/)[0] || '',
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
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    (async () => {
      try {
        const active = await getStoredItem(ACTIVE_KEY);
        if (!active) {
          setStatus('signedOut');
          return;
        }
        const account = await readAccount();
        if (!account || account.id !== active) {
          await deleteStoredItem(ACTIVE_KEY);
          setStatus('signedOut');
          return;
        }
        setUser(account);
        update(userToOnboardingPatch(account));
        setStatus('signedIn');
      } catch {
        setStatus('signedOut');
      }
    })();
  }, [update]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      signIn: async (nextUser) => {
        await setStoredItem(ACTIVE_KEY, nextUser.id);
        setUser(nextUser);
        setStatus('signedIn');
        update(userToOnboardingPatch(nextUser));
      },
      signOut: async () => {
        setUser(null);
        setStatus('signedOut');
        reset();
        await deleteStoredItem(ACTIVE_KEY);
      },
      updateUser: async (patch) => {
        if (!user) return;
        const merged = { ...user, ...patch };
        setUser(merged);
        update(userToOnboardingPatch(merged));
      },
      forgetAccount: async () => {
        setUser(null);
        setStatus('signedOut');
        reset();
        await deleteStoredItem(ACTIVE_KEY);
        await deleteAccount();
      },
    }),
    [status, user, update, reset],
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
