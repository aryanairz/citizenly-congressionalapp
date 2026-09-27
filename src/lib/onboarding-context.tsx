/**
 * Local app state for the sign-up → onboarding flow. Holds the user's choices
 * (name, study language, exemption, state) so later screens can use them.
 * Purely in-memory for now - nothing is submitted to the backend and nothing
 * persists across app restarts yet.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { LanguageCode } from '@/constants/brand';
import type { ExemptionChoice } from '@/constants/exemptions';

export interface OnboardingData {
  firstName: string;
  lastName: string;
  email: string;
  /**
   * PLACEHOLDER: kept in memory only so the log-in screen can validate
   * locally. Once real backend auth exists, this must move to secure storage
   * (or never be held client-side at all).
   */
  pin: string;
  /** Study language chosen in onboarding. */
  languageCode: LanguageCode | null;
  exemption: ExemptionChoice | null;
  /** Full state name, e.g. "California" (display). */
  usState: string | null;
  /** 2-letter place code, e.g. "CA" - what the personalized-questions API takes. */
  usStateCode: string | null;
  /** Congressional district (optional; null when skipped or not applicable). */
  district: number | null;
}

const EMPTY: OnboardingData = {
  firstName: '',
  lastName: '',
  email: '',
  pin: '',
  languageCode: null,
  exemption: null,
  usState: null,
  usStateCode: null,
  district: null,
};

interface OnboardingContextValue {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(EMPTY);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      data,
      update: (patch) => setData((prev) => ({ ...prev, ...patch })),
      reset: () => setData(EMPTY),
    }),
    [data],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  }
  return ctx;
}
