import './style.css';
import { createCase, enterGallery, takeRelic, hideRelic, beginInvestigation, inspectSpot, requestHint, accuse, canAccuse, gradeTiming, ENTRIES, STASHES, SPOTS, RELICS, HINT_COST, STAR_THRESHOLDS, type CaseState, type SpotId, type EntryId, type StashId, type Clue, type Suspect } from './rules';
import { AudioDirector } from './audio';
import { loadProfile, saveProfile, loadRun, saveRun, awardResult, nextRelic } from './storage';
import { icon, relicIcon, type IconName } from './icons';
import type { Gallery } from './scene';

declare global {
  interface Window {
    arcade?: { submit: (run: { score: number; meta: Record<string, string | number> }) => void | Promise<unknown> };
  }
}
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const number = (value: number) => Math.round(value).toLocaleString('en');
const capital = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const spotName = (id: string | null) => SPOTS.find(spot => spot.id === id)?.label ?? 'Display';
const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const seed = () => {
  try { return crypto.getRandomValues(new Uint32Array(1))[0]; }
  catch { return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0; }
};
let profile = loadProfile();
const restored = loadRun();
let state: CaseState = restored?.state ?? createCase(seed(), nextRelic(profile));
let elapsedSeconds = restored?.elapsedSeconds ?? 0;
// Repair a result/profile write interrupted by a closed tab or unavailable storage.
if (restored?.state.result) { profile = awardResult(profile, restored.state); saveProfile(profile); }
let intro = true, started = false, paused = false, busy = false, starting = false;
let selectedEntry: EntryId | null = null;
let selectedStash: StashId | null = null;
let selectedSuspect: string | null = null;
let lastClue: Clue | null = null;
let notice = '';
let noticeType: 'clue' | 'empty' | 'wrong' | '' = '';
let timingSeconds = 0, timingCursor = 0;
let keyboard = false, isNewBest = false, storageOK = true;
let gallery: Gallery | null = null;
let loading: Promise<void> | null = null;
let loadFailed = false, contextLost = false;
let previousFrame = performance.now(), clockSecond = -1, saveSeconds = 0, resultSubmitSecond = -1;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const audio = new AudioDirector(profile.settings.muted);
const submitted = new Set(profile.submittedIds);
const submitting = new Set<string>();

$('#app').innerHTML = `
<main id="game" data-screen="intro">
  <header class="topbar">
    <div class="wordmark" aria-label="AFTERTRACE">${icon('search')}<span>AFTERTRACE</span></div>
    <span id="case-number" class="case-number"></span>
    <div class="top-tools">
      <button id="sound" class="icon-button" aria-label="Mute sound"></button>
      <button id="pause" class="icon-button" aria-label="Pause case" hidden>${icon('pause')}</button>
    </div>
  </header>
  <section class="case-head" aria-labelledby="objective">
    <h1 id="objective">Make a little mischief.</h1>
    <p id="help">Steal a treasure. Then solve your own mystery.</p>
  </section>
  <div class="play-layout">
    <section id="stage" class="stage" aria-label="The little gallery">
      <canvas id="world" role="img" aria-label="A miniature gallery with a treasure display, three entrances, and three hiding places."></canvas>
      <div id="hotspots" aria-label="Gallery places"></div>
      <div id="scene-loading" class="scene-loading" aria-hidden="true"><span class="loading-orbit"></span></div>
      <div id="scene-error" class="scene-error" hidden><h2>The gallery could not open.</h2><p>Your case is safe. Try loading it again.</p><button id="reload" class="primary">Try again ${icon('arrow')}</button></div>
      <div id="burst-label" class="burst-label" aria-hidden="true"></div>
      <div id="stage-caption" class="stage-caption">${icon('jewel')}<span>The Little Gallery</span></div>
    </section>
    <aside class="case-console" aria-label="Case controls">
      <ol id="phase-track" class="phase-track" aria-label="Case progress" hidden>
        <li id="heist-phase"><span>1</span>Leave a trail</li><li id="detective-phase"><span>2</span>Solve the mystery</li>
      </ol>
      <div id="console-content"></div>
      <div id="status-message" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
    </aside>
  </div>
  <footer class="game-footer"><span id="save-status"></span><span id="run-time"></span></footer>
</main>
<dialog id="pause-dialog" aria-labelledby="pause-title"><div class="pause-sheet">
  <div class="sheet-heading"><h2 id="pause-title">Take your time.</h2><button id="close-pause" class="icon-button" aria-label="Resume case">${icon('close')}</button></div>
  <p>The clock is paused. Your clues are safe.</p>
  <button id="relaxed" class="setting" role="switch" aria-checked="false"><span>Relaxed timing<small>A slower needle, the same points.</small></span><i class="toggle" aria-hidden="true"></i></button>
  <button id="dialog-sound" class="setting" role="switch" aria-checked="true"><span>Sound effects<small>Little notes for little victories.</small></span><i class="toggle" aria-hidden="true"></i></button>
  <button id="resume" class="primary">Back to the mystery ${icon('play')}</button>
  <button id="restart" class="text-button">Restart this case</button>
</div></dialog>`;

function announce(message: string) { $('#status-message').textContent = message; }
function persist() {
  const runOK = saveRun(state, elapsedSeconds), profileOK = saveProfile(profile);
  storageOK = runOK && profileOK;
  $('#save-status').textContent = storageOK ? (started ? 'Case saved' : 'Made for a little spare time') : 'Playing without saves';
}
function renderSound() {
  $('#sound').innerHTML = icon(profile.settings.muted ? 'muted' : 'sound');
  $('#sound').setAttribute('aria-label', profile.settings.muted ? 'Turn sound on' : 'Mute sound');
  $('#sound').setAttribute('aria-pressed', String(!profile.settings.muted));
  $('#dialog-sound').setAttribute('aria-checked', String(!profile.settings.muted));
}
function setMute() {
  profile.settings.muted = !profile.settings.muted;
  audio.setMuted(profile.settings.muted); audio.unlock();
  if (!profile.settings.muted) audio.play('tap');
  saveProfile(profile); renderSound();
}
function primary() { return document.querySelector<HTMLButtonElement>('#primary-action'); }
function setPaused(value: boolean) {
  if (intro || state.phase === 'result' || paused === value) return;
  paused = value; previousFrame = performance.now();
  const dialog = $<HTMLDialogElement>('#pause-dialog');
  if (value) {
    audio.suspend(); persist();
    $('#relaxed').setAttribute('aria-checked', String(profile.settings.relaxed));
    dialog.showModal(); $('#resume').focus();
  } else {
    dialog.close(); audio.resume();
    if (keyboard) primary()?.focus({ preventScroll: true });
  }
}
$('#sound').onclick = setMute;
$('#dialog-sound').onclick = setMute;
$('#pause').onclick = () => setPaused(true);
$('#resume').onclick = $('#close-pause').onclick = () => setPaused(false);
$('#pause-dialog').addEventListener('cancel', event => { event.preventDefault(); setPaused(false); });
$('#relaxed').onclick = () => {
  profile.settings.relaxed = !profile.settings.relaxed;
  $('#relaxed').setAttribute('aria-checked', String(profile.settings.relaxed)); saveProfile(profile);
};
$('#restart').onclick = () => {
  const oldSeed = state.seed, relic = RELICS.findIndex(item => item.id === state.relic.id);
  setPaused(false); state = createCase(oldSeed, relic); elapsedSeconds = 0;
  resetPresentation(); persist(); render();
};
$('#reload').onclick = () => {
  if (contextLost) { persist(); location.reload(); return; }
  loading = null; loadFailed = false; $('#scene-error').hidden = true; $('#scene-loading').hidden = false;
  void ensureGallery();
};
function resetPresentation() {
  selectedEntry = selectedStash = selectedSuspect = null;
  lastClue = null; notice = ''; noticeType = ''; timingSeconds = 0; timingCursor = 0; busy = false; isNewBest = false;
}
async function ensureGallery() {
  if (gallery || loading) return loading;
  loading = (async () => {
    try {
      const { Gallery } = await import('./scene');
      gallery = new Gallery($<HTMLCanvasElement>('#world'), {
        onContextLost: () => {
          contextLost = true;
          paused = true;
          $<HTMLDialogElement>('#pause-dialog').close();
          audio.suspend();
          if (started) persist();
          $('#scene-error').hidden = false;
          $('#scene-error h2').textContent = 'The gallery needs a moment.';
          $('#scene-error p').textContent = 'Reload to pick up where you left off.';
        },
      });
      gallery.setReducedMotion(reduced.matches); syncScene(); gallery.resize();
      $('#scene-loading').hidden = true; positionHotspots();
    } catch {
      loadFailed = true; $('#scene-loading').hidden = true; $('#scene-error').hidden = false;
      announce('The gallery could not load. Try again.');
    } finally { loading = null; render(); }
  })();
  return loading;
}
function syncScene() {
  gallery?.setState({
    phase: intro ? 'intro' : state.phase, entry: state.entry, stash: state.stash,
    profile: state.profile,
    found: state.found.map(clue => clue.id),
    relic: Math.max(0, RELICS.findIndex(relic => relic.id === state.relic.id)),
    activeSpot: selectedEntry ?? selectedStash ?? (state.phase === 'take' ? 'pedestal' : state.hintSpot),
  });
}
function flash(message: string, at: SpotId, kind: 'gold' | 'clue' = 'gold') {
  gallery?.burst(at, kind);
  const label = $('#burst-label'); label.textContent = message;
  label.classList.remove('show'); void label.offsetWidth; label.classList.add('show');
  window.setTimeout(() => label.classList.remove('show'), 1600);
}
function focusPrimary() { if (keyboard) requestAnimationFrame(() => primary()?.focus({ preventScroll: true })); }
function transition() {
  busy = true;
  const id = state.id;
  window.setTimeout(() => { if (id === state.id) { busy = false; render(); focusPrimary(); } }, 640);
}
function timingActive() {
  return !intro && !paused && !busy && (state.phase === 'take' || (state.phase === 'entry' && !!selectedEntry) || (state.phase === 'stash' && !!selectedStash));
}
function timingAction() {
  if (!timingActive()) return;
  audio.unlock();
  // A generous gold band feels reliable under real touch latency.
  const quality = Math.abs(timingCursor - .5) <= .12 ? 1 : gradeTiming(timingCursor) * .95;
  const at: SpotId = state.phase === 'entry' ? selectedEntry! : state.phase === 'take' ? 'pedestal' : selectedStash!;
  const action = state.phase === 'entry' ? enterGallery(state, selectedEntry!, quality)
    : state.phase === 'take' ? takeRelic(state, quality) : hideRelic(state, selectedStash!, quality);
  if (!action.ok) return;
  state = action.state; selectedEntry = selectedStash = null; timingSeconds = timingCursor = 0;
  const rating = quality === 1 ? 'Perfect!' : quality >= .55 ? 'Nicely done!' : 'A little noisy!';
  audio.play(quality === 1 ? 'perfect' : quality >= .55 ? 'good' : 'miss');
  flash(`${rating} +${Math.round(quality * 200)}`, at);
  announce(`${rating} ${action.message}`);
  transition(); persist(); render();
}
function chooseSpot(spot: SpotId) {
  if (intro || paused || busy) return;
  audio.unlock();
  if (state.phase === 'entry' && ENTRIES.some(entry => entry.id === spot)) {
    selectedEntry = spot as EntryId; timingSeconds = 0;
    audio.play('tap'); gallery?.focus(spot); render(); focusPrimary();
  } else if (state.phase === 'stash' && STASHES.some(stash => stash.id === spot)) {
    selectedStash = spot as StashId; timingSeconds = 0;
    audio.play('tap'); gallery?.focus(spot); render(); focusPrimary();
  } else if (state.phase === 'investigate' && !canAccuse(state)) {
    const result = inspectSpot(state, spot);
    if (!result.ok) { announce(result.message); return; }
    state = result.state; gallery?.focus(spot);
    notice = result.message; lastClue = result.clue ?? null; noticeType = result.clue ? 'clue' : 'empty';
    if (result.clue) {
      audio.play('clue'); flash(result.clue.id === 'charm' ? 'Treasure recovered! +500' : 'Clue found! +500', spot, 'clue');
    } else audio.play('empty');
    announce(result.message + (canAccuse(state) ? ' All three clues found. Choose the guest who matches.' : ''));
    persist(); render();
    if (canAccuse(state) && keyboard) requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-suspect]')?.focus({ preventScroll: true }));
  }
}
async function begin() {
  if (starting) return;
  starting = true; audio.unlock(); render();
  if (loadFailed) { loadFailed = false; $('#scene-error').hidden = true; }
  await ensureGallery(); starting = false;
  if (!gallery) { render(); return; }
  intro = false; started = true; audio.play('tap'); previousFrame = performance.now();
  persist(); render(); focusPrimary();
}
function newCase() {
  state = createCase(seed(), nextRelic(profile)); elapsedSeconds = 0; intro = false; started = true;
  resetPresentation(); audio.unlock(); audio.play('tap'); persist(); render(); focusPrimary();
}
function finishCase() {
  if (!selectedSuspect || busy) return;
  const result = accuse(state, selectedSuspect, elapsedSeconds);
  if (!result.ok) { announce(result.message); return; }
  state = result.state;
  if (result.correct) {
    const completed = state.result!;
    isNewBest = !profile.best || completed.score > profile.best.score ||
      (completed.score === profile.best.score && completed.elapsedSeconds < profile.best.elapsedSeconds);
    // Store the result first so startup can finish awarding an interrupted save.
    saveRun(state, elapsedSeconds);
    profile = awardResult(profile, state);
    saveProfile(profile);
    audio.play('win'); flash('Case closed!', state.stash!, 'clue'); submitArcade();
  } else { notice = result.message; noticeType = 'wrong'; selectedSuspect = null; audio.play('miss'); }
  announce(result.message); persist(); render(); focusPrimary();
}
function submitArcade() {
  if (!state.result || submitted.has(state.id) || submitting.has(state.id) || !window.arcade?.submit) return;
  const id = state.id, result = state.result, relic = state.relic.id, streak = profile.streak;
  submitting.add(id);
  const accepted = () => {
    submitting.delete(id); submitted.add(id);
    profile.submittedIds = [...submitted].slice(-64); saveProfile(profile);
  };
  try {
    const sent = window.arcade?.submit({
      score: result.score,
      meta: { stars: result.stars, relic, seconds: Math.round(result.elapsedSeconds), streak, case: id, version: 2 },
    });
    if (sent && typeof sent.then === 'function') void sent.then(accepted, () => submitting.delete(id));
    else accepted();
  } catch { submitting.delete(id); /* Keep the saved result available for a retry. */ }
}
function stars(count: number, extra = '') {
  return `<span class="stars ${extra}" role="img" aria-label="${count} out of 3 stars">${[1, 2, 3].map(n => icon('star', n <= count ? 'earned' : '')).join('')}</span>`;
}
function collection() {
  return `<div class="collection" aria-label="Your treasure collection">${RELICS.map((relic, i) => `<div class="collectible ${profile.collection[i] ? 'collected' : ''}" aria-label="${esc(relic.name)}: ${profile.collection[i] || 0} stars" title="${esc(relic.name)}">${relicIcon(relic.id)}${profile.collection[i] ? '<span class="collection-dot"></span>' : ''}</div>`).join('')}</div>`;
}
function heistSteps() {
  return `<div class="heist-steps" aria-label="${state.timing.length} of 3 heist actions complete">${['Get inside', 'Take it', 'Hide it'].map((text, i) => `<span class="${i < state.timing.length ? 'done' : i === state.timing.length ? 'current' : ''}">${i < state.timing.length ? icon('check') : `<b>${i + 1}</b>`}${text}</span>`).join('')}</div>`;
}
function button(label: string, action: string, disabled = false, end: IconName = 'arrow') {
  return `<button id="primary-action" class="primary" data-action="${action}" ${disabled ? 'disabled' : ''}><span>${label}</span>${icon(end)}</button>`;
}
function options(places: ReadonlyArray<{ id: SpotId; label: string }>) {
  return `<div class="place-options">${places.map(place => `<button class="place-option" data-spot="${place.id}" ${busy ? 'disabled' : ''}>${icon(place.id as IconName)}<span>${place.label}</span></button>`).join('')}</div>`;
}
function timing(title: string, label: string, change = false) {
  return `${heistSteps()}<h2 class="console-title">${title}</h2><div class="timing-meter" role="img" aria-label="Timing needle. Tap in the gold middle for a perfect action."><div class="timing-rail"><div class="gold-zone"></div><div id="needle" class="needle"></div></div><div class="meter-legend"><span>Easy does it</span><span class="gold-label">${icon('spark')}Aim for gold</span></div></div>${button(label, 'timing', busy, 'spark')}${change ? '<button class="text-button change-place" data-action="change">Choose a different spot</button>' : ''}`;
}
function traitLabel(kind: 'fabric' | 'tread' | 'charm', value: string) {
  if (kind === 'fabric') return capital(value) + ' scarf';
  if (kind === 'tread') return ({ dots: 'Dotted soles', zigzag: 'Zigzag soles', bars: 'Bar soles' } as Record<string, string>)[value] ?? value;
  return capital(value) + ' charm';
}
function traitIcon(kind: 'fabric' | 'tread' | 'charm', value: string) { return icon(kind === 'fabric' ? 'fabric' : value as IconName); }
function evidence() {
  return `<div class="evidence" aria-label="Evidence found">${(['fabric', 'tread', 'charm'] as const).map(kind => {
    const clue = state.found.find(item => item.id === kind);
    return `<div class="clue-slot ${clue ? 'found' : ''} ${clue?.id === lastClue?.id ? 'just-found' : ''}" data-clue="${kind}"><span class="clue-symbol ${clue?.value ?? ''}">${clue ? traitIcon(kind, clue.value) : icon(kind)}</span><span>${clue ? traitLabel(kind, clue.value) : ({ fabric: 'Scarf', tread: 'Soles', charm: 'Charm' }[kind])}</span>${clue ? icon('check', 'clue-check') : '<span class="clue-unknown">?</span>'}</div>`;
  }).join('')}</div>`;
}
function portrait(suspect: Suspect, index: number) {
  const scarf = { coral: '#d86865', mint: '#407867', violet: '#7254a0' }[suspect.fabric];
  const skin = ['#d9a275', '#f1c5a6', '#b67b55'][index % 3], hair = ['#47334c', '#6b4833', '#bf8b54'][index % 3];
  return `<svg class="portrait" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#e9dff4"/><path d="M10 64v-8c0-11 9-18 22-18s22 7 22 18v8" fill="#554363"/><ellipse cx="32" cy="27" rx="13" ry="16" fill="${skin}"/><path d="M18 27V17c0-14 28-16 28 0v8c-6-1-9-7-11-12-3 7-7 9-17 10" fill="${hair}"/><path d="M20 39q12 8 24 0l-2 8-22-1zM33 46l8 1-2 14-8-3" fill="${scarf}"/><circle cx="27" cy="28" r="1.3" fill="#342743"/><circle cx="37" cy="28" r="1.3" fill="#342743"/><path d="M28 35q4 3 8 0" fill="none" stroke="#8d534d" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}
function suspects() {
  return `<div class="suspects" role="group" aria-label="Compare three guests">${state.suspects.map((suspect, i) => {
    const cleared = state.wrongAccusations.includes(suspect.id);
    return `<button class="suspect ${selectedSuspect === suspect.id ? 'selected' : ''}" data-suspect="${suspect.id}" aria-pressed="${selectedSuspect === suspect.id}" ${cleared ? 'disabled' : ''}>${portrait(suspect, i)}<span class="suspect-details"><strong>${esc(suspect.name)}${cleared ? '<small>Cleared</small>' : ''}</strong><span class="suspect-traits">${(['fabric', 'tread', 'charm'] as const).map(kind => `<span>${traitIcon(kind, suspect[kind])}${traitLabel(kind, suspect[kind])}</span>`).join('')}</span></span><i class="radio" aria-hidden="true"></i></button>`;
  }).join('')}</div>`;
}
function renderConsole() {
  if (intro) return `<div class="intro-invitation"><div class="relic-name">${relicIcon(state.relic.id)}<span>${esc(state.relic.name)} is waiting.</span></div>${button(starting ? 'Opening the gallery…' : restored || started ? 'Continue your case' : 'Play a case', 'begin', starting)}<div class="intro-facts"><span>${icon('clock')}About 2 minutes</span><span>${icon('spark')}One player, both sides</span></div><div class="collection-heading"><span>Your little collection</span><b>${profile.collection.filter(Boolean).length} / 6</b></div>${collection()}<div class="personal-best"><span>Best <b>${profile.best ? number(profile.best.score) : '—'}</b></span><span>Streak <b>${profile.streak}</b></span></div></div>`;
  if (state.phase === 'entry') return selectedEntry ? timing(`Through the ${spotName(selectedEntry).toLowerCase()}.`, 'Slip inside', true) : `${heistSteps()}<h2 class="console-title">Every entrance leaves a trace.</h2>${options(ENTRIES)}`;
  if (state.phase === 'take') return timing('One very tempting treasure.', 'Lift the treasure');
  if (state.phase === 'stash') return selectedStash ? timing(`Tuck it by the ${spotName(selectedStash).toLowerCase()}.`, 'Hide the treasure', true) : `${heistSteps()}<h2 class="console-title">Where shall we hide it?</h2>${options(STASHES)}<p class="quiet-note">You will be back to find it.</p>`;
  if (state.phase === 'handoff') {
    const heistPoints = Math.round(state.timing.reduce((a, b) => a + b, 0) * 200);
    return `<div class="handoff-seal">${icon('mask')}<span>You got away with it.</span></div><div class="heist-total"><span>Heist bonus</span><b>+${heistPoints}</b></div><div class="trace-strip">${icon('tread')}${icon('fabric')}${icon('charm')}<span>But you left three clues.</span></div>${button('Become the detective', 'investigate', busy, 'search')}`;
  }
  if (state.phase === 'investigate') {
    if (canAccuse(state)) {
      const selected = state.suspects.find(suspect => suspect.id === selectedSuspect);
      return `<div class="evidence-heading"><span>${icon('check')}All three clues</span><b>Treasure recovered</b></div>${evidence()}${noticeType === 'wrong' ? `<p class="wrong-notice" role="status">${notice}</p>` : ''}${suspects()}${button(selected ? `Name ${esc(selected.name.split(' ')[0])}` : 'Choose the guest who matches', 'accuse', !selected, 'search')}`;
    }
    return `<div class="evidence-heading"><span>${icon('search')}Follow your trail</span><b>${state.found.length} / 3 clues</b></div>${evidence()}<div class="discovery ${noticeType}">${lastClue ? `<span class="discovery-icon ${lastClue.value}">${traitIcon(lastClue.id, lastClue.value)}</span><div><strong>${lastClue.id === 'charm' ? 'Treasure recovered!' : esc(lastClue.label)}</strong><p>${esc(lastClue.detail)}</p></div>` : `${icon(noticeType === 'empty' ? 'search' : 'hint')}<p>${notice || 'Three clues waiting to be found.'}</p>`}</div><button class="hint-button" data-action="hint">${icon('hint')}<span>${state.hintSpot ? 'Show my marked clue' : 'Give me a nudge'}</span><small>${state.hintSpot ? 'Already counted' : '−' + HINT_COST + ' points'}</small></button>`;
  }
  const result = state.result!, culprit = state.suspects.find(suspect => suspect.id === result.culpritId)!;
  return `<div class="result-sheet">${stars(result.stars, 'result-stars')}<h2 class="result-title">${result.title}.</h2><div class="result-score"><strong>${number(result.score)}</strong><span>${isNewBest ? 'A new personal best' : 'points, beautifully earned'}</span></div><p class="culprit-reveal">It was <b>${esc(culprit.name)}</b>.</p><div class="solved-trail" aria-label="The trail you made and solved"><span>${icon(state.entry as IconName)}${spotName(state.entry)}</span>${icon('arrow')}<span>${icon('pedestal')}Display</span>${icon('arrow')}<span>${icon(state.stash as IconName)}${spotName(state.stash)}</span></div><dl class="score-breakdown"><div><dt>Three clues</dt><dd>+${result.evidence}</dd></div><div><dt>Heist timing</dt><dd>+${result.timing}</dd></div><div><dt>Case pace</dt><dd>+${result.speed}</dd></div><div><dt>First guess</dt><dd>+${result.firstTry}</dd></div>${result.penalties ? `<div><dt>Hints &amp; guesses</dt><dd>−${result.penalties}</dd></div>` : ''}</dl><div class="result-reward">${relicIcon(state.relic.id)}<span>${esc(state.relic.name)}<small>Added to your collection</small></span>${stars(profile.collection[RELICS.findIndex(relic => relic.id === state.relic.id)] || 0)}</div>${button('One more mystery', 'next')}<p class="replay-note">${result.stars < 3 ? `${number(STAR_THRESHOLDS.three)} points earns three stars. ` : ''}${profile.streak ? `${profile.streak} first-guess ${profile.streak === 1 ? 'solve' : 'solves'} in a row.` : 'A fresh trail. A new little mystery.'}</p></div>`;
}
function updateHeading() {
  let title = '', help = '';
  if (intro) { title = 'Make a little mischief.'; help = 'Steal a treasure. Then solve your own mystery.'; }
  else if (state.phase === 'entry') { title = selectedEntry ? 'A little timing. A little luck.' : 'First, sneak into the gallery.'; help = selectedEntry ? 'Tap when the needle reaches gold.' : 'Tap an entrance to choose your trail.'; }
  else if (state.phase === 'take') { title = `Take the ${state.relic.name}.`; help = 'Tap when the needle reaches gold.'; }
  else if (state.phase === 'stash') { title = selectedStash ? 'The perfect hiding spot.' : 'Make the treasure disappear.'; help = selectedStash ? 'Tap when the needle reaches gold.' : 'Tap a hiding place. Remember your little trail.'; }
  else if (state.phase === 'handoff') { title = 'Nice heist. Now, catch yourself.'; help = 'The same room. Your clues. A different pair of shoes.'; }
  else if (state.phase === 'investigate') {
    title = canAccuse(state) ? 'Who left all three clues?' : 'Now follow the trail you left.';
    help = canAccuse(state) ? 'Match the scarf, the soles, and the charm.' : state.found.length === 0 ? 'Inspect the empty display to start your case.' : state.hintSpot ? `Your next clue is marked at the ${spotName(state.hintSpot).toLowerCase()}.` : 'Search the places you touched as the thief.';
  } else { title = 'You made it. You solved it.'; help = `${state.relic.name} is back where it belongs.`; }
  $('#objective').textContent = title; $('#help').textContent = help;
}
function renderHotspots() {
  let spots: typeof SPOTS = [];
  if (!intro && !busy) {
    if (state.phase === 'entry' && !selectedEntry) spots = ENTRIES;
    else if (state.phase === 'stash' && !selectedStash) spots = STASHES;
    else if (state.phase === 'investigate' && !canAccuse(state)) spots = SPOTS;
  }
  const leaders = `<svg id="hotspot-leaders" aria-hidden="true">${spots.map(spot => `<line data-leader="${spot.id}"/>`).join('')}</svg>`;
  $('#hotspots').innerHTML = leaders + spots.map(spot => {
    const searched = state.searched.includes(spot.id), found = state.found.some(clue => clue.spot === spot.id);
    const suggested = spot.id === state.hintSpot || (state.phase === 'investigate' && state.found.length === 0 && spot.id === 'pedestal');
    return `<button class="hotspot ${suggested ? 'suggested' : ''} ${found ? 'found' : ''} ${searched && !found ? 'searched' : ''}" data-spot="${spot.id}" aria-label="${state.phase === 'investigate' ? 'Inspect' : 'Choose'} ${spot.label}${searched ? ' — searched' : ''}" ${searched ? 'disabled' : ''}><span class="hotspot-dot">${icon(found ? 'check' : searched ? 'close' : state.phase === 'investigate' ? 'search' : 'arrow')}</span><span class="hotspot-name">${spot.label}</span></button>`;
  }).join('');
  positionHotspots();
}
function positionHotspots() {
  if (!gallery) return;
  const stage = $('#stage'), width = stage.clientWidth, height = stage.clientHeight;
  const targets = Array.from(document.querySelectorAll<HTMLElement>('#hotspots [data-spot]'));
  const projected = targets.map(el => {
    const point = gallery!.project(el.dataset.spot!);
    return { el, point, x: Math.max(38, Math.min(width - 38, point.x * width)), y: Math.max(38, Math.min(height - 40, point.y * height)) };
  });
  const crowded = projected.some((a, index) => projected.slice(index + 1).some(b =>
    Math.abs(a.x - b.x) < (a.el.offsetWidth + b.el.offsetWidth) / 2 + 8 &&
    Math.abs(a.y - b.y) < (a.el.offsetHeight + b.el.offsetHeight) / 2 + 8));
  // Keep every label readable in both short rooms and narrow desktop columns.
  // Keep them in stable rows and connect each label to its exact scene anchor.
  const compact = targets.length === 7 && (height < 360 || crowded);
  const rows: Record<string, [number, number]> = {
    window: [.35, 0], door: [.66, 0], pedestal: [.40, 1], clock: [.83, 1],
    planter: [.16, 2], bench: [.48, 2], terrace: [.82, 2],
  };
  const leaders = document.querySelector<SVGSVGElement>('#hotspot-leaders');
  leaders?.setAttribute('viewBox', `0 0 ${width} ${height}`);
  if (leaders) leaders.style.display = compact ? '' : 'none';
  projected.forEach(({ el, point, x: anchorX, y: anchorY }) => {
    const row = rows[el.dataset.spot!], spread = Math.min(width, 360), rise = Math.min(height, 360);
    const x = compact ? (width - spread) / 2 + row[0] * spread : anchorX;
    const y = compact ? (height - rise) / 2 + 38 + row[1] * (rise - 76) / 2 : anchorY;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.visibility = point.visible ? 'visible' : 'hidden';
    const line = leaders?.querySelector(`[data-leader="${el.dataset.spot}"]`);
    if (line && compact) {
      line.setAttribute('x1', String(x)); line.setAttribute('y1', String(y - 10));
      line.setAttribute('x2', String(point.x * width)); line.setAttribute('y2', String(point.y * height));
    }
  });
}
function render() {
  $('#game').dataset.screen = intro ? 'intro' : state.phase === 'investigate' && canAccuse(state) ? 'compare' : state.phase;
  $('#case-number').textContent = intro ? 'A little mystery for everyone' : `Case ${(profile.cases + (state.phase === 'result' ? 0 : 1)).toString().padStart(2, '0')}`;
  $('#pause').hidden = intro || state.phase === 'result'; $('#phase-track').hidden = intro || state.phase === 'result';
  const detective = state.phase === 'investigate' || state.phase === 'result';
  $('#heist-phase').className = detective || state.phase === 'handoff' ? 'complete' : 'active';
  $('#detective-phase').className = detective ? 'active' : '';
  $('#console-content').innerHTML = renderConsole(); $('#stage-caption').hidden = !intro;
  updateHeading(); renderSound(); syncScene(); renderHotspots();
  $('#save-status').textContent = storageOK ? (started ? 'Case saved' : 'Made for a little spare time') : 'Playing without saves';
  $('#run-time').textContent = intro ? '' : state.phase === 'handoff' ? 'Clock paused' :
    state.phase === 'result' ? `Solved in ${duration(state.result!.elapsedSeconds)}` : duration(elapsedSeconds);
  requestAnimationFrame(() => { gallery?.resize(); positionHotspots(); });
}
$('#app').addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!target || target.disabled || paused || busy) return;
  if (target.dataset.spot) { chooseSpot(target.dataset.spot as SpotId); return; }
  if (target.dataset.suspect) { selectedSuspect = target.dataset.suspect; audio.play('tap'); render(); focusPrimary(); return; }
  switch (target.dataset.action) {
    case 'begin': void begin(); break;
    case 'timing': timingAction(); break;
    case 'change': selectedEntry = selectedStash = null; timingSeconds = 0; gallery?.focus(null); render(); break;
    case 'investigate': {
      const result = beginInvestigation(state);
      if (!result.ok) return;
      state = result.state; notice = ''; lastClue = null;
      audio.play('switch'); transition(); persist(); render(); announce('Now you are the detective. Inspect the empty display.'); break;
    }
    case 'hint': {
      const result = requestHint(state); state = result.state;
      if (result.hint) { gallery?.focus(result.hint); notice = result.message; noticeType = ''; lastClue = null; audio.play('tap'); announce(result.message); persist(); render(); }
      break;
    }
    case 'accuse': finishCase(); break;
    case 'next': newCase(); break;
  }
});
document.addEventListener('pointerdown', () => { keyboard = false; }, { passive: true });
document.addEventListener('keydown', event => {
  keyboard = true;
  if (event.repeat) { if (event.key === 'Enter' || event.key === ' ') event.preventDefault(); return; }
  if (event.key === 'Escape' && !$<HTMLDialogElement>('#pause-dialog').open) { event.preventDefault(); setPaused(true); return; }
  if (busy && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  if (paused || busy || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key >= '1' && event.key <= '3') {
    const index = Number(event.key) - 1;
    if (!intro && state.phase === 'entry' && !selectedEntry) chooseSpot(ENTRIES[index].id);
    else if (!intro && state.phase === 'stash' && !selectedStash) chooseSpot(STASHES[index].id);
    else if (!intro && canAccuse(state)) document.querySelectorAll<HTMLButtonElement>('[data-suspect]')[index]?.click();
  }
  if ((event.key === ' ' || event.key === 'Enter') && !(event.target instanceof HTMLButtonElement)) {
    const action = primary(); if (action && !action.disabled) { event.preventDefault(); action.click(); }
  }
});
document.addEventListener('visibilitychange', () => {
  previousFrame = performance.now();
  if (document.hidden) { audio.suspend(); if (started) persist(); }
  else if (!paused) audio.resume();
});
window.addEventListener('pagehide', () => { if (started) persist(); audio.suspend(); });
window.addEventListener('pageshow', () => { previousFrame = performance.now(); if (!document.hidden && !paused) audio.resume(); });
reduced.addEventListener('change', () => gallery?.setReducedMotion(reduced.matches));
new ResizeObserver(() => { gallery?.resize(); positionHotspots(); }).observe($('#stage'));
function frame(now: number) {
  const raw = Math.max(0, (now - previousFrame) / 1000); previousFrame = now;
  if (!document.hidden && !paused && !contextLost) {
    // The role-switch reveal is reading time; the case clock resumes with investigation.
    if (!intro && ['entry', 'take', 'stash', 'investigate'].includes(state.phase)) {
      elapsedSeconds += raw; saveSeconds += raw;
      if (saveSeconds >= 3) { saveSeconds = 0; persist(); }
    }
    if (timingActive()) {
      timingSeconds += raw;
      const pace = profile.settings.relaxed ? 2.6 : profile.cases === 0 ? 1.5 : 1.15;
      const progress = (timingSeconds / pace) % 2; timingCursor = progress <= 1 ? progress : 2 - progress;
      const needle = document.querySelector<HTMLElement>('#needle');
      if (needle) { needle.style.left = (timingCursor * 100) + '%'; needle.classList.toggle('in-gold', Math.abs(timingCursor - .5) <= .12); }
    }
    gallery?.render(Math.min(raw, .05));
  }
  if (clockSecond !== Math.floor(elapsedSeconds)) { clockSecond = Math.floor(elapsedSeconds); if (!intro && state.phase !== 'result' && state.phase !== 'handoff') $('#run-time').textContent = duration(elapsedSeconds); }
  if (state.phase === 'result' && resultSubmitSecond !== Math.floor(now / 1000)) { resultSubmitSecond = Math.floor(now / 1000); submitArcade(); }
  requestAnimationFrame(frame);
}
render(); requestAnimationFrame(frame);
// Paint the tiny, usable shell first; geometry and Three.js form a lazy chunk.
requestAnimationFrame(() => { void ensureGallery(); });
