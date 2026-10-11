import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, enterGallery, takeRelic, hideRelic, beginInvestigation, inspectSpot, requestHint, accuse, RELICS, type CaseState } from '../src/rules.ts';
import { loadProfile, saveProfile, loadRun, saveRun, clearRun, awardResult, nextRelic, PROFILE_KEY, RUN_KEY, type StorageLike, type Profile } from '../src/storage.ts';

function memory() {
  const values = new Map<string, string>();
  const storage: StorageLike = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
  };
  return { values, storage };
}
function solve(seed = 1, relic = 0, seconds = 45, wrong = false, hints = false): CaseState {
  let state = enterGallery(createCase(seed, relic), 'terrace', 1).state;
  state = takeRelic(state, 1).state;
  state = hideRelic(state, 'clock', 1).state;
  state = beginInvestigation(state).state;
  if (hints) state = requestHint(state).state;
  for (const spot of ['terrace', 'pedestal', 'clock'] as const) state = inspectSpot(state, spot).state;
  if (wrong) state = accuse(state, state.suspects.find(suspect => suspect.id !== state.culpritId)!.id, seconds).state;
  return accuse(state, state.culpritId, seconds).state;
}

test('first visit starts with independent empty profiles, sound on, and first treasure selected', () => {
  const { storage } = memory();
  const a = loadProfile(storage), b = loadProfile(storage);
  assert.deepEqual(a, { version: 2, best: null, cases: 0, streak: 0, bestStreak: 0,
    collection: [0, 0, 0, 0, 0, 0], completedIds: [], submittedIds: [], settings: { muted: false, relaxed: false } });
  assert.notEqual(a, b);
  assert.notEqual(a.collection, b.collection);
  assert.equal(nextRelic(a), 0);
  assert.equal(loadRun(storage), null);
});

test('profile and active run survive JSON storage without changing legacy or unrelated keys', () => {
  const { storage, values } = memory();
  values.set('aftertrace', 'legacy saved game'); values.set('another-game.best', '900');
  let profile = awardResult(loadProfile(storage), solve(1));
  profile = { ...profile, settings: { muted: true, relaxed: true }, submittedIds: [...profile.completedIds] };
  assert.equal(saveProfile(profile, storage), true);
  assert.deepEqual(loadProfile(storage), profile);
  const run = enterGallery(createCase(80, 2), 'door', .72).state;
  assert.equal(saveRun(run, 8.456, storage), true);
  assert.deepEqual(loadRun(storage), { state: run, elapsedSeconds: 8.456 });
  clearRun(storage);
  assert.equal(loadRun(storage), null);
  assert.deepEqual(loadProfile(storage), profile);
  assert.equal(values.get('aftertrace'), 'legacy saved game');
  assert.equal(values.get('another-game.best'), '900');
});

test('storage failures are safe on every operation and default storage access is deferred', () => {
  const unavailable: StorageLike = {
    getItem: () => { throw new Error('Unavailable'); },
    setItem: () => { throw new Error('Quota exceeded'); },
    removeItem: () => { throw new Error('Unavailable'); },
  };
  assert.equal(loadProfile(unavailable).cases, 0);
  assert.equal(loadRun(unavailable), null);
  assert.equal(saveProfile(loadProfile(unavailable), unavailable), false);
  assert.equal(saveRun(createCase(1), 0, unavailable), false);
  assert.doesNotThrow(() => clearRun(unavailable));
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Access denied'); } });
    assert.equal(loadProfile().cases, 0);
    assert.equal(loadRun(), null);
    assert.equal(saveProfile(loadProfile()), false);
    assert.equal(saveRun(createCase(1), 0), false);
    assert.doesNotThrow(() => clearRun());
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('malformed, old and oversized profile saves are ignored without deleting them', () => {
  const { storage, values } = memory();
  for (const raw of ['{bad', 'null', '42', '{"version":1}', 'x'.repeat(64_001)]) {
    values.set(PROFILE_KEY, raw);
    assert.equal(loadProfile(storage).cases, 0);
    assert.equal(values.get(PROFILE_KEY), raw);
  }
  const valid = awardResult(loadProfile(memory().storage), solve());
  const changes: Array<(value: any) => void> = [
    v => { v.cases = -1; }, v => { v.cases = 1.5; }, v => { v.cases = Infinity; },
    v => { v.streak = 2; }, v => { v.bestStreak = -1; }, v => { v.collection.pop(); },
    v => { v.collection[0] = 4; }, v => { v.best.score = 3001; }, v => { v.best.stars = 0; },
    v => { v.best.elapsedSeconds = -1; }, v => { v.best.relicId = 'unknown'; },
    v => { v.settings.muted = 'true'; }, v => { v.settings = null; },
    v => { v.completedIds = ['other-game']; }, v => { v.submittedIds = [42]; },
    v => { v.completedIds = Array.from({ length: 1025 }, (_, i) => `aftertrace-${i}`); },
  ];
  for (const change of changes) {
    const changed = structuredClone(valid); change(changed);
    values.set(PROFILE_KEY, JSON.stringify(changed));
    assert.equal(loadProfile(storage).cases, 0);
    assert.equal(saveProfile(changed, storage), false);
  }
});

test('run validation rejects corrupt clues, clocks and result envelopes instead of restoring them', () => {
  const { storage, values } = memory();
  const state = createCase(7);
  for (const raw of ['{bad', 'null', '{"version":1}', JSON.stringify({ version: 2, state, elapsedSeconds: -1 }), JSON.stringify({ version: 2, state, elapsedSeconds: null })]) {
    values.set(RUN_KEY, raw); assert.equal(loadRun(storage), null);
  }
  for (const seconds of [-1, NaN, Infinity, -Infinity]) assert.equal(saveRun(state, seconds, storage), false);
  assert.equal(saveRun(state, 20_000, storage), true);
  assert.equal(loadRun(storage)!.elapsedSeconds, 9999);
  const corrupted = structuredClone(solve()); corrupted.found[0].value = 'mint';
  if (corrupted.traces[0].value === 'mint') corrupted.found[0].value = 'coral';
  assert.equal(saveRun(corrupted, 45, storage), false);
  const closed = solve();
  assert.equal(saveRun(closed, 88, storage), true);
  assert.equal(loadRun(storage)!.elapsedSeconds, closed.result!.elapsedSeconds);
  values.set(RUN_KEY, JSON.stringify({ version: 2, state: closed, elapsedSeconds: 99 }));
  assert.equal(loadRun(storage), null);
});

test('awards are immutable and restoring a completed result cannot increment stats twice', () => {
  const { storage } = memory();
  const original = loadProfile(storage), finished = solve(3, 2);
  const profile = awardResult(original, finished);
  assert.equal(original.cases, 0); assert.equal(original.collection[2], 0);
  assert.equal(profile.cases, 1); assert.equal(profile.streak, 1); assert.equal(profile.bestStreak, 1);
  assert.equal(profile.collection[2], 3);
  assert.deepEqual(profile.completedIds, [finished.id]);
  assert.equal(awardResult(profile, finished), profile);
  assert.equal(awardResult(profile, createCase(99)), profile);
  saveProfile(profile, storage); saveRun(finished, 45, storage);
  const restoredProfile = loadProfile(storage), restoredRun = loadRun(storage)!;
  assert.equal(awardResult(restoredProfile, restoredRun.state), restoredProfile);
  const invalid = structuredClone(finished); invalid.result!.score += 1;
  assert.equal(awardResult(profile, invalid), profile);
});

test('collection unlocks in order, cycles after completion, and never loses earned stars', () => {
  let profile = loadProfile(memory().storage);
  for (let i = 0; i < RELICS.length; i++) {
    assert.equal(nextRelic(profile), i);
    profile = awardResult(profile, solve(100 + i, i));
    assert.equal(profile.collection[i], 3);
  }
  assert.equal(nextRelic(profile), 0);
  profile = awardResult(profile, solve(200, 0, 180, true, true));
  assert.equal(nextRelic(profile), 1);
  assert.deepEqual(profile.collection, [3, 3, 3, 3, 3, 3]);
});

test('first-try solves build a streak, hints retain it and a wrong guest resets only the current streak', () => {
  let profile = loadProfile(memory().storage);
  profile = awardResult(profile, solve(1));
  profile = awardResult(profile, solve(2, 0, 45, false, true));
  assert.equal(profile.streak, 2); assert.equal(profile.bestStreak, 2);
  profile = awardResult(profile, solve(3, 0, 45, true));
  assert.equal(profile.streak, 0); assert.equal(profile.bestStreak, 2);
  profile = awardResult(profile, solve(4));
  assert.equal(profile.streak, 1); assert.equal(profile.bestStreak, 2);
});

test('best run prefers a greater score, then lower active time on an equal score', () => {
  let profile = loadProfile(memory().storage);
  profile = awardResult(profile, solve(1, 0, 120));
  const slow = profile.best!;
  profile = awardResult(profile, solve(2, 1, 45));
  assert.ok(profile.best!.score > slow.score);
  profile = awardResult(profile, solve(3, 2, 30));
  assert.equal(profile.best!.elapsedSeconds, 30);
  assert.equal(profile.best!.relicId, RELICS[2].id);
  profile = awardResult(profile, solve(4, 3, 40));
  assert.equal(profile.best!.elapsedSeconds, 30);
  profile = awardResult(profile, solve(5, 4, 10, true));
  assert.equal(profile.best!.relicId, RELICS[2].id);
});

test('completion and submission receipts retain only the latest 64 unique IDs', () => {
  const { storage } = memory();
  let profile = loadProfile(storage);
  for (let i = 0; i < 70; i++) profile = awardResult(profile, solve(1000 + i, i % RELICS.length));
  assert.equal(profile.cases, 70);
  assert.equal(profile.completedIds.length, 64);
  assert.equal(profile.completedIds[0], createCase(1006, 0).id);
  assert.equal(profile.completedIds[63], createCase(1069, 3).id);
  profile = { ...profile, submittedIds: Array.from({ length: 70 }, (_, i) => `aftertrace-${i}`).concat('aftertrace-69') };
  assert.equal(saveProfile(profile, storage), true);
  const restored = loadProfile(storage);
  assert.equal(restored.submittedIds.length, 64);
  assert.equal(restored.submittedIds[0], 'aftertrace-6');
  assert.equal(restored.submittedIds[63], 'aftertrace-69');
  assert.equal(awardResult(restored, solve(1069, 3)), restored);
});
