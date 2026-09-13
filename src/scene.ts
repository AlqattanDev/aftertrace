import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BUILDINGS, PLACES, type World, type Vec } from './sim';
const C = { ground: 0x66776d, walk: 0x8a9691, road: 0x455360, curb: 0xa6afa5, roof: 0x364653, trim: 0xb8a78d, navy: 0x1c3043, yellow: 0xeec66c, river: 0x416f7c };
export class City {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera = new THREE.OrthographicCamera();
  player = new THREE.Group(); people = new Map<string, THREE.Group>(); itemMeshes = new Map<string, THREE.Group>();
  buildingGroups: THREE.Group[] = []; target = new THREE.Vector3(-25, 0, 2); marker = new THREE.Group(); goalRing: THREE.Mesh;
  victim = new THREE.Group(); victim2 = new THREE.Group(); water: THREE.Mesh; mapCanvas: HTMLCanvasElement;
  last = new Map<string, Vec>(); quality: string; frames = 0; elapsed = 0; fps = 0;
  constructor(public canvas: HTMLCanvasElement, map: HTMLCanvasElement) {
    this.mapCanvas = map;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.35;
    this.scene.background = new THREE.Color(0x718592); this.scene.fog = new THREE.Fog(0x718592, 95, 170);
    this.scene.add(new THREE.HemisphereLight(0xc5d9ee, 0x6b5861, 2.5));
    const sun = new THREE.DirectionalLight(0xffd8a2, 3.3); sun.position.set(-24, 48, 18); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -48; sun.shadow.camera.right = 48; sun.shadow.camera.top = 48; sun.shadow.camera.bottom = -48; sun.shadow.camera.far = 120; sun.shadow.normalBias = .08; sun.shadow.bias = -.0002; this.scene.add(sun);
    this.box(this.scene, 0, -.7, 0, 74, 1.3, 63, C.navy);
    this.box(this.scene, -2, -.03, 0, 66, .35, 57, C.ground);
    this.box(this.scene, -2, .12, 0, 66, .09, 8, C.road);
    this.box(this.scene, 5, .13, 0, 6, .09, 55, C.road);
    for (const side of [-1, 1]) { this.box(this.scene, -2, .25, side * 5.05, 66, .22, 2.1, C.walk); this.box(this.scene, -2, .36, side * 4.02, 66, .18, .18, C.curb); }
    this.box(this.scene, -11.6, .22, -16, 4.2, .12, 23, 0x747f79);
    this.box(this.scene, 8.4, .23, 0, 1, .2, 55, C.walk);
    this.box(this.scene, 26.8, .24, 3, 4.3, .2, 51, 0xaaa38a);
    this.box(this.scene, 17, .22, 9, 17, .12, 2.6, 0xaaa38a);
    this.box(this.scene, 22, .21, 19, 2, .1, 20, 0x9b9680);
    for (let x = -30; x < 29; x += 5) this.box(this.scene, x, .185, 0, 2.1, .015, .12, 0xc3baa0);
    for (let z = -3; z < 4; z += .95) { this.box(this.scene, 1, .19, z, 1.5, .02, .42, 0xc9cbbb); this.box(this.scene, 9, .19, z, 1.5, .02, .42, 0xc9cbbb); }
    for (let x = -31; x < 30; x += 2.2) for (const z of [-5.5, 5.5]) this.box(this.scene, x, .367, z, .018, .01, 1.6, 0x748681);
    for (const b of BUILDINGS) this.building(b);
    this.water = this.box(this.scene, 35, -.04, 0, 10, .2, 59, C.river);
    for (let z = -27; z < 28; z += 3.8) { this.box(this.scene, 29.3, .6, z, .45, 1.2, .45, C.trim); this.box(this.scene, 29.3, 1.05, z + 1.9, .1, .1, 3.8, C.navy); }
    // A river access gap and a small timber landing.
    this.box(this.scene, 29.5, .15, 5, 3.5, .2, 4, 0x7b7869);
    for (let z = -26; z < 30; z += 2.2) for (let i = 0; i < 3; i++) this.box(this.scene, 31.5 + i * 2.5 + Math.sin(z) * .5, .082, z + i, 1.4, .01, .08, 0x648996);
    // Authored trees, layered faceted crowns, planting beds and tactile street props.
    [[16,15],[26,21],[16,24],[25,26],[12,23],[20,27],[13,13],[25,12],[28,-25],[-31,24],[-31,-25],[-1,9]].forEach(([x,z],i)=>this.tree(x,z,3.4+(i%3)*.65));
    this.box(this.scene, 22, .25, 23, 2.1, .17, 2.8, 0x786b50);
    for (let i = 0; i < 7; i++) this.box(this.scene, 21.2 + i % 3 * .55, .37, 22.1 + Math.floor(i/3)*.7, .4, .18, .35, 0x8b7c5d);
    for (const [x,z] of [[-28,-4],[-8,-4],[14,-4],[26,7],[-29,6],[11,9],[24,-7]]) this.lamp(x,z);
    for (const [x,z] of [[18,10],[25,16],[-18,6]]) this.bench(x,z);
    this.dumpster(); this.payphone(); this.crate();
    this.sign('MERCER STREET', -17, .4, .95, 9, .8, '#b4b6aa', true);
    this.sign('HARBOR WALK', 18, .4, 9.1, 7.5, .6, '#676d68', true);
    this.sign('AFTERTRACE', -4, -.05, 31.3, 19, 1.5, '#c2b795', true);
    this.car(-19, -2.3, 0x546a74); this.car(20, 2, 0x998572); this.car(-1, 2.2, 0x34495b);
    this.mergeGroup(this.scene);
    this.player = this.character(0xc4a060, false); this.scene.add(this.player);
    this.goalRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 48), new THREE.MeshBasicMaterial({ color: C.yellow, side: THREE.DoubleSide, transparent: true, opacity: .85, depthWrite: false })); this.goalRing.rotation.x = -Math.PI / 2; this.goalRing.position.y = .4; this.scene.add(this.goalRing);
    const markerRing = new THREE.Mesh(new THREE.RingGeometry(.6,.7,32), new THREE.MeshBasicMaterial({ color: C.yellow, side: THREE.DoubleSide })); markerRing.rotation.x=-Math.PI/2; this.marker.add(markerRing); this.marker.position.y=.42; this.scene.add(this.marker);
    this.victim = this.character(0x6e7a88, false); this.victim.position.set(PLACES.target.x,.35,PLACES.target.z); this.scene.add(this.victim);
    this.victim2 = this.character(0x7f8471,false); this.victim2.position.set(PLACES.second.x,.35,PLACES.second.z); this.scene.add(this.victim2); this.victim2.visible=false;
    this.quality = 'WebGL'; this.resize(); window.addEventListener('resize', () => this.resize());
  }
  box(parent: THREE.Object3D, x:number,y:number,z:number,w:number,h:number,d:number,color:number, emissive=0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.88,emissive,emissiveIntensity:emissive? .6:0})); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  building(b: typeof BUILDINGS[number]) {
    const g = new THREE.Group(); g.position.set(b.x,.35,b.z); this.scene.add(g); this.buildingGroups.push(g);
    this.box(g,0,b.h/2,0,b.w,b.h,b.d,b.color);
    this.box(g,0,.4,0,b.w+.12,.8,b.d+.12,0x6c7472);
    this.box(g,0,b.h,0,b.w+.6,.3,b.d+.6,C.trim);
    this.box(g,0,b.h+.3,0,b.w,.45,b.d,C.roof);
    this.box(g,0,b.h+.65,-b.d/2+.15,b.w,.75,.3,b.color);
    this.box(g,-b.w/2+.15,b.h+.65,0,.3,.75,b.d,b.color);
    this.box(g,b.w/2-.15,b.h+.65,0,.3,.75,b.d,b.color);
    this.box(g,0,b.h+.65,b.d/2-.15,b.w,.75,.3,b.color);
    const brickGeos: THREE.BufferGeometry[] = [];
    for(let row=1;row<Math.floor(b.h/.45);row++) for(let col=0;col<Math.floor(b.w/1.2);col++) {
      const x=-b.w/2+.5+col*1.2+(row%2)*.5;
      if(x>b.w/2-.3) continue;
      const geo=new THREE.BoxGeometry(.92,.27,.055); geo.translate(x,row*.45,b.d/2+.04); brickGeos.push(geo);
    }
    for(let row=1;row<Math.floor(b.h/.45);row++) for(let col=0;col<Math.floor(b.d/1.2);col++) {
      const geo=new THREE.BoxGeometry(.055,.27,.9);geo.translate(b.w/2+.04,row*.45,-b.d/2+.6+col*1.2+(row%2)*.25);brickGeos.push(geo);
    }
    const bricks = new THREE.Mesh(mergeGeometries(brickGeos),new THREE.MeshStandardMaterial({color:new THREE.Color(b.color).multiplyScalar(1.12),roughness:1}));g.add(bricks); brickGeos.forEach(x=>x.dispose());
    for(let x=-b.w/2+2;x<b.w/2-1;x+=3) for(let y=2.3;y<b.h-1;y+=2.8) {
      this.box(g,x,y,b.d/2+.09,1.5,1.9,.15,0x2d3d49);
      this.box(g,x,y+.05,b.d/2+.19,1.18,1.57,.06,0xd8b475,0xb9823f);
      this.box(g,x,y,b.d/2+.25,.07,1.6,.06,C.navy);
      this.box(g,x,y-.05,b.d/2+.25,1.2,.08,.06,C.navy);
      this.box(g,x,y-1,b.d/2+.25,1.7,.15,.35,C.trim);
    }
    for(let z=-b.d/2+2;z<b.d/2-1;z+=3) for(let y=2.5;y<b.h-1;y+=2.8) {
      this.box(g,b.w/2+.12,y,z,.14,1.6,1.25,C.navy); this.box(g,b.w/2+.21,y,z,.06,1.3,.95,0xc1a978,0x82602f);
      this.box(g,b.w/2+.24,y,z,.04,.07,1.05,C.navy);
    }
    // Shop-front window frames and canvas awning break up the modular facade.
    this.box(g,0,1.25,b.d/2+.2,1.6,2.5,.22,C.navy); this.box(g,.48,1.2,b.d/2+.35,.08,.5,.1,C.yellow);
    if(b.name==='MERCER PAWN'||b.name==='HARBOR STORES'||b.name==='THE LANTERN') {
      this.box(g,0,3,b.d/2+.75,b.w-1,.25,1.8,0x3b6162);
      for(let i=0;i<Math.floor(b.w);i+=2) this.box(g,-b.w/2+1+i,2.85,b.d/2+1.5,1,.4,.16,0xa9ac8f);
    }
    this.sign(b.name,b.x,4.1,b.z+b.d/2+.33,b.w-2,.8,b.name==='FORENSICS'?'#e7ede4':'#e8ce9a',false,g);
    // The text helper accepts world coordinates and corrects for this parent.
    this.box(g,-b.w/2+2,b.h+1.1,-2,2.1,1.3,2.2,0x7b8785);
    for(let i=0;i<5;i++) this.box(g,-b.w/2+1.15+i*.38,b.h+1.78,-2,.1,.04,1.8,0x455760);
    this.box(g,b.w/2-2,b.h+1.45,-b.d/2+2,.9,2.3,.9,0x78594e);
    this.box(g,b.w/2-2,b.h+2.66,-b.d/2+2,1.2,.2,1.2,C.trim);
    this.box(g,-b.w/2+.1,b.h/2,b.d/2+.22,.13,b.h,.15,C.navy);
    // One batch per material family keeps brickwork cheap on mobile.
    this.mergeGroup(g);
  }
  mergeGroup(g:THREE.Object3D) {
    const groups=new Map<string,{mat:THREE.Material; geos:THREE.BufferGeometry[]; meshes:THREE.Mesh[]}>();
    for(const obj of [...g.children]) if(obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      obj.updateMatrix();const m=obj.material;const key=m.color.getHex()+':'+m.emissive.getHex();
      if(!groups.has(key))groups.set(key,{mat:m,geos:[],meshes:[]});const entry=groups.get(key)!;entry.geos.push(obj.geometry.clone().applyMatrix4(obj.matrix));entry.meshes.push(obj);
    }
    for(const e of groups.values()) { const merged=new THREE.Mesh(mergeGeometries(e.geos),e.mat);merged.castShadow=true;merged.receiveShadow=true; for(const m of e.meshes){g.remove(m);m.geometry.dispose();}e.geos.forEach(x=>x.dispose());g.add(merged); }
  }
  sign(text:string,x:number,y:number,z:number,w:number,h:number,color:string,flat=false,parent:THREE.Object3D=this.scene) {
    const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,1024,128);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 78px sans-serif';ctx.fillText(text,512,67,1000);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace; const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));mesh.position.set(x-parent.position.x,y-parent.position.y,z-parent.position.z);if(flat)mesh.rotation.x=-Math.PI/2;parent.add(mesh);return mesh;
  }
  tree(x:number,z:number,h:number) {
    const g=new THREE.Group();g.position.set(x,.3,z);this.scene.add(g);this.box(g,0,h*.4,0,.3,h*.8,.3,0x696353);
    for(let i=0;i<3;i++){const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(h*(.37-i*.055),0),new THREE.MeshStandardMaterial({color:[0x536f62,0x638072,0x7a9071][i],flatShading:true,roughness:1}));leaf.position.set(i===1?.45:-.13,h*.68+i*.48,i===1?.2:0);leaf.castShadow=true;g.add(leaf);}
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.8,1,.18,8),new THREE.MeshStandardMaterial({color:0x607164}));g.add(base);
  }
  lamp(x:number,z:number) {this.box(this.scene,x,2.3,z,.13,4.1,.13,C.navy);this.box(this.scene,x,4.4,z,.85,.18,.65,C.navy);this.box(this.scene,x,4.18,z,.6,.35,.45,0xe9cc88,0xf5b74f);this.box(this.scene,x,.55,z,.45,.45,.45,C.navy);}
  bench(x:number,z:number) {for(let i=0;i<3;i++){this.box(this.scene,x,.9,z+i*.18,2,.13,.13,0x9b8566);this.box(this.scene,x,1.3+i*.18,z+.5,2,.12,.12,0x9b8566);}for(const dx of [-.7,.7])this.box(this.scene,x+dx,.65,z+.25,.1,.6,.6,C.navy);}
  dumpster() {const {x,z}=PLACES.dumpster;this.box(this.scene,x,1,z,1.8,1.3,2.2,0x45645c);this.box(this.scene,x,1.7,z,2,.16,2.3,0x304b49);for(const dz of [-.6,.6])this.box(this.scene,x+.95,1,z+dz,.08,.6,.16,0x819187);this.box(this.scene,x,.35,z,1.9,.25,1.8,C.navy);this.sign('17',x,1.15,z+1.12,.5,.4,'#c2bca0');}
  payphone(){const {x,z}=PLACES.contract;this.box(this.scene,x,.85,z,.22,1.4,.22,C.navy);this.box(this.scene,x,1.85,z,.8,1.2,.65,C.yellow);this.box(this.scene,x,1.9,z+.35,.55,.7,.07,C.navy);this.box(this.scene,x-.15,1.92,z+.43,.12,.44,.09,0xc6c9b6);}
  crate(){const {x,z}=PLACES.stolen;this.box(this.scene,x,.65,z,1.3,.8,1.3,0x9e8c6e);for(const dz of [-.4,.4])this.box(this.scene,x,.7,z+dz,1.35,.9,.09,0x566060);}
  car(x:number,z:number,color:number){const g=new THREE.Group();g.position.set(x,.45,z);this.scene.add(g);this.box(g,0,.4,0,3.5,.65,1.55,color);this.box(g,-.2,1,0,1.7,.65,1.35,color);this.box(g,-.2,1.05,.69,1.3,.42,.03,0x97a9a4);this.box(g,1.4,.65,.66,.38,.17,.12,0xefdda2,0xa18042);for(const dx of [-1.1,1.1])for(const dz of [-.77,.77]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.17,12),new THREE.MeshStandardMaterial({color:0x233342}));wheel.rotation.x=Math.PI/2;wheel.position.set(dx,.22,dz);g.add(wheel);}this.mergeGroup(g);}
  character(color:number,hat:boolean){const g=new THREE.Group(); const body=this.box(g,0,1.12,0,.5,.68,.32,color);body.name='body';
    this.box(g,0,1.67,0,.35,.39,.34,0xc6aa8c);this.box(g,0,1.9,-.015,.38,.12,.35,0x3a3b3a);
    if(hat)this.box(g,0,1.96,.06,.5,.09,.48,0x3d515d);
    for(const s of [-1,1]){const leg=new THREE.Group();leg.position.set(s*.145,.82,0);leg.name=s<0?'legL':'legR';this.box(leg,0,-.32,0,.19,.64,.22,C.navy);this.box(leg,0,-.65,.07,.21,.13,.35,0x293a43);g.add(leg);const arm=new THREE.Group();arm.position.set(s*.34,1.35,0);arm.name=s<0?'armL':'armR';this.box(arm,0,-.24,0,.17,.5,.19,color);this.box(arm,0,-.51,0,.16,.13,.18,0xc6aa8c);g.add(arm);}
    const ring=new THREE.Mesh(new THREE.RingGeometry(.43,.51,24),new THREE.MeshBasicMaterial({color:C.yellow,side:THREE.DoubleSide,transparent:true,opacity:.8}));ring.rotation.x=-Math.PI/2;ring.position.y=.04;ring.name='ring';g.add(ring);return g;}
  animatePerson(g:THREE.Group,pos:Vec,moving:boolean,t:number,facing?:number){g.position.set(pos.x,.4,pos.z);if(facing!==undefined)g.rotation.y=facing;const a=moving?Math.sin(t*10)*.55:0;for(const [name,mul] of [['legL',1],['legR',-1],['armL',-1],['armR',1]] as [string,number][])g.getObjectByName(name)!.rotation.x=a*mul;g.position.y+=moving?Math.abs(Math.sin(t*10))*.025:0;}
  resize(){const width=this.canvas.clientWidth,height=this.canvas.clientHeight;this.renderer.setSize(width,height,false);const aspect=width/height;const size=aspect<1?32:25;this.camera.left=-size*aspect/2;this.camera.right=size*aspect/2;this.camera.top=size/2;this.camera.bottom=-size/2;this.camera.near=.1;this.camera.far=180;this.camera.updateProjectionMatrix();}
  update(w:World,dt:number,moving:boolean,goal:Vec|undefined){
    this.elapsed+=dt;this.frames++;if(this.elapsed>=1){this.fps=this.frames/this.elapsed;this.elapsed=0;this.frames=0;}
    this.animatePerson(this.player,w.player,moving,w.playSeconds,w.facing);const body=this.player.getObjectByName('body') as THREE.Mesh;(body.material as THREE.MeshStandardMaterial).color.setHex(w.phase==='criminal'?0xc4a060:0x658b9c);
    this.target.lerp(new THREE.Vector3(w.player.x,0,w.player.z),1-Math.exp(-dt*4));this.camera.position.copy(this.target).add(new THREE.Vector3(31,38,40));this.camera.lookAt(this.target.x,1,this.target.z);
    this.goalRing.visible=!!goal;if(goal){this.goalRing.position.set(goal.x,.41,goal.z);this.goalRing.scale.setScalar(1+Math.sin(w.playSeconds*2)*.06);}
    for(const n of w.npcs){if(!this.people.has(n.id)){const p=this.character(({iris:0xa67b79,noah:0x788d81,mara:0xb57567,ada:0x70879a} as Record<string,number>)[n.id],true);p.getObjectByName('ring')!.visible=false;this.people.set(n.id,p);this.scene.add(p);}const p=this.people.get(n.id)!;const prev=this.last.get(n.id)||n.pos;const d=Math.hypot(n.pos.x-prev.x,n.pos.z-prev.z);this.animatePerson(p,n.pos,d>.0001,w.playSeconds, d>.0001?Math.atan2(n.pos.x-prev.x,n.pos.z-prev.z):undefined);this.last.set(n.id,{...n.pos});}
    if(w.crimeDone){this.victim.rotation.z=Math.PI/2;this.victim.position.y=.63;this.victim.getObjectByName('ring')!.visible=false;}
    this.victim2.visible=w.incidents.length>1;if(this.victim2.visible){this.victim2.rotation.z=Math.PI/2;this.victim2.position.y=.63;this.victim2.getObjectByName('ring')!.visible=false;}
    for(const i of w.items){if(!this.itemMeshes.has(i.id)){const g=new THREE.Group();if(i.kind==='pistol'){this.box(g,0,.12,0,.65,.16,.15,0x283c49);this.box(g,-.2,.07,.1,.17,.22,.3,0x6c5f51);}else this.box(g,0,.07,0,.2,.12,.1,0xdac481);const ring=new THREE.Mesh(new THREE.RingGeometry(.38,.47,24),new THREE.MeshBasicMaterial({color:C.yellow,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.02;g.add(ring);this.itemMeshes.set(i.id,g);this.scene.add(g);}const g=this.itemMeshes.get(i.id)!;g.visible=i.visible&&!i.holder&&!i.collected;g.position.set(i.pos.x,.42,i.pos.z);}
    // Fade the full building if it intersects the camera-to-player ray. No hidden avatar.
    const playerPoint=new THREE.Vector3(w.player.x,1.3,w.player.z);const cam=this.camera.position;
    this.buildingGroups.forEach((g,index)=>{const b=BUILDINGS[index];let occludes=false;for(let t=.03;t<.5;t+=.018){const x=playerPoint.x+(cam.x-playerPoint.x)*t,z=playerPoint.z+(cam.z-playerPoint.z)*t,y=playerPoint.y+(cam.y-playerPoint.y)*t;if(Math.abs(x-b.x)<b.w/2+.5&&Math.abs(z-b.z)<b.d/2+.5&&y<b.h+1)occludes=true;}
      for(const o of g.children)if(o instanceof THREE.Mesh){const m=o.material as THREE.Material;const wasTransparent=m.transparent;const target=occludes?.12:1;m.opacity+=(target-m.opacity)*Math.min(1,dt*8);m.transparent=m.opacity<.99||m instanceof THREE.MeshBasicMaterial;m.depthWrite=m.opacity>.7;if(wasTransparent!==m.transparent)m.needsUpdate=true;if(o instanceof THREE.Mesh)o.castShadow=!occludes;}
    });
    this.drawMap(w,goal);this.renderer.render(this.scene,this.camera);
  }
  drawMap(w:World,goal?:Vec){const c=this.mapCanvas,ctx=c.getContext('2d')!;const s=c.width/76;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#203444';ctx.fillRect(0,0,c.width,c.height);const p=(v:Vec)=>({x:(v.x+38)*s,y:(v.z+32)*s});ctx.fillStyle='#466875';ctx.fillRect(68*s,0,8*s,c.height);ctx.strokeStyle='#6a7b80';ctx.lineWidth=6*s;ctx.beginPath();ctx.moveTo(4*s,32*s);ctx.lineTo(67*s,32*s);ctx.moveTo(43*s,4*s);ctx.lineTo(43*s,60*s);ctx.stroke();for(const b of BUILDINGS){ctx.fillStyle='#9b9281';ctx.fillRect((b.x+38-b.w/2)*s,(b.z+32-b.d/2)*s,b.w*s,b.d*s);}
    if(goal){const q=p(goal);ctx.strokeStyle='#edc46b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y,5,0,Math.PI*2);ctx.stroke();}
    for(const n of w.npcs){const q=p(n.pos);ctx.fillStyle='#bfc5b6';ctx.fillRect(q.x-1,q.y-1,2,2);}
    for(const i of w.incidents)if(i.discovered){const q=p(i.pos);ctx.fillStyle='#d3917c';ctx.beginPath();ctx.arc(q.x,q.y,3,0,Math.PI*2);ctx.fill();}
    const q=p(w.player);ctx.fillStyle='#f5d57b';ctx.beginPath();ctx.arc(q.x,q.y,3.8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#1c2a35';ctx.lineWidth=1.5;ctx.stroke();
  }
  project(p:Vec){const v=new THREE.Vector3(p.x,2.8,p.z).project(this.camera);return{x:(v.x*.5+.5)*this.canvas.clientWidth,y:(-v.y*.5+.5)*this.canvas.clientHeight};}
}
