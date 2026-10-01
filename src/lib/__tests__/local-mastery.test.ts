/**
 * The mastery set is the dashboard's only source of truth, and it is the
 * device's only copy: accounts here do not sync, transfer or recover, so a
 * bug in this file destroys someone's study history with nothing to restore
 * from. That is the reason it is tested before anything prettier is.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addMastered,
  clearMastered,
  getMastered,
  removeMastered,
} from '@/lib/local-mastery';

// ts-jest hoists this above the imports, so the module under test receives the
// in-memory store rather than the real native one.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      store,
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
    },
  };
});

const backing = (AsyncStorage as unknown as { store: Map<string, string> }).store;

const ALICE = 'user-alice';
const BOB = 'user-bob';

beforeEach(() => {
  backing.clear();
  jest.clearAllMocks();
});

describe('reading', () => {
  it('starts empty for a user who has never answered anything', async () => {
    expect(await getMastered(ALICE)).toEqual([]);
  });

  it('returns empty rather than throwing when the stored value is corrupt', async () => {
    backing.set('citizenly.mastered.user-alice', '{not json');
    expect(await getMastered(ALICE)).toEqual([]);
  });

  it('drops non-string entries instead of trusting the stored shape', async () => {
    backing.set('citizenly.mastered.user-alice', JSON.stringify(['g1', 42, null, 'g2']));
    expect(await getMastered(ALICE)).toEqual(['g1', 'g2']);
  });

  it('returns empty when the stored value is not an array at all', async () => {
    backing.set('citizenly.mastered.user-alice', JSON.stringify({ g1: true }));
    expect(await getMastered(ALICE)).toEqual([]);
  });
});

describe('adding', () => {
  it('records a correct answer', async () => {
    await addMastered(ALICE, 'g1');
    expect(await getMastered(ALICE)).toEqual(['g1']);
  });

  it('is idempotent, so answering the same question right twice counts once', async () => {
    await addMastered(ALICE, 'g1');
    await addMastered(ALICE, 'g1');
    expect(await getMastered(ALICE)).toEqual(['g1']);
  });

  it('keeps every distinct question', async () => {
    await addMastered(ALICE, 'g1');
    await addMastered(ALICE, 'h7');
    await addMastered(ALICE, 's3');
    expect(await getMastered(ALICE)).toEqual(['g1', 'h7', 's3']);
  });
});

describe('removing', () => {
  it('drops a question that was answered wrong again', async () => {
    await addMastered(ALICE, 'g1');
    await addMastered(ALICE, 'h7');
    await removeMastered(ALICE, 'g1');
    expect(await getMastered(ALICE)).toEqual(['h7']);
  });

  it('is a no-op for a question that was never mastered', async () => {
    await addMastered(ALICE, 'g1');
    await removeMastered(ALICE, 'never-seen');
    expect(await getMastered(ALICE)).toEqual(['g1']);
  });

  it('clears the key entirely once the last question is removed', async () => {
    await addMastered(ALICE, 'g1');
    await removeMastered(ALICE, 'g1');
    expect(await getMastered(ALICE)).toEqual([]);
    expect(backing.has('citizenly.mastered.user-alice')).toBe(false);
  });
});

describe('clearing', () => {
  it('empties the set', async () => {
    await addMastered(ALICE, 'g1');
    await addMastered(ALICE, 'h7');
    await clearMastered(ALICE);
    expect(await getMastered(ALICE)).toEqual([]);
  });
});

describe('account scoping', () => {
  it('keeps two people sharing a phone apart', async () => {
    await addMastered(ALICE, 'g1');
    await addMastered(BOB, 'h7');

    expect(await getMastered(ALICE)).toEqual(['g1']);
    expect(await getMastered(BOB)).toEqual(['h7']);
  });

  it('does not touch the other account when one is cleared', async () => {
    await addMastered(ALICE, 'g1');
    await addMastered(BOB, 'h7');
    await clearMastered(ALICE);

    expect(await getMastered(ALICE)).toEqual([]);
    expect(await getMastered(BOB)).toEqual(['h7']);
  });
});

describe('storage failure', () => {
  it('never throws when the device refuses to write', async () => {
    const setItem = AsyncStorage.setItem as jest.Mock;
    setItem.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(addMastered(ALICE, 'g1')).resolves.toBeUndefined();
  });

  it('never throws when the device refuses to read', async () => {
    const getItem = AsyncStorage.getItem as jest.Mock;
    getItem.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(getMastered(ALICE)).resolves.toEqual([]);
  });
});
