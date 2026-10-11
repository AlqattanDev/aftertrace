/**
 * Real browser regression, separate from the pure-rule npm test command.
 * node tests/browser.mjs
 * BROWSER_PATH=/path/to/chromium QA_SHOWCASE=1 node tests/browser.mjs
 * Uses Playwright's installed Chromium by default; never downloads a browser.
 * Vite and Chromium share one process tree for isolated localhost environments.
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const showcase = process.env.QA_SHOWCASE === '1';
const capture = process.env.QA_CAPTURE !== '0';
const port = Number(process.env.QA_PORT || 5175);
const origin = `http://127.0.0.1:${port}`;
const baseURL = origin + (showcase ? '/aftertrace/play/' : '/');
const captureDir = join(root, '.impeccable/review');
const RUN = 'aftertrace.case.v2', PROFILE = 'aftertrace.profile.v2';
const results = [], layouts = [], startup = [];
let server, browser, investigationFixture, completedFixture;

async function check(name, action) {
  try {
    await action();
    results.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.stack || String(error) });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

async function openCase({ width = 1440, height = 900, input = 'mouse', host = 'ok', fixture } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1,
    hasTouch: input === 'touch', isMobile: input === 'touch', reducedMotion: 'reduce',
  });
  const calls = [], errors = [], network = [], external = [], transfers = [], transferJobs = [];
  let closing = false;
  await context.exposeBinding('__qaRecordArcade', (_source, run) => { calls.push(run); });
  await context.addInitScript(({ host, fixture, RUN, PROFILE }) => {
    // Fixtures are snapshots earned through the normal UI below, never invented rules state.
    if (fixture && !sessionStorage.getItem('aftertrace.qa.fixture')) {
      localStorage.setItem(RUN, fixture.run);
      if (fixture.profile) localStorage.setItem(PROFILE, fixture.profile);
      else localStorage.removeItem(PROFILE);
      sessionStorage.setItem('aftertrace.qa.fixture', '1');
    }
    if (host !== 'missing') window.arcade = { submit(run) {
      const recorded = window.__qaRecordArcade(run);
      if (host === 'throw') throw Error('Deliberately unavailable QA host');
      if (host === 'reject') return Promise.reject(Error('Deliberately unavailable QA host'));
      return recorded;
    } };
  }, { host, fixture, RUN, PROFILE });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) external.push(request.url());
  });
  page.on('response', response => { if (response.status() >= 400) network.push(`${response.status()} ${response.url()}`); });
  page.on('requestfinished', request => {
    const job = (async () => {
      const sizes = await request.sizes();
      transfers.push({url:request.url(),type:request.resourceType(),bodyBytes:sizes.responseBodySize,headerBytes:sizes.responseHeadersSize});
    })().catch(() => undefined);
    transferJobs.push(job);
  });
  page.on('requestfailed', request => {
    if (!closing && request.failure()?.errorText !== 'net::ERR_ABORTED') network.push(`${request.failure()?.errorText} ${request.url()}`);
  });
  await page.goto(baseURL);
  await page.locator('#scene-loading').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#scene-error').isVisible(), false, 'The actual gallery loads');
  await page.evaluate(() => document.fonts.ready);
  if (!startup.length && !fixture) {
    // This includes the lazily loaded gallery and loaded fonts, before our first input.
    await page.waitForLoadState('networkidle');
    await Promise.all(transferJobs);
    const types = ['document','stylesheet','script','font','image'];
    const byType = Object.fromEntries(types.map(type => [type,transfers.filter(file=>file.type===type).reduce((sum,file)=>sum+file.bodyBytes,0)]));
    startup.push({
      viewport:`${width}x${height}`, bodyBytes:transfers.reduce((sum,file)=>sum+file.bodyBytes,0),
      bytesIncludingHeaders:transfers.reduce((sum,file)=>sum+file.bodyBytes+file.headerBytes,0),
      byType, externalRequests:[...external], failedRequests:[...network], assets:transfers.map(file=>({...file})),
    });
  }
  return { context, page, calls, errors, network, input,
    async close() {
      closing = true;
      await context.close();
      assert.deepEqual(errors, [], 'No browser or console errors');
      assert.deepEqual(network, [], 'No failed asset requests');
      assert.deepEqual(external, [], 'No external assets or services are requested');
    },
  };
}

async function state(page) {
  return page.evaluate(({ RUN, PROFILE }) => ({
    run: JSON.parse(localStorage.getItem(RUN) || 'null'),
    profile: JSON.parse(localStorage.getItem(PROFILE) || 'null'),
  }), { RUN, PROFILE });
}
async function snapshot(page) {
  return page.evaluate(({ RUN, PROFILE }) => ({run: localStorage.getItem(RUN), profile: localStorage.getItem(PROFILE)}), {RUN, PROFILE});
}
async function screen(page, value) { await page.locator(`#game[data-screen="${value}"]`).waitFor(); }
async function focusWithTab(page, selector) {
  for (let count = 0; count < 35; count++) {
    if (await page.locator(selector).evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw Error(`Keyboard could not reach ${selector}`);
}
async function activate(test, selector) {
  const target = test.page.locator(selector);
  if (test.input === 'keyboard') {
    await target.waitFor();
    await test.page.waitForFunction(selector => !document.querySelector(selector)?.disabled, selector);
    await focusWithTab(test.page, selector);
    await test.page.keyboard.press('Enter');
  } else if (test.input === 'touch') await target.tap();
  else await target.click();
}
async function begin(test) {
  await activate(test, '#primary-action');
  await test.page.waitForFunction(() => document.querySelector('#game')?.dataset.screen !== 'intro');
}
async function timing(test) {
  await test.page.locator('#primary-action[data-action="timing"]').waitFor();
  await test.page.waitForFunction(() => {
    const needle = document.querySelector('#needle');
    const button = document.querySelector('#primary-action');
    const position = parseFloat(needle?.style.left || '-1');
    return button && !button.disabled && position >= 40 && position <= 55;
  });
  await activate(test, '#primary-action');
}
async function choose(test, spot) {
  const key = ({window:'1',door:'2',terrace:'3',planter:'1',bench:'2',clock:'3'})[spot];
  if (test.input === 'keyboard') {
    await test.page.locator(`.place-option[data-spot="${spot}"]:not(:disabled)`).waitFor();
    await test.page.keyboard.press(key);
  } else await activate(test, `.place-option[data-spot="${spot}"]`);
}
async function finishHeist(test, { entry = 'window', stash = 'clock', fromTake = false } = {}) {
  if (!fromTake) {
    await begin(test);
    await choose(test, entry);
    await timing(test);
    await screen(test.page, 'take');
  }
  await timing(test);
  await screen(test.page, 'stash');
  await choose(test, stash);
  await timing(test);
  await screen(test.page, 'handoff');
  await activate(test, '#primary-action[data-action="investigate"]');
  await screen(test.page, 'investigate');
  await test.page.waitForFunction(() => document.querySelectorAll('#hotspots button').length === 7);
}
async function search(test, spot) {
  await activate(test, `#hotspots [data-spot="${spot}"]`);
  assert.ok((await state(test.page)).run.state.searched.includes(spot), `The ${spot} target activates its own prop`);
}
async function matchVisibleTraits(page) {
  const comparisons = await page.locator('[data-suspect]').evaluateAll(buttons => {
    const clues = [...document.querySelectorAll('.clue-slot.found')].map(element => element.children[1].textContent.trim());
    return buttons.map(button => ({id:button.dataset.suspect, matches:clues.every(clue => button.textContent.includes(clue))}));
  });
  const matches = comparisons.filter(person => person.matches);
  assert.equal(matches.length, 1, 'Exactly one visible guest matches all three visible clues');
  return { correct: matches[0].id, wrong: comparisons.find(person => !person.matches).id };
}
async function solve(test, { wrongFirst = false } = {}) {
  await screen(test.page, 'compare');
  const match = await matchVisibleTraits(test.page);
  if (wrongFirst) {
    await activate(test, `[data-suspect="${match.wrong}"]`);
    await activate(test, '#primary-action');
    await test.page.locator('.wrong-notice').waitFor();
    assert.equal(await test.page.locator(`[data-suspect="${match.wrong}"]`).isDisabled(), true);
    assert.equal((await state(test.page)).run.state.wrongAccusations.length, 1);
  }
  await activate(test, `[data-suspect="${match.correct}"]`);
  await activate(test, '#primary-action');
  await screen(test.page, 'result');
  const saved = await state(test.page);
  assert.ok(saved.run.state.result.score > 0);
  assert.ok([1,2,3].includes(saved.run.state.result.stars));
  assert.equal(saved.profile.best.score, saved.run.state.result.score);
  assert.equal(saved.profile.cases, 1);
  assert.equal(saved.profile.collection.filter(Boolean).length, 1);
  return saved;
}
async function capturePage(test, name) {
  if (!capture) return;
  await test.page.waitForTimeout(900);
  await test.page.screenshot({path:join(captureDir, `${name}.png`), fullPage:true});
}
async function geometry(test, label) {
  await test.page.locator('#stage').scrollIntoViewIfNeeded();
  const report = await test.page.evaluate(() => {
    const buttons = [...document.querySelectorAll('#hotspots button:not(:disabled)')].map(element => {
      const r = element.getBoundingClientRect();
      const center = {x:r.x+r.width/2,y:r.y+r.height/2};
      const hit = document.elementFromPoint(center.x, center.y);
      return {spot:element.dataset.spot,x:r.x,y:r.y,width:r.width,height:r.height,hittable:element===hit || element.contains(hit)};
    });
    const overlaps = [];
    for(let a=0;a<buttons.length;a++) for(let b=a+1;b<buttons.length;b++) {
      const p=buttons[a],q=buttons[b];
      const w=Math.max(0,Math.min(p.x+p.width,q.x+q.width)-Math.max(p.x,q.x));
      const h=Math.max(0,Math.min(p.y+p.height,q.y+q.height)-Math.max(p.y,q.y));
      if(w*h>0) overlaps.push({spots:[p.spot,q.spot],fraction:w*h/Math.min(p.width*p.height,q.width*q.height)});
    }
    return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,buttons,overlaps};
  });
  layouts.push({label,...report});
  assert.equal(report.overflow, false, 'No horizontal scrolling');
  assert.equal(report.buttons.length, 7);
  for(const target of report.buttons) {
    assert.ok(target.width >= 44 && target.height >= 44, `${target.spot} has a 44px target`);
    assert.equal(target.hittable,true, `${target.spot} center is not covered`);
  }
  assert.equal(report.overlaps.length, 0, 'Hotspot hit regions do not overlap');
}
const parseClock = text => text.split(':').reduce((seconds,part)=>seconds*60+Number(part),0);

try {
  await mkdir(captureDir, {recursive:true});
  const config = {root,configFile:join(root,'vite.config.ts'),logLevel:'error'};
  if(showcase) server=await preview({...config,mode:'showcase',preview:{host:'127.0.0.1',port,strictPort:true}});
  else { server=await createServer({...config,server:{host:'127.0.0.1',port,strictPort:true,hmr:false}}); await server.listen(); }
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH || undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});

  await check('desktop mouse: full loop, pause, mute and three reload points', async()=>{
    const test=await openCase();
    try {
      await capturePage(test,'desktop');
      await begin(test); await choose(test,'window');
      await test.page.keyboard.press('Escape');
      await test.page.locator('#pause-dialog[open]').waitFor();
      const pausedClock=await test.page.locator('#run-time').innerText();
      await test.page.waitForTimeout(1200);
      assert.equal(await test.page.locator('#run-time').innerText(),pausedClock);
      await activate(test,'#relaxed'); await activate(test,'#dialog-sound');
      assert.equal((await state(test.page)).profile.settings.muted,true);
      assert.equal((await state(test.page)).profile.settings.relaxed,true);
      await activate(test,'#resume'); await test.page.waitForTimeout(1100);
      assert.ok(parseClock(await test.page.locator('#run-time').innerText())>parseClock(pausedClock));
      await timing(test); await screen(test.page,'take');
      const before=await state(test.page);
      await test.page.reload(); await screen(test.page,'intro');
      assert.equal(await test.page.locator('#sound').getAttribute('aria-label'),'Turn sound on');
      await begin(test); await screen(test.page,'take');
      let saved=await state(test.page);
      assert.equal(saved.run.state.id,before.run.state.id);
      assert.deepEqual(saved.run.state.traces,before.run.state.traces);
      await finishHeist(test,{fromTake:true});
      investigationFixture=await snapshot(test.page);
      await search(test,'pedestal');
      const discovered=(await state(test.page)).run.state.found;
      await test.page.reload(); await screen(test.page,'intro'); await begin(test);
      assert.deepEqual((await state(test.page)).run.state.found,discovered);
      assert.equal(await test.page.locator('#hotspots [data-spot="pedestal"]').isDisabled(),true);
      await search(test,'window'); await search(test,'clock');
      saved=await solve(test);
      await test.page.waitForTimeout(1200);
      assert.equal(test.calls.length,1,'One arcade submission for the solved case');
      assert.equal(test.calls[0].score,saved.run.state.result.score);
      completedFixture=await snapshot(test.page);
      await test.page.reload(); await screen(test.page,'intro'); await begin(test); await screen(test.page,'result');
      await test.page.waitForTimeout(1200);
      assert.equal(test.calls.length,1,'Reload never duplicates an accepted submission');
      assert.equal((await state(test.page)).profile.cases,1,'Reload never duplicates local awards');
      await activate(test,'#primary-action'); await screen(test.page,'entry');
      assert.notEqual((await state(test.page)).run.state.id,saved.run.state.id);
      assert.equal((await state(test.page)).run.state.relic.id,'sunbird');
    } finally { await test.close(); }
  });

  await check('portrait touch: empty search, hint, wrong guess, retry and next case', async()=>{
    const test=await openCase({width:390,height:844,input:'touch'});
    try {
      await capturePage(test,'mobile');
      await finishHeist(test);
      await geometry(test,'390x844');
      await capturePage(test,'detective');
      await search(test,'door');
      assert.equal((await state(test.page)).run.state.found.length,0);
      await activate(test,'[data-action="hint"]'); await activate(test,'[data-action="hint"]');
      assert.equal((await state(test.page)).run.state.hinted.length,1,'Re-showing one hint costs once');
      for(const spot of ['pedestal','window','clock']) await search(test,spot);
      const saved=await solve(test,{wrongFirst:true});
      assert.equal(saved.run.state.result.hintCount,1);
      assert.equal(saved.run.state.result.wrongCount,1);
      assert.equal(saved.run.state.result.penalties,350);
      assert.equal(saved.profile.streak,0);
      await capturePage(test,'result');
      assert.equal(test.calls.length,1);
      await activate(test,'#primary-action'); await screen(test.page,'entry');
    } finally { await test.close(); }
  });

  await check('desktop keyboard: Tab, Enter, number shortcuts and held-key protection',async()=>{
    const test=await openCase({input:'keyboard'});
    try {
      await begin(test); await choose(test,'window');
      await focusWithTab(test.page,'#primary-action');
      await test.page.keyboard.down('Enter'); await screen(test.page,'take');
      await test.page.waitForTimeout(850);
      await test.page.keyboard.down('Enter');
      await test.page.keyboard.up('Enter');
      await test.page.waitForTimeout(100);
      assert.equal((await state(test.page)).run.state.phase,'take','A repeated Enter does not auto-play the next action');
      await finishHeist(test,{fromTake:true});
      for(const spot of ['pedestal','window','clock']) await search(test,spot);
      await solve(test);
    } finally { await test.close(); }
  });

  if(investigationFixture) for(const [width,height,name] of [[320,568,'phone-small'],[360,740,null],[844,390,'landscape']]) {
    await check(`restored touch layout ${width}x${height}: all seven targets`,async()=>{
      const test=await openCase({width,height,input:'touch',fixture:investigationFixture});
      try {
        if(name) await capturePage(test,name);
        await begin(test); await screen(test.page,'investigate');
        await geometry(test,`${width}x${height}`);
        for(const spot of ['door','terrace','planter','bench','pedestal','window','clock']) await search(test,spot);
        await solve(test);
      } finally { await test.close(); }
    });
  }

  if(completedFixture) {
    await check('interrupted-save fixture: a result rebuilds a missing profile once',async()=>{
      const test=await openCase({fixture:{run:completedFixture.run,profile:null}});
      try {
        await begin(test); await screen(test.page,'result');
        assert.equal((await state(test.page)).profile.cases,1);
        assert.equal((await state(test.page)).profile.collection[0]>0,true);
        await test.page.reload(); await screen(test.page,'intro'); await begin(test);
        assert.equal((await state(test.page)).profile.cases,1);
      } finally { await test.close(); }
    });
    for(const host of ['missing','throw','reject']) await check(`arcade ${host}: saved result and next case remain usable`,async()=>{
      const profile=JSON.parse(completedFixture.profile); profile.submittedIds=[];
      const test=await openCase({host,fixture:{run:completedFixture.run,profile:JSON.stringify(profile)}});
      try {
        await begin(test); await screen(test.page,'result');
        await test.page.waitForTimeout(1100);
        assert.equal((await state(test.page)).profile.cases,1);
        if(host==='missing') assert.equal(test.calls.length,0);
        else assert.ok(test.calls.length>=1);
        await activate(test,'#primary-action'); await screen(test.page,'entry');
        assert.equal((await state(test.page)).run.state.relic.id,'sunbird');
      } finally { await test.close(); }
    });
  }

  if(investigationFixture) await check('simulated WebGL loss: visible reload action restores the case',async()=>{
    const test=await openCase({fixture:investigationFixture});
    try {
      await begin(test); await screen(test.page,'investigate');
      const before=(await state(test.page)).run.state;
      const injected=await test.page.evaluate(()=>{
        const extension=document.querySelector('#world').getContext('webgl2')?.getExtension('WEBGL_lose_context');
        extension?.loseContext(); return !!extension;
      });
      assert.equal(injected,true,'Browser supports the explicit graphics-failure fixture');
      await test.page.locator('#scene-error').waitFor({state:'visible'});
      assert.equal(await test.page.locator('#pause-dialog').evaluate(dialog=>dialog.open),false,'Pause dialog does not cover recovery');
      await activate(test,'#reload'); await screen(test.page,'intro');
      await begin(test); await screen(test.page,'investigate');
      assert.equal((await state(test.page)).run.state.id,before.id);
      assert.deepEqual((await state(test.page)).run.state.found,before.found);
    } finally { await test.close(); }
  });
} finally {
  if(browser) await browser.close();
  if(server) {
    if(showcase) await new Promise((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));
    else await server.close();
  }
}

console.log(JSON.stringify({mode:showcase?'showcase':'development',browser:browser?.version(),results,layouts,startup,
  limitations:['Chromium uses software graphics; physical-phone performance and heard sound are unverified.','Arcade tests use a local stub; the portfolio host is not exercised.']},null,2));
if(results.some(result=>result.status==='FAIL')) process.exitCode=1;
