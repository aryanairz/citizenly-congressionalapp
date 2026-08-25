/**
 * The local account store — this app has no backend.
 *
 * Everything the "account" screens do (sign up, log in, change your email or
 * PIN, change your state) happens here, in the app, against AsyncStorage. No
 * server is contacted, no password ever leaves the device, and every button
 * works with the plane in airplane mode.
 *
 * Accounts are local to the install. Signing up stores one profile; logging in
 * checks the PIN against it. There is no account recovery because there is
 * nowhere to recover from — "Forgot PIN?" offers a fresh start instead.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LanguageCode } from '@/constants/brand';

const ACCOUNT_KEY = 'citizenly.account';

export interface LocalUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Stored locally only, never transmitted. */
  pin: string;
  state: string | null;
  district: number | null;
  preferredLang: LanguageCode | null;
  eligibilityRule: string | null;
  createdAt: string;
}

/** Distinguishes expected, message-worthy failures from bugs. */
export class AccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountError';
  }
}

function makeId(): string {
  // Good enough for a device-local identifier; no uniqueness guarantees are
  // needed beyond this install.
  return `local-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export async function readAccount(): Promise<LocalUser | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}

async function writeAccount(user: LocalUser): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(user));
}

export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  pin: string;
  state?: string | null;
  district?: number | null;
  lang?: LanguageCode | null;
  eligibilityRule?: string | null;
}

/** Create (or replace) the local account. Always succeeds barring storage failure. */
export async function createAccount(input: SignupInput): Promise<LocalUser> {
  const first = input.firstName.trim();
  const last = input.lastName.trim();
  const user: LocalUser = {
    id: makeId(),
    name: [first, last].filter(Boolean).join(' '),
    firstName: first,
    lastName: last,
    email: input.email.trim(),
    pin: input.pin,
    state: input.state ?? null,
    district: input.district ?? null,
    preferredLang: input.lang ?? null,
    eligibilityRule: input.eligibilityRule ?? null,
    createdAt: new Date().toISOString(),
  };
  await writeAccount(user);
  return user;
}

/**
 * Log in against the locally stored account. Because there is no server, the
 * only failure modes are "nothing saved on this device yet" and "wrong PIN".
 */
export async function logIn(email: string, pin: string): Promise<LocalUser> {
  const account = await readAccount();
  if (!account) {
    throw new AccountError(
      "There's no account on this device yet. Tap Get Started to make one — it only takes a moment.",
    );
  }
  const matchesEmail = account.email.toLowerCase() === email.trim().toLowerCase();
  if (!matchesEmail || account.pin !== pin) {
    throw new AccountError('That email and PIN don’t match the account on this device.');
  }
  return account;
}

/** Apply a profile change (email, PIN, state/district) to the stored account. */
export async function updateAccount(patch: Partial<LocalUser>): Promise<LocalUser> {
  const account = await readAccount();
  if (!account) throw new AccountError('No account on this device.');
  const merged: LocalUser = { ...account, ...patch };
  merged.name = [merged.firstName, merged.lastName].filter(Boolean).join(' ');
  await writeAccount(merged);
  return merged;
}

/** Verify the current PIN — used to confirm sensitive profile changes. */
export async function checkPin(pin: string): Promise<boolean> {
  const account = await readAccount();
  return account ? account.pin === pin : false;
}

/** Remove the local account entirely (used by "start fresh"). */
export async function deleteAccount(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // Storage unavailable — nothing else to do.
  }
}
