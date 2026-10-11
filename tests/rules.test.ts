import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCase, enterGallery, takeRelic, hideRelic, beginInvestigation, inspectSpot,
  requestHint, accuse, canAccuse, matchingSuspects, calculateScore, gradeTiming, validateCase,
  ENTRIES, STASHES, SPOTS, RELICS, SCORE_MAX, STAR_THRESHOLDS,
  type CaseState, type EntryId, type StashId, type SpotId,
} from '../src/rules.ts';

function heist(entry: EntryId = 'window', stash: StashId = 'planter', seed: number | string = 42): CaseState {
  let state = createCase(seed);
  state = enterGallery(state, entry, .9).state;
  state = takeRelic(state, .8).state;
  return hideRelic(state, stash, 1).state;
}
function investigate(entry: EntryId = 'window', stash: StashId = 'planter'): CaseState {
  let state = beginInvestigation(heist(entry, stash)).state;
  for (const spot of [entry, 'pedestal', stash] as const) state = inspectSpot(state, spot).state;
  return state;
}
function deeplyFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deeplyFreeze);
    Object.freeze(value);
  }
  return value;
}

test('every entrance and hiding place deposits exactly the same traces the detective later finds', () => {
  for (const entry of ENTRIES) for (const stash of STASHES) {
    const completedHeist = deeplyFreeze(heist(entry.id, stash.id));
    assert.deepEqual(completedHeist.traces.map(clue => clue.spot), [entry.id, 'pedestal', stash.id]);
    assert.deepEqual(completedHeist.traces.map(clue => clue.value), [completedHeist.profile.tread, completedHeist.profile.fabric, completedHeist.profile.charm]);
    let state = beginInvestigation(completedHeist).state;
    assert.equal(state.found.length, 0);
    for (const spot of SPOTS) {
      const action = inspectSpot(state, spot.id);
      state = action.state;
      assert.equal(Boolean(action.clue), completedHeist.traces.some(clue => clue.spot === spot.id));
    }
    assert.equal(state.found.length, 3);
    assert.equal(state.traces, completedHeist.traces);
    for (const clue of state.found) assert.deepEqual(clue, completedHeist.traces.find(trace => trace.id === clue.id));
    assert.equal(canAccuse(state), true);
    assert.deepEqual(matchingSuspects(state).map(suspect => suspect.id), [state.culpritId]);
    const result = accuse(state, state.culpritId, 90);
    assert.equal(result.correct, true);
    assert.equal(result.state.phase, 'result');
    assert.equal(result.state.result!.relicId, completedHeist.relic.id);
  }
});

test('same seed gives the same case, one unique full match and randomized suspect positions', () => {
  const positions = new Set<number>();
  const profiles = new Set<string>();
  for (let seed = 0; seed < 250; seed++) {
    const a = createCase(seed, seed % 6), b = createCase(seed, seed % 6);
    assert.deepEqual(a, b);
    const matches = a.suspects.filter(s => s.fabric === a.profile.fabric && s.tread === a.profile.tread && s.charm === a.profile.charm);
    assert.deepEqual(matches.map(s => s.id), [a.culpritId]);
    assert.equal(new Set(a.suspects.map(s => s.name)).size, 3);
    assert.equal(new Set(a.suspects.map(s => s.id)).size, 3);
    for (const decoy of a.suspects.filter(s => s.id !== a.culpritId)) {
      assert.equal(['fabric', 'tread', 'charm'].filter(trait => decoy[trait as keyof typeof decoy] === a.profile[trait as keyof typeof a.profile]).length, 2);
    }
    positions.add(a.suspects.findIndex(s => s.id === a.culpritId));
    profiles.add(JSON.stringify(a.profile));
  }
  assert.equal(positions.size, 3);
  assert.equal(profiles.size, 27);
  assert.deepEqual(createCase('a rainy afternoon'), createCase('a rainy afternoon'));
  assert.notDeepEqual(createCase('a rainy afternoon'), createCase('the next afternoon'));
  assert.equal(createCase(1, -1).relic.id, RELICS[5].id);
  assert.equal(createCase(1, Number.NaN).relic.id, RELICS[0].id);
  assert.deepEqual(createCase(Number.NaN), createCase(0));
});

test('phases cannot be skipped, malformed spots do nothing and actions do not mutate inputs', () => {
  const start = deeplyFreeze(createCase(8));
  assert.equal(takeRelic(start, 1).state, start);
  assert.equal(hideRelic(start, 'bench', 1).state, start);
  assert.equal(beginInvestigation(start).state, start);
  assert.equal(inspectSpot(start, 'pedestal').state, start);
  assert.equal(accuse(start, start.culpritId, 1).state, start);
  assert.equal(requestHint(start).state, start);
  assert.equal(enterGallery(start, 'invalid' as EntryId, 1).state, start);
  const entered = deeplyFreeze(enterGallery(start, 'door', 1).state);
  assert.equal(start.entry, null);
  assert.equal(start.traces.length, 0);
  assert.equal(enterGallery(entered, 'terrace', 1).state, entered);
  assert.equal(beginInvestigation(entered).state, entered);
  const lifted = deeplyFreeze(takeRelic(entered, 1).state);
  assert.equal(takeRelic(lifted, 1).state, lifted);
  assert.equal(hideRelic(lifted, 'invalid' as StashId, 1).state, lifted);
  const hidden = deeplyFreeze(hideRelic(lifted, 'clock', 1).state);
  assert.equal(hideRelic(hidden, 'bench', 1).state, hidden);
  const detective = deeplyFreeze(beginInvestigation(hidden).state);
  assert.equal(beginInvestigation(detective).state, detective);
  assert.equal(inspectSpot(detective, 'invalid' as SpotId).state, detective);
  assert.equal(canAccuse(detective), false);
});

test('memory is not proof: each of three deposited clues is required before accusation', () => {
  let state = beginInvestigation(heist()).state;
  for (const spot of ['window', 'pedestal'] as const) {
    state = inspectSpot(state, spot).state;
    assert.equal(canAccuse(state), false);
    assert.equal(accuse(state, state.culpritId, 40).state, state);
  }
  state = inspectSpot(state, 'planter').state;
  assert.equal(canAccuse(state), true);
});

test('wrong searches find no invented evidence and repeated searches do not reward', () => {
  const detective = beginInvestigation(heist()).state;
  const empty = inspectSpot(detective, 'door');
  assert.equal(empty.ok, true);
  assert.equal(empty.clue, undefined);
  assert.equal(empty.state.found.length, 0);
  assert.equal(inspectSpot(empty.state, 'door').state, empty.state);
  const found = inspectSpot(empty.state, 'window');
  assert.equal(found.state.found.length, 1);
  assert.equal(inspectSpot(found.state, 'window').state, found.state);
  assert.equal(found.state.traces.length, 3);
});

test('wrong accusations allow retries, clear only that guest and cannot repeat penalties', () => {
  let state = investigate();
  assert.equal(accuse(state, 'not-a-guest', 60).state, state);
  const wrong = state.suspects.filter(suspect => suspect.id !== state.culpritId);
  for (const guest of wrong) {
    const action = accuse(state, guest.id, 60);
    assert.equal(action.correct, false);
    assert.equal(action.state.phase, 'investigate');
    assert.equal(action.state.result, null);
    state = action.state;
    assert.equal(accuse(state, guest.id, 60).state, state);
  }
  assert.equal(state.wrongAccusations.length, 2);
  const finish = accuse(state, state.culpritId, 60);
  assert.equal(finish.correct, true);
  assert.equal(finish.state.result!.firstTry, 0);
  assert.equal(finish.state.result!.penalties, 400);
  assert.equal(accuse(finish.state, state.culpritId, 0).state, finish.state);
  assert.equal(inspectSpot(finish.state, 'clock').state, finish.state);
  assert.equal(requestHint(finish.state).state, finish.state);
});

test('useful hints each cost once, remain marked until found, and stop after all clues', () => {
  let state = beginInvestigation(heist()).state;
  for (let i = 1; i <= 3; i++) {
    const hint = requestHint(state);
    assert.equal(hint.ok, true);
    assert.equal(hint.state.hinted.length, i);
    assert.equal(hint.state.hintSpot, hint.hint);
    const duplicate = requestHint(hint.state);
    assert.equal(duplicate.state, hint.state);
    assert.equal(duplicate.hint, hint.hint);
    state = inspectSpot(hint.state, hint.hint!).state;
    assert.equal(state.hintSpot, null);
  }
  assert.equal(requestHint(state).state, state);
  const result = accuse(state, state.culpritId, 45).state.result!;
  assert.equal(result.hintCount, 3);
  assert.equal(result.penalties, 450);
});

test('timing meter is symmetric, bounded, and no invalid timing earns points', () => {
  assert.equal(gradeTiming(.5), 1);
  assert.equal(gradeTiming(0), 0);
  assert.equal(gradeTiming(1), 0);
  assert.equal(gradeTiming(.25), .5);
  assert.equal(gradeTiming(.75), .5);
  for (const value of [-3, 4, NaN, Infinity, -Infinity]) assert.equal(gradeTiming(value), 0);
  let state = enterGallery(createCase(9), 'window', NaN).state;
  state = takeRelic(state, Infinity).state;
  state = hideRelic(state, 'bench', -2).state;
  assert.deepEqual(state.timing, [0, 0, 0]);
  assert.equal(enterGallery(createCase(9), 'window', 100).state.timing[0], 1);
});

test('score has explicit caps, grace period, monotonic timing/speed and star thresholds', () => {
  const input = { timing: [1, 1, 1], elapsedSeconds: 45, evidenceCount: 3, wrongCount: 0, hintCount: 0 };
  const perfect = calculateScore(input);
  assert.equal(perfect.score, SCORE_MAX);
  assert.equal(perfect.stars, 3);
  assert.equal(perfect.evidence, 1500);
  assert.equal(perfect.timing, 600);
  assert.equal(perfect.speed, 600);
  assert.equal(perfect.firstTry, 300);
  assert.equal(calculateScore({ ...input, elapsedSeconds: 0 }).score, perfect.score);
  assert.equal(calculateScore({ ...input, elapsedSeconds: 180 }).speed, 0);
  assert.equal(calculateScore({ ...input, elapsedSeconds: 999 }).speed, 0);
  assert.ok(calculateScore({ ...input, elapsedSeconds: 120 }).score < perfect.score);
  assert.ok(calculateScore({ ...input, timing: [.5, .5, .5] }).score < perfect.score);
  assert.equal(calculateScore({ ...input, timing: [], elapsedSeconds: 45 }).score, STAR_THRESHOLDS.three);
  assert.equal(calculateScore({ ...input, timing: [], elapsedSeconds: 180 }).score, STAR_THRESHOLDS.two);
  assert.equal(calculateScore({ ...input, timing: [], elapsedSeconds: 180, hintCount: 1 }).stars, 1);
  assert.equal(calculateScore({ ...input, timing: [], elapsedSeconds: 180 }).stars, 2);
  assert.equal(calculateScore({ ...input, timing: [], elapsedSeconds: 45 }).stars, 3);
});

test('nonfinite, negative and oversized scoring inputs always produce bounded finite integers', () => {
  for (const value of [NaN, Infinity, -Infinity, -1, 0, .5, 2, 1e300]) {
    const score = calculateScore({ timing: [value, value, value, value], elapsedSeconds: value, evidenceCount: value, wrongCount: value, hintCount: value });
    assert.ok(Number.isInteger(score.score));
    assert.ok(score.score >= 0 && score.score <= SCORE_MAX);
    assert.ok(score.timing >= 0 && score.timing <= 600);
    assert.ok(score.speed >= 0 && score.speed <= 600);
    assert.ok(score.evidence >= 0 && score.evidence <= 1500);
    assert.ok([1, 2, 3].includes(score.stars));
  }
  for (const elapsedSeconds of [NaN, Infinity, -Infinity, -1]) {
    const result = accuse(investigate(), investigate().culpritId, elapsedSeconds).state.result!;
    assert.equal(result.speed, 0);
    assert.equal(result.elapsedSeconds, 9999);
  }
});

test('validated JSON round trips preserve every reachable phase and clue provenance', () => {
  const check = (state: CaseState) => assert.deepEqual(validateCase(JSON.parse(JSON.stringify(state))), state);
  let state = createCase('rainy-gallery', 5); check(state);
  state = enterGallery(state, 'terrace', .1).state; check(state);
  state = takeRelic(state, .2).state; check(state);
  state = hideRelic(state, 'clock', .3).state; check(state);
  state = beginInvestigation(state).state; check(state);
  state = inspectSpot(state, 'window').state; check(state);
  state = requestHint(state).state; check(state);
  state = inspectSpot(state, 'terrace').state; check(state);
  state = inspectSpot(state, 'clock').state; check(state);
  state = inspectSpot(state, 'pedestal').state; check(state);
  state = accuse(state, state.suspects.find(s => s.id !== state.culpritId)!.id, 80).state; check(state);
  state = accuse(state, state.culpritId, 80).state; check(state);
});

test('save validator rejects old saves, changed identities, fabricated clues, bad phases and inflated results', () => {
  for (const value of [null, undefined, 42, '', {}, { version: 1 }, { version: 2, seed: NaN }]) assert.equal(validateCase(value), null);
  const state = investigate();
  const mutations: ((s: any) => void)[] = [
    s => { s.seed = -1; }, s => { s.id = 'other'; }, s => { s.profile.fabric = 'invented'; },
    s => { s.suspects[0].name = 'Someone else'; }, s => { s.relic.name = 'Something else'; },
    s => { s.entry = 'door'; }, s => { s.timing.push(1); }, s => { s.timing[0] = NaN; },
    s => { s.phase = 'take'; }, s => { s.traces[0].spot = 'door'; }, s => { s.found[0].value = 'invented'; },
    s => { s.searched.push(s.searched[0]); }, s => { s.hinted = ['door']; },
    s => { s.hintSpot = 'window'; }, s => { s.wrongAccusations = [s.culpritId]; }, s => { s.result = {}; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(state); mutate(changed);
    assert.equal(validateCase(changed), null);
  }
  const result = accuse(state, state.culpritId, 80).state;
  result.result!.score += 1;
  assert.equal(validateCase(result), null);
});
