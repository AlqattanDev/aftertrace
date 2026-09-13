export type Vec = { x: number; z: number };
export type Phase = 'criminal' | 'detective' | 'closed';
export type Disposal = 'dumpster' | 'river' | 'burial';
export type Event = { time: number; action: string; actor: string; at: Vec; from?: string; to?: string };
export type Item = { id: string; kind: 'pistol' | 'casing' | 'bullet'; label: string; pos: Vec; holder: string | null; prints: string[]; signature: string; history: Event[]; disposal?: Disposal; submergedAt?: number; collected: boolean; visible: boolean; incident?: string };
export type Observation = { incident: string; actor: string; kind: 'shot' | 'nearby'; time: number };
export type NPC = { id: string; name: string; pos: Vec; route: Vec[]; waypoint: number; observations: Observation[]; retrieved: boolean; reused: boolean };
export type Incident = { id: string; victim: string; pos: Vec; time: number; discovered: boolean; inspected: boolean };
export type Fact = { key: string; type: 'scene' | 'print' | 'ballistic' | 'witness' | 'record'; text: string; suspect?: string; item?: string; incident?: string; signature?: string; direct?: boolean };
export type LabTest = { id: string; item: string; kind: 'prints' | 'ballistics'; due: number; done: boolean };
export type World = { version: 1; phase: Phase; time: number; playSeconds: number; player: Vec; facing: number; accepted: boolean; crimeDone: boolean; disposed: boolean; purchase: 'legal' | 'stolen' | null; items: Item[]; npcs: NPC[]; incidents: Incident[]; facts: Fact[]; tests: LabTest[]; events: Event[]; searched: Partial<Record<Disposal, boolean>>; settings: { waterWashSeconds: number; labSeconds: number; timeScale: number }; outcome: { solved: boolean; suspect?: string; reasons: string[] } | null; notice: string; noticeUntil: number; started: boolean };
export const BUILDINGS = [
  { x: -22, z: -14, w: 16, d: 12, h: 7.5, color: 0x9d6455, name: 'MERCER PAWN' },
  { x: -3, z: -18, w: 12, d: 12, h: 10, color: 0x745a57, name: 'WREN HOUSE' },
  { x: 18, z: -17, w: 16, d: 14, h: 6.5, color: 0x657681, name: 'FORENSICS' },
  { x: -23, z: 16, w: 16, d: 14, h: 8.5, color: 0x825148, name: 'THE LANTERN' },
  { x: -4, z: 19, w: 13, d: 12, h: 7, color: 0xa67b64, name: 'HARBOR STORES' },
];
export const PLACES = { contract: { x: -27, z: 2 }, pawn: { x: -22, z: -6 }, stolen: { x: -31.5, z: -11 }, target: { x: -11.5, z: -13 }, dumpster: { x: -11.5, z: -23 }, river: { x: 28, z: 5 }, burial: { x: 22, z: 23 }, lab: { x: 18, z: -8 }, exit: { x: -29, z: 5 }, second: { x: 9, z: 6 } } satisfies Record<string, Vec>;
export const PEOPLE = [{ id: 'ellis', name: 'Ellis Vale', role: 'Courier', color: '#d5a854' }, { id: 'mara', name: 'Mara Finch', role: 'Salvage collector', color: '#b57567' }, { id: 'leon', name: 'Leon Ward', role: 'Pawnshop owner', color: '#83a6a0' }];
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);
export function collides(p: Vec, radius = .42): boolean {
  return p.x < -34 + radius || p.x > 29 - radius || p.z < -28 + radius || p.z > 28 - radius || BUILDINGS.some(b => Math.abs(p.x - b.x) < b.w / 2 + radius && Math.abs(p.z - b.z) < b.d / 2 + radius);
}
export function lineOfSight(a: Vec, b: Vec): boolean {
  const steps = Math.ceil(dist(a, b) * 4);
  for (let i = 1; i < steps; i++) { const p = { x: a.x + (b.x - a.x) * i / steps, z: a.z + (b.z - a.z) * i / steps }; if (BUILDINGS.some(t => Math.abs(p.x - t.x) < t.w / 2 && Math.abs(p.z - t.z) < t.d / 2)) return false; }
  return true;
}
const clonePos = (p: Vec): Vec => ({ x: p.x, z: p.z });
export function createWorld(): World {
  return { version: 1, phase: 'criminal', time: 0, playSeconds: 0, player: { x: -25, z: 2 }, facing: 0, accepted: false, crimeDone: false, disposed: false, purchase: null,
    items: [{ id: 'W-104', kind: 'pistol', label: 'Compact pistol · W-104', pos: clonePos(PLACES.pawn), holder: 'leon', prints: ['leon'], signature: 'BR-47', history: [{ time: 0, action: 'Stocked at Mercer Pawn', actor: 'leon', at: clonePos(PLACES.pawn), to: 'leon' }], collected: false, visible: false }],
    npcs: [
      { id: 'iris', name: 'Iris Bell', pos: { x: -11.5, z: -7 }, route: [{ x: -11.5, z: -7 }, { x: -11.5, z: -16 }, { x: -11.5, z: -6 }, { x: -8, z: -4 }], waypoint: 0, observations: [], retrieved: false, reused: false },
      { id: 'noah', name: 'Noah Reed', pos: { x: 3, z: 2 }, route: [{ x: 3, z: 2 }, { x: -26, z: 2 }, { x: -26, z: 6 }, { x: 3, z: 6 }], waypoint: 0, observations: [], retrieved: false, reused: false },
      { id: 'mara', name: 'Mara Finch', pos: { x: 7, z: -25 }, route: [{ x: 7, z: -25 }, { x: -11.5, z: -25 }, { x: -11.5, z: -7 }, { x: 8, z: -4 }, { x: 9, z: 6 }], waypoint: 0, observations: [], retrieved: false, reused: false },
      { id: 'ada', name: 'Ada Park', pos: { x: 18, z: 7 }, route: [{ x: 18, z: 7 }, { x: 10, z: 7 }, { x: 10, z: 15 }, { x: 26, z: 15 }, { x: 26, z: 7 }], waypoint: 0, observations: [], retrieved: false, reused: false },
    ], incidents: [], facts: [], tests: [], events: [], searched: {}, settings: { waterWashSeconds: 180, labSeconds: 120, timeScale: 4 }, outcome: null, notice: '', noticeUntil: 0, started: false };
}
export function notify(w: World, message: string) { w.notice = message; w.noticeUntil = w.time + 22; }
export function addFact(w: World, f: Fact) { if (!w.facts.some(x => x.key === f.key)) w.facts.push(f); }
export function event(w: World, action: string, actor: string, at: Vec, item?: Item, from?: string, to?: string) {
  const e = { time: w.time, action, actor, at: clonePos(at), from, to }; w.events.push(e); item?.history.push(e);
}
export function handle(w: World, item: Item, actor: string, at: Vec) {
  const previous = item.holder; item.holder = actor; item.pos = clonePos(at); item.visible = false;
  if (actor !== 'detective' && !item.prints.includes(actor)) item.prints.push(actor);
  if (actor !== 'detective') { delete item.disposal; delete item.submergedAt; }
  event(w, 'Handled / transferred ' + item.id, actor, at, item, previous || 'world', actor);
}
export function acceptContract(w: World) {
  if (w.phase !== 'criminal' || dist(w.player, PLACES.contract) > 3.4) return notify(w, 'Walk to the yellow payphone on Mercer Street.');
  w.accepted = true; event(w, 'Accepted the Rowan Pike contract', 'ellis', w.player); notify(w, 'Contract accepted. Obtain a pistol at Mercer Pawn, or from its rear stock crate.');
}
export function acquire(w: World, how: 'legal' | 'stolen') {
  if (w.phase !== 'criminal' || !w.accepted || w.purchase) return notify(w, 'Accept the contract first, or check your inventory.');
  if (dist(w.player, how === 'legal' ? PLACES.pawn : PLACES.stolen) > 3.4) return notify(w, 'Move closer to the shop counter or rear stock crate.');
  const gun = w.items[0]; handle(w, gun, 'ellis', w.player); w.purchase = how;
  event(w, how === 'legal' ? 'Legal sale recorded to Ellis Vale' : 'Stock crate theft; no buyer record', 'ellis', w.player, gun);
  notify(w, how === 'legal' ? 'Purchased W-104. The sale creates a record; earlier prints remain.' : 'Stole W-104. No sale record. Handling still leaves a trace.');
}
export function fire(w: World, actor: string, gun: Item, victim: string, pos: Vec, id: string) {
  const incident: Incident = { id, victim, pos: clonePos(pos), time: w.time, discovered: false, inspected: false }; w.incidents.push(incident);
  event(w, 'Fired ' + gun.id + ' in incident ' + id, actor, pos, gun);
  w.items.push({ id: id + '-C', kind: 'casing', label: 'Spent casing · ' + id, pos: { x: pos.x + 1.2, z: pos.z + .8 }, holder: null, prints: [actor], signature: gun.signature, history: [{ time: w.time, action: 'Ejected at incident ' + id, actor, at: clonePos(pos) }], collected: false, visible: true, incident: id });
  w.items.push({ id: id + '-B', kind: 'bullet', label: 'Recovered projectile · ' + id, pos: clonePos(pos), holder: null, prints: [], signature: gun.signature, history: [{ time: w.time, action: 'Projectile from ' + gun.id, actor, at: clonePos(pos) }], collected: false, visible: false, incident: id });
  for (const npc of w.npcs) {
    const d = dist(npc.pos, pos); if (npc.id === actor || !lineOfSight(npc.pos, pos)) continue;
    if (d <= 12) npc.observations.push({ incident: id, actor, kind: d <= 9 ? 'shot' : 'nearby', time: w.time });
  }
}
export function commitCrime(w: World) {
  const gun = w.items.find(i => i.kind === 'pistol' && i.holder === 'ellis');
  if (w.phase !== 'criminal' || !gun || w.crimeDone) return notify(w, 'You need the contract pistol.');
  if (dist(w.player, PLACES.target) > 3.2 || !lineOfSight(w.player, PLACES.target)) return notify(w, 'Reach Rowan Pike in the alley.');
  fire(w, 'ellis', gun, 'Rowan Pike', PLACES.target, '01'); w.crimeDone = true; notify(w, 'The shot echoes. A casing remains nearby. Collect it, or leave it.');
}
export function collectCasing(w: World) {
  const item = w.items.find(i => i.kind === 'casing' && i.incident === '01' && !i.holder && dist(i.pos, w.player) < 3.8);
  if (w.phase !== 'criminal' || !item) return notify(w, 'No casing within reach.');
  handle(w, item, 'ellis', w.player); notify(w, 'Casing pocketed. It will be absent from the scene.');
}
export function dispose(w: World, where: Disposal) {
  const gun = w.items.find(i => i.kind === 'pistol' && i.holder === 'ellis');
  if (w.phase !== 'criminal' || !w.crimeDone || !gun) return notify(w, 'Complete the contract before disposing of the weapon.');
  if (dist(w.player, PLACES[where]) > 3.5) return notify(w, 'Reach the selected disposal site.');
  gun.holder = null; gun.pos = clonePos(PLACES[where]); gun.disposal = where; gun.visible = false;
  if (where === 'river') gun.submergedAt = w.time;
  w.disposed = true; event(w, 'Discarded ' + gun.id + ' into ' + where, 'ellis', gun.pos, gun, 'ellis', where);
  notify(w, where === 'river' ? 'Submerged. Water gradually removes prints; ballistics survive.' : where === 'burial' ? 'Buried beneath disturbed soil. Traces remain; a careful search is needed.' : 'Left in the dumpster. Traces remain. Someone else may find it.');
}
export function move(w: World, x: number, z: number, dt: number) {
  const len = Math.hypot(x, z); if (!len) return;
  const speed = 4.1, nx = x / Math.max(1, len), nz = z / Math.max(1, len);
  // Substeps prevent collision tunneling on slow frames.
  const n = Math.ceil(dt / .025);
  for (let i = 0; i < n; i++) {
    let p = { x: w.player.x + nx * speed * dt / n, z: w.player.z }; if (!collides(p)) w.player.x = p.x;
    p = { x: w.player.x, z: w.player.z + nz * speed * dt / n }; if (!collides(p)) w.player.z = p.z;
  }
  w.facing = Math.atan2(nx, nz);
}
function walkNPC(n: NPC, target: Vec, dt: number): boolean {
  const d = dist(n.pos, target); if (d < .25) return true;
  const step = Math.min(d, dt * .62); const dx = (target.x - n.pos.x) / d * step, dz = (target.z - n.pos.z) / d * step;
  const p = { x: n.pos.x + dx, z: n.pos.z + dz };
  if (!collides(p, .2)) n.pos = p;
  else { const px = { x: p.x, z: n.pos.z }, pz = { x: n.pos.x, z: p.z }; if (!collides(px, .2)) n.pos.x = px.x; if (!collides(pz, .2)) n.pos.z = pz.z; }
  return d < .35;
}
export function tick(w: World, realDt: number) {
  if (!w.started || w.phase === 'closed') return;
  w.playSeconds += realDt; const dt = realDt * w.settings.timeScale; w.time += dt;
  for (const item of w.items) if (item.disposal === 'river' && item.submergedAt !== undefined && w.time - item.submergedAt >= w.settings.waterWashSeconds && item.prints.length) { item.prints = []; event(w, 'Water removed surface prints', 'environment', item.pos, item); }
  for (const n of w.npcs) {
    const gun = w.items.find(i => i.kind === 'pistol' && i.disposal === 'dumpster' && !i.holder);
    if (n.id === 'mara' && gun && !n.retrieved && dist(n.pos, gun.pos) < 4) {
      handle(w, gun, n.id, n.pos); n.retrieved = true; n.waypoint = 2;
      event(w, 'Recovered discarded weapon', n.id, n.pos, gun);
    }
    if (n.retrieved && !n.reused && n.waypoint >= 4) {
      if (walkNPC(n, PLACES.second, dt)) {
        const own = w.items.find(i => i.kind === 'pistol' && i.holder === n.id);
        if (own) { fire(w, n.id, own, 'Owen Shaw', PLACES.second, '02'); n.reused = true; own.holder = null; own.pos = { x: 10.2, z: 6.5 }; own.visible = true; event(w, 'Dropped weapon after incident 02', n.id, own.pos, own, n.id, 'street'); }
      }
    } else { if (walkNPC(n, n.route[n.waypoint % n.route.length], dt)) n.waypoint = (n.waypoint + 1) % n.route.length; }
    for (const incident of w.incidents) if (!incident.discovered && n.id !== (incident.id === '01' ? 'ellis' : 'mara') && dist(n.pos, incident.pos) < 10 && lineOfSight(n.pos, incident.pos) && w.time - incident.time > 8) {
      incident.discovered = true; event(w, 'Reported incident ' + incident.id, n.id, incident.pos);
      notify(w, incident.id === '01' ? 'A civilian reported the alley incident. The case is open.' : 'A second incident has been reported near Harbor Walk.');
    }
  }
  for (const item of w.items) {
    if (item.holder === 'detective' || (item.holder === 'ellis' && w.phase === 'criminal')) item.pos = clonePos(w.player);
    else { const carrier = w.npcs.find(n => n.id === item.holder); if (carrier) item.pos = clonePos(carrier.pos); }
  }
  for (const test of w.tests) if (!test.done && w.time >= test.due) { test.done = true; finishTest(w, test); notify(w, 'Lab results returned. Open case notes to read the findings.'); }
}
export function switchPhase(w: World) {
  if (!w.disposed) return notify(w, 'Choose a disposal site before leaving the district.');
  if (!w.incidents.some(i => i.id === '01' && i.discovered)) return notify(w, 'A civilian must discover and report the incident. The city is still moving.');
  if (dist(w.player, PLACES.exit) > 3.5) return notify(w, 'Return to the departure point on Mercer Street.');
  w.phase = 'detective'; w.player = clonePos(PLACES.lab); event(w, 'Detective arrived in the same district', 'detective', w.player);
  notify(w, 'Detective June Calder. You know the past; your case still needs evidence.');
}
export function inspectScene(w: World, id: string) {
  const incident = w.incidents.find(i => i.id === id);
  if (w.phase !== 'detective' || !incident?.discovered || dist(w.player, incident.pos) > 4) return notify(w, 'Move within reach of a reported scene.');
  incident.inspected = true;
  addFact(w, { key: 'scene:' + id, type: 'scene', incident: id, text: 'Scene ' + id + ': ' + incident.victim + '. Non-graphic examination recovered a projectile. Apparent gunshot death; weapon and actor unconfirmed.' });
  const bullet = w.items.find(i => i.kind === 'bullet' && i.incident === id)!; collectItem(w, bullet.id);
  notify(w, 'Scene documented. Projectile sealed. Look nearby for the casing and speak to witnesses.');
}
export function collectItem(w: World, id: string) {
  const item = w.items.find(i => i.id === id);
  if (w.phase !== 'detective' || !item || item.collected || item.holder || dist(w.player, item.pos) > 4 || (!item.visible && item.kind !== 'bullet')) return notify(w, 'Evidence is not available here. Search or inspect the scene first.');
  if (item.kind === 'bullet' && !w.incidents.find(i => i.id === item.incident)?.inspected) return notify(w, 'Inspect the scene first.');
  handle(w, item, 'detective', w.player); item.collected = true; delete item.disposal; delete item.submergedAt; // Gloves preserve previous deposits and never add detective prints.
  event(w, 'Sealed evidence ' + id, 'detective', w.player, item); notify(w, 'Evidence ' + id + ' sealed. Submit tests at Forensics.');
}
export function search(w: World, where: Disposal) {
  if (w.phase !== 'detective' || dist(w.player, PLACES[where]) > 4) return notify(w, 'Move to the search site.');
  w.searched[where] = true;
  const item = w.items.find(i => i.disposal === where && !i.holder && !i.collected);
  if (item) { item.visible = true; notify(w, 'Search located a firearm. Collect it to preserve the remaining traces.'); }
  else notify(w, where === 'dumpster' ? 'Dumpster empty. Someone may have moved its contents; check the district and witnesses.' : 'Search complete. No weapon found here.');
  event(w, 'Searched ' + where, 'detective', w.player);
}
export function question(w: World, id: string) {
  const n = w.npcs.find(n => n.id === id);
  if (w.phase !== 'detective' || !n || dist(w.player, n.pos) > 4.5) return notify(w, 'Move closer to this witness.');
  for (const o of n.observations) {
    const actor = PEOPLE.find(p => p.id === o.actor)?.name || o.actor;
    addFact(w, { key: 'witness:' + n.id + ':' + o.incident + ':' + o.kind, type: 'witness', suspect: o.actor, incident: o.incident, direct: o.kind === 'shot', text: n.name + (o.kind === 'shot' ? ' identifies ' + actor + ' firing at scene ' : ' places ' + actor + ' near scene ') + o.incident + ' at ' + clock(o.time) + '. Statement recorded from an unobstructed view.' });
  }
  if (n.retrieved) addFact(w, { key: 'retrieval:' + n.id, type: 'witness', suspect: n.id, item: 'W-104', text: n.name + ' says she found a pistol in the alley dumpster. Possession does not identify the first shooter.' });
  if (!n.observations.length && !n.retrieved) addFact(w, { key: 'witness:none:' + n.id, type: 'witness', text: n.name + ': “I did not get a clear view of either incident.”' });
  notify(w, 'Statement from ' + n.name + ' added to case notes.');
}
export function records(w: World) {
  if (w.phase !== 'detective' || (dist(w.player, PLACES.pawn) > 4 && dist(w.player, PLACES.lab) > 4)) return notify(w, 'Use the records terminal at the lab or ask at Mercer Pawn.');
  addFact(w, { key: 'records:identities', type: 'record', text: 'Reference database: Ellis Vale (courier), Mara Finch (salvage collector), Leon Ward (pawnbroker). Reference prints available for lab comparison. These records establish identity, not guilt.' });
  addFact(w, { key: 'records:sale', type: 'record', suspect: w.purchase === 'legal' ? 'ellis' : undefined, item: 'W-104', text: w.purchase === 'legal' ? 'Mercer sales ledger: W-104 was legally sold to Ellis Vale. Purchase establishes a transfer only.' : 'Mercer stock ledger: W-104 is missing from the rear crate. No buyer is recorded.' });
  notify(w, 'Records retrieved. Identity references are now available to the lab.');
}
export function submitTest(w: World, itemId: string, kind: 'prints' | 'ballistics') {
  const item = w.items.find(i => i.id === itemId);
  if (w.phase !== 'detective' || dist(w.player, PLACES.lab) > 4) return notify(w, 'Submit evidence at the Forensics entrance.');
  if (!item?.collected) return notify(w, 'Collect and seal this item first.');
  if (kind === 'prints' && !w.facts.some(f => f.key === 'records:identities')) return notify(w, 'Look up identity reference records before requesting a print comparison.');
  const id = kind + ':' + itemId;
  if (w.tests.some(t => t.id === id)) return notify(w, 'This test is already submitted. Copies do not add evidence.');
  w.tests.push({ id, item: itemId, kind, due: w.time + w.settings.labSeconds, done: false }); notify(w, 'Test submitted. Result in ' + Math.round(w.settings.labSeconds / w.settings.timeScale) + ' seconds of active play.');
}
function finishTest(w: World, t: LabTest) {
  const item = w.items.find(i => i.id === t.item)!;
  if (t.kind === 'prints') {
    if (!item.prints.length) addFact(w, { key: t.id + ':none', type: 'print', item: item.id, incident: item.incident, text: item.id + ': no usable fingerprints. A negative result does not identify a handler.' });
    for (const p of item.prints) addFact(w, { key: t.id + ':' + p, type: 'print', item: item.id, incident: item.incident, suspect: p, text: item.id + ': a fingerprint matches ' + (PEOPLE.find(x => x.id === p)?.name || p) + '. Handling is established; its time is not.' });
  } else addFact(w, { key: t.id, type: 'ballistic', item: item.id, incident: item.incident, signature: item.signature, text: item.id + ': ' + (item.kind === 'pistol' ? 'test-fire' : 'microscopy') + ' signature ' + item.signature + '. Matching signatures link objects and incidents, not an individual shooter.' });
}
export function arrestAssessment(w: World, suspect: string, incident = '01') {
  const fs = Array.from(new Map(w.facts.map(f => [f.key, f])).values());
  const scene = fs.some(f => f.type === 'scene' && f.incident === incident);
  const matches = fs.filter(f => f.type === 'ballistic' && f.incident === incident);
  const guns = fs.filter(f => f.type === 'ballistic' && w.items.find(i => i.id === f.item)?.kind === 'pistol' && matches.some(m => m.signature === f.signature));
  const linked = guns.length > 0;
  const handling = fs.some(f => f.type === 'print' && f.suspect === suspect && guns.some(g => g.item === f.item));
  const direct = fs.some(f => f.type === 'witness' && f.direct && f.incident === incident && f.suspect === suspect);
  const casing = fs.some(f => f.type === 'print' && f.suspect === suspect && f.incident === incident && w.items.find(i => i.id === f.item)?.kind === 'casing');
  const sceneTie = direct || casing;
  const checks = [{ ok: scene, text: 'Documented scene ' + incident }, { ok: linked, text: 'Recovered firearm matched to scene ammunition' }, { ok: handling, text: 'Suspect’s print identified on that firearm' }, { ok: sceneTie, text: 'Independent scene tie: direct witness or print on its casing' }];
  return { supported: checks.every(c => c.ok), checks };
}
export function attemptArrest(w: World, suspect: string) {
  if (w.phase !== 'detective') return;
  const a = arrestAssessment(w, suspect);
  if (!a.supported) { notify(w, 'Arrest declined: ' + a.checks.filter(c => !c.ok).map(c => c.text.toLowerCase()).join('; ') + '. Continue investigating.'); return; }
  const ammunition = w.facts.filter(f => f.type === 'ballistic' && f.incident === '01');
  const firearm = w.facts.find(f => f.type === 'ballistic' && w.items.find(i => i.id === f.item)?.kind === 'pistol' && ammunition.some(m => m.signature === f.signature))!;
  const matched = ammunition.find(f => f.signature === firearm.signature)!;
  const handling = w.facts.find(f => f.type === 'print' && f.suspect === suspect && f.item === firearm.item)!;
  const sceneTie = w.facts.find(f => f.type === 'witness' && f.direct && f.incident === '01' && f.suspect === suspect) || w.facts.find(f => f.type === 'print' && f.suspect === suspect && f.incident === '01' && w.items.find(i => i.id === f.item)?.kind === 'casing')!;
  w.outcome = { solved: true, suspect, reasons: [ 'Scene 01 documented: Rowan Pike; projectile 01-B recovered and sealed.', firearm.item + ' test-fire matches scene 01 ammunition ' + matched.item + ': signature ' + firearm.signature + '.', handling.text, sceneTie.text ] }; w.notice = ''; w.phase = 'closed'; event(w, 'Supported arrest for incident 01', 'detective', w.player);
}
export function closeUnsolved(w: World) {
  if (w.phase !== 'detective') return;
  const a = arrestAssessment(w, 'ellis'); w.outcome = { solved: false, reasons: a.checks.filter(c => !c.ok).map(c => 'Missing: ' + c.text) }; if (!w.outcome.reasons.length) w.outcome.reasons.push('Case closed at your discretion before an arrest.');
  w.notice = ''; w.phase = 'closed'; event(w, 'Closed case unsolved', 'detective', w.player);
}
export function clock(time: number) { const m = 21 * 60 + Math.floor(time / 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
export function objective(w: World): string {
  if (w.phase === 'closed') return w.outcome?.solved ? 'Case closed. Review the evidence or reveal the full history.' : 'Case unsolved. Review the gaps or begin a new world.';
  if (w.phase === 'criminal') {
    if (!w.accepted) return 'Answer the payphone on Mercer Street.';
    if (!w.purchase) return 'Obtain a pistol: buy at Mercer Pawn or steal from the rear crate.';
    if (!w.crimeDone) return 'Find Rowan Pike in the narrow alley beside Mercer Pawn.';
    if (!w.disposed) return 'Keep or leave the casing. Dispose of the pistol: dumpster, river or burial.';
    return w.incidents[0]?.discovered ? 'Return to the departure point to begin the investigation.' : 'Leave the alley. Wait for a civilian to report the incident.';
  }
  if (!w.incidents[0]?.inspected) return 'Walk to the reported alley scene and document it.';
  if (!w.items.some(i => i.kind === 'pistol' && i.collected)) return 'Find the weapon. Search disposal sites, question witnesses, check new scenes.';
  if (!w.facts.some(f => f.key === 'records:identities')) return 'Visit Forensics or Mercer Pawn to retrieve reference records.';
  if (!w.tests.length) return 'Submit the firearm and scene ammunition to the lab at Forensics.';
  if (w.tests.some(t => !t.done)) return 'Lab tests are running. Question witnesses or explore while you wait.';
  return 'Read the returned facts. Compare suspects and build a supported arrest.';
}
export function save(w: World, storage: Pick<Storage, 'setItem'> = localStorage) { try { storage.setItem('aftertrace-world-v1', JSON.stringify(w)); return true; } catch { return false; } }
export function load(storage: Pick<Storage, 'getItem'> = localStorage): World { try { const raw = storage.getItem('aftertrace-world-v1'); if (raw) { const w = JSON.parse(raw); if (w.version === 1 && Array.isArray(w.items) && Array.isArray(w.npcs) && Array.isArray(w.facts) && w.settings && w.player) return w as World; } } catch { /* corrupt saves start a clean world */ } return createWorld(); }
