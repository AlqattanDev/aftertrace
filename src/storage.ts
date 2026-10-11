import { RELICS, SCORE_MAX, validateCase, type CaseState } from './rules.ts';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type Profile = {
  version: 2;
  best: null | { score: number; stars: number; elapsedSeconds: number; relicId: string };
  cases: number; streak: number; bestStreak: number;
  collection: number[]; completedIds: string[]; submittedIds: string[];
  settings: { muted: boolean; relaxed: boolean };
};
export const PROFILE_KEY = 'aftertrace.profile.v2';
export const RUN_KEY = 'aftertrace.case.v2';
const MAX_CASES = 1_000_000_000;
const MAX_SECONDS = 9999;
const MAX_IDS = 64;
const MAX_SAVE_LENGTH = 64_000;

function freshProfile(): Profile {
  return { version: 2, best: null, cases: 0, streak: 0, bestStreak: 0,
    collection: RELICS.map(() => 0), completedIds: [], submittedIds: [],
    settings: { muted: false, relaxed: false } };
}
function storageOrDefault(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function numberIn(value: unknown, min: number, max: number, integer = true): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
}
function retainedIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 1024 || !value.every(id => typeof id === 'string' && id.startsWith('aftertrace-') && id.length <= 128)) return null;
  // Retain the latest occurrence and put the newest IDs last.
  return [...new Set<string>([...value].reverse())].reverse().slice(-MAX_IDS);
}
function validProfile(value: unknown): Profile | null {
  if (!isRecord(value) || value.version !== 2) return null;
  if (!numberIn(value.cases, 0, MAX_CASES) || !numberIn(value.streak, 0, value.cases) || !numberIn(value.bestStreak, value.streak, value.cases)) return null;
  if (!Array.isArray(value.collection) || value.collection.length !== RELICS.length || !value.collection.every(stars => numberIn(stars, 0, 3))) return null;
  if (!isRecord(value.settings) || typeof value.settings.muted !== 'boolean' || typeof value.settings.relaxed !== 'boolean') return null;
  const completedIds = retainedIds(value.completedIds), submittedIds = retainedIds(value.submittedIds);
  if (!completedIds || !submittedIds || completedIds.length > value.cases) return null;
  let best: Profile['best'] = null;
  if (value.best !== null) {
    const candidate = value.best;
    if (!isRecord(candidate) || !numberIn(candidate.score, 0, SCORE_MAX) || !numberIn(candidate.stars, 1, 3) || !numberIn(candidate.elapsedSeconds, 0, MAX_SECONDS, false) || !RELICS.some(relic => relic.id === candidate.relicId)) return null;
    best = { score: candidate.score, stars: candidate.stars, elapsedSeconds: candidate.elapsedSeconds, relicId: candidate.relicId as string };
  }
  if ((value.cases === 0) !== (best === null) || (value.cases === 0 && value.collection.some(stars => stars > 0))) return null;
  return { version: 2, best, cases: value.cases, streak: value.streak, bestStreak: value.bestStreak,
    collection: [...value.collection], completedIds, submittedIds,
    settings: { muted: value.settings.muted, relaxed: value.settings.relaxed } };
}
function readValue(key: string, storage?: StorageLike): unknown {
  try {
    const raw = storageOrDefault(storage)?.getItem(key);
    return raw && raw.length <= MAX_SAVE_LENGTH ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function loadProfile(storage?: StorageLike): Profile {
  try { return validProfile(readValue(PROFILE_KEY, storage)) ?? freshProfile(); } catch { return freshProfile(); }
}
export function saveProfile(profile: Profile, storage?: StorageLike): boolean {
  try {
    const target = storageOrDefault(storage), normalized = validProfile(profile);
    if (!target || !normalized) return false;
    target.setItem(PROFILE_KEY, JSON.stringify(normalized));
    return true;
  } catch { return false; }
}
export function loadRun(storage?: StorageLike): { state: CaseState; elapsedSeconds: number } | null {
  try {
    const value = readValue(RUN_KEY, storage);
    if (!isRecord(value) || value.version !== 2 || !numberIn(value.elapsedSeconds, 0, MAX_SECONDS, false)) return null;
    const state = validateCase(value.state);
    if (!state || (state.result && value.elapsedSeconds !== state.result.elapsedSeconds)) return null;
    return { state, elapsedSeconds: value.elapsedSeconds };
  } catch { return null; }
}
export function saveRun(state: CaseState, elapsedSeconds: number, storage?: StorageLike): boolean {
  try {
    const target = storageOrDefault(storage);
    if (!target || !numberIn(elapsedSeconds, 0, Number.MAX_VALUE, false)) return false;
    const normalized = validateCase(state);
    if (!normalized) return false;
    const seconds = normalized.result?.elapsedSeconds ?? Math.min(MAX_SECONDS, elapsedSeconds);
    target.setItem(RUN_KEY, JSON.stringify({ version: 2, state: normalized, elapsedSeconds: seconds }));
    return true;
  } catch { return false; }
}
export function clearRun(storage?: StorageLike): void {
  try { storageOrDefault(storage)?.removeItem(RUN_KEY); } catch { /* The game remains playable without persistence. */ }
}

/** Award a finished case once, even when its result screen is restored after reloading. */
export function awardResult(profile: Profile, state: CaseState): Profile {
  let normalized: CaseState | null;
  try { normalized = validateCase(state); } catch { return profile; }
  if (!normalized?.result || normalized.phase !== 'result' || profile.completedIds.includes(normalized.id)) return profile;
  const base = validProfile(profile);
  if (!base) return profile;
  const result = normalized.result;
  const relicIndex = RELICS.findIndex(relic => relic.id === normalized.relic.id);
  const collection = [...base.collection];
  collection[relicIndex] = Math.max(collection[relicIndex], result.stars);
  const streak = result.wrongCount === 0 ? Math.min(MAX_CASES, base.streak + 1) : 0;
  const improvesBest = !base.best || result.score > base.best.score || (result.score === base.best.score && result.elapsedSeconds < base.best.elapsedSeconds);
  return { ...base, cases: Math.min(MAX_CASES, base.cases + 1), streak, bestStreak: Math.max(base.bestStreak, streak), collection,
    best: improvesBest ? { score: result.score, stars: result.stars, elapsedSeconds: result.elapsedSeconds, relicId: result.relicId } : base.best,
    completedIds: [...base.completedIds, normalized.id].slice(-MAX_IDS) };
}
export function nextRelic(profile: Profile): number {
  const missing = profile.collection.findIndex(stars => stars === 0);
  return missing >= 0 ? missing : profile.cases % RELICS.length;
}
