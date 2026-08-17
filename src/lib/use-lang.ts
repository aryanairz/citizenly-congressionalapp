/**
 * The user's study language for UI chrome. Reads the onboarding context,
 * which session-context keeps mirrored from the server user on sign-in and
 * restore — so this is correct for both onboarding flows and signed-in use.
 */

import type { LanguageCode } from '@/constants/brand';
import { useOnboarding } from '@/lib/onboarding-context';

export function useLang(): LanguageCode {
  const { data } = useOnboarding();
  return data.languageCode ?? 'en';
}
