import {chromium} from '@playwright/test';
import {collides,dist,PLACES,type Vec} from '../src/sim.ts';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5173');await page.getByRole('button',{name:'Enter Mercer District'}).click();
async function pos():Promise<Vec>{return page.evaluate(()=>(window as any).aftertraceDiagnostics.position);}
const sleep=(ms:number)=>page.waitForTimeout(ms);
async function walkStraight(target:Vec,tolerance=.65){for(let j=0;j<240;j++){const p=await pos(),d=dist(p,target);if(d<tolerance)return;const dx=(target.x-p.x)/d,dz=(target.z-p.z)/d;const sx=.79*dx-.61*dz,sy=.61*dx+.79*dz;
  // Joystick uses the same simultaneous-pointer input path as a player; continuous analog direction.
 const r=await page.locator('#joystick').boundingBox();const cx=r!.x+r!.width/2,cy=r!.y+r!.height/2;
 await page.mouse.move(cx+sx*38,cy+sy*38);await page.mouse.down();
 await sleep(Math.min(220,Math.max(35,d/4.1*1000*.7)));
 await page.mouse.up();
 }throw new Error('walk stuck '+JSON.stringify(await pos())+' -> '+JSON.stringify(target));}
function path(a:Vec,b:Vec){const start={x:Math.round(a.x),z:Math.round(a.z)},goal={x:Math.round(b.x),z:Math.round(b.z)};const key=(p:Vec)=>p.x+','+p.z;let open=[start];const came=new Map<string,Vec>(),cost=new Map([[key(start),0]]);let end:Vec|undefined;
 while(open.length){open.sort((p,q)=>(cost.get(key(p))!+dist(p,goal))-(cost.get(key(q))!+dist(q,goal)));const cur=open.shift()!;if(dist(cur,goal)<1.2){end=cur;break;}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const n={x:cur.x+dx,z:cur.z+dz};if(collides(n,.65)||collides({x:cur.x+dx,z:cur.z},.65)||collides({x:cur.x,z:cur.z+dz},.65))continue;const c=cost.get(key(cur))!+Math.hypot(dx,dz);if(c<(cost.get(key(n))??Infinity)){cost.set(key(n),c);came.set(key(n),cur);open.push(n);}}}
 if(!end)throw new Error('No path');const out=[b];let cur=end;while(key(cur)!==key(start)){out.unshift(cur);cur=came.get(key(cur))!;}return out.filter((v,i,arr)=>i===arr.length-1||i%3===0);}
async function walk(b:Vec){for(const p of path(await pos(),b))await walkStraight(p,.75);await sleep(180);console.log('walk',b,await pos());}
async function action(name:string){await page.getByRole('button',{name,exact:false}).first().click();await sleep(220);console.log('action',name);}
async function stored(){await sleep(2100);return page.evaluate(()=>JSON.parse(localStorage.getItem('aftertrace-world-v1')!));}
await action('Accept contract');await walk(PLACES.pawn);await action('Buy pistol');await walk(PLACES.target);await action('Carry out contract');
// Leave the casing at the first scene, allowing an independent scene tie.
await walk(PLACES.dumpster);await action('Discard in dumpster');await sleep(2400);await walk(PLACES.exit);await action('Become the detective');
if((await stored()).phase!=='detective')throw new Error('phase did not switch');
await walk(PLACES.target);await action('Document scene 01');await sleep(4500);await action('Collect casing');
let state=await stored();const witness=state.npcs.find((n:any)=>n.observations.some((o:any)=>o.incident==='01'&&o.kind==='shot'));
if(witness){await walk(witness.pos);let nearby=await page.getByRole('button',{name:'Talk to '+witness.name}).count();if(nearby){await action('Talk to '+witness.name);await page.getByRole('button',{name:'Close panel',exact:true}).click();}}
// Retrieval/reuse is allowed to run in the actual saved world, no manufactured detective scene.
for(let t=0;t<24;t++){state=await stored();if(state.incidents.length===2)break;await sleep(2000);}
if(state.incidents.length!==2)throw new Error('NPC did not reuse dumpster weapon');
await walk(PLACES.second);if(await page.getByRole('button',{name:'Document scene 02'}).count()){await action('Document scene 02');await sleep(4500);}await action('Collect firearm');if(await page.getByRole('button',{name:'Collect casing'}).count())await action('Collect casing');
await walk(PLACES.lab);await action('Look up records');await action('Submit lab tests');
for(const id of ['W-104','01-C','01-B','02-C','02-B']){for(const kind of ['prints','ballistics']){const b=page.locator(`[data-test="${id}:${kind}"]`);if(await b.count()&&await b.isEnabled())await b.click();}}
await sleep(2300);const savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('aftertrace-world-v1')!));await page.reload();await sleep(600);const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('aftertrace-world-v1')!));if(restored.tests.length!==savedBefore.tests.length)throw new Error('pending tests lost');console.log('reload preserved tests',restored.tests.length);
await sleep(32000);await page.locator('[data-panel="case"]').click();await action('Compare suspects & assess arrest');await page.locator('#suspect').selectOption('mara');await sleep(250);await action('Attempt arrest of Mara Finch');if((await stored()).phase!=='detective')throw new Error('false arrest allowed');await page.locator('#suspect').selectOption('ellis');await sleep(250);await action('Attempt arrest of Ellis Vale');state=await stored();if(!state.outcome?.solved)throw new Error('supported arrest failed');
await page.screenshot({path:'.impeccable/review/outcome.png'});await action('Reveal full event history');if(!(await page.locator('.timeline').innerText()).includes('incident 02'))throw new Error('recap missing second incident');
fs.writeFileSync('tests/playthrough-result.json',JSON.stringify({outcome:state.outcome,playSeconds:state.playSeconds,incidents:state.incidents.map((i:any)=>i.id),weapon:state.items[0],facts:state.facts,tests:state.tests,errors},null,2));
console.log('PASS: full dumpster criminal/detective playthrough, NPC reuse, tests, reload, rejected false arrest, supported arrest, recap',state.playSeconds,errors);await browser.close();
