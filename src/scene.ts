import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { GalleryOptions, GalleryProfile, GallerySpot, GalleryState } from './gallery-types';

export type { GalleryState, GalleryPhase, GallerySpot, GalleryOptions, GalleryProfile } from './gallery-types';

// Every shape and surface in the gallery is authored here. Shared materials and
// merged static meshes make the little toy museum inexpensive to draw on phones.
const PALETTE = {
  plum: 0x4b355f, ink: 0x322841, violet: 0x8874b4, lilac: 0xc5b4df,
  lavender: 0xa592c8, pale: 0xe9dff4, cream: 0xffe9c9, ivory: 0xfff4df,
  peach: 0xeab998, coral: 0xe7897c, rust: 0xb95f6a, gold: 0xe7b563,
  goldLight: 0xffd58a, mint: 0x81b69d, leaf: 0x548d83, leafLight: 0xb5d7ac,
  teal: 0x397e81, blue: 0x6e82b2, night: 0x53618d, skin: 0xf2c4a4,
};
const DEFAULT_PROFILE: GalleryProfile = { fabric: 'coral', tread: 'dots', charm: 'star' };
const FABRIC_COLORS = { coral: PALETTE.coral, mint: PALETTE.mint, violet: PALETTE.violet } as const;
// These are the six RELICS colors in the same order as the rules catalogue.
const RELIC_COLORS = [0xa9c8ff, 0xffd176, 0xbee29c, 0xf5adc2, 0xd0adff, 0xffbb97] as const;

const SPOTS: Record<GallerySpot, { anchor: readonly number[]; walk: readonly number[] }> = {
  window: { anchor: [-2.55, 1.47, -2.97], walk: [-2.4, 0.1, -2.22] },
  door: { anchor: [0.85, 1.38, -3.02], walk: [0.85, 0.1, -2.43] },
  terrace: { anchor: [4.40, 0.70, 1.66], walk: [3.65, 0.1, 1.72] },
  pedestal: { anchor: [-0.1, 1.92, -0.1], walk: [0.35, 0.1, 0.93] },
  planter: { anchor: [-2.99, 1.00, 1.83], walk: [-2.18, 0.1, 1.79] },
  bench: { anchor: [0.22, 0.82, 2.69], walk: [0.67, 0.1, 3.12] },
  clock: { anchor: [3.14, 1.63, -1.18], walk: [2.7, 0.1, -0.49] },
};

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

function archShape(width: number, height: number): THREE.Shape {
  const r = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, height - r);
  shape.absarc(0, height - r, r, 0, Math.PI, false); shape.lineTo(-r, 0);
  return shape;
}

function archHole(cx: number, bottom: number, width: number, height: number): THREE.Path {
  const r = width / 2;
  const path = new THREE.Path();
  path.moveTo(cx - r, bottom); path.lineTo(cx - r, bottom + height - r);
  path.absarc(cx, bottom + height - r, r, Math.PI, 0, true);
  path.lineTo(cx + r, bottom); path.lineTo(cx - r, bottom);
  return path;
}

function starShape(points = 5, outer = 0.3, inner = 0.14): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const a = Math.PI / 2 + i * Math.PI / points;
    const r = i % 2 === 0 ? outer : inner;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath(); return shape;
}

interface Character {
  root: THREE.Group; body: THREE.Group; legs: THREE.Group[]; arms: THREE.Group[];
  thiefHat: THREE.Group; detectiveHat: THREE.Group; mask: THREE.Group;
  coat: THREE.MeshStandardMaterial; scarf: THREE.MeshStandardMaterial; bag: THREE.Group; glass: THREE.Group;
}

interface Clue {
  root: THREE.Group; halo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
}

export class Gallery {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-8, 8, 7, -7, 0.1, 100);
  readonly canvas: HTMLCanvasElement;
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly staticRoot = new THREE.Group();
  private readonly materialsToDispose = new Set<THREE.Material>();
  private readonly texturesToDispose = new Set<THREE.Texture>();
  private readonly temp = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();
  private readonly dummy = new THREE.Object3D();
  private readonly destination = new THREE.Vector3(3.8, 0.1, 2.8);
  private readonly clueRoot = new THREE.Group();
  private readonly clues = new Map<string, Clue>();
  private readonly treadVariants = new Map<GalleryProfile['tread'], THREE.Group>();
  private readonly charmVariants = new Map<GalleryProfile['charm'], THREE.Group>();
  private threadMaterial: THREE.MeshStandardMaterial | null = null;
  private readonly relicRoot = new THREE.Group();
  private readonly relics: THREE.Group[] = [];
  private readonly character: Character;
  private readonly pendulum = new THREE.Group();
  private readonly focusRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly particles: THREE.InstancedMesh;
  private readonly particleMaterial: THREE.MeshBasicMaterial;
  private readonly particlePositions = new Float32Array(90);
  private readonly particleVelocities = new Float32Array(90);
  private readonly sun: THREE.DirectionalLight;
  private readonly hemisphere: THREE.HemisphereLight;
  private state: GalleryState = { phase: 'intro', entry: null, stash: null, found: [], relic: 0, profile: DEFAULT_PROFILE };
  private elapsed = 0;
  private particleAge = 2;
  private reducedMotion = false;
  private width = 1;
  private height = 1;
  private contextLost = false;
  private disposed = false;
  private focused: GallerySpot | null = null;
  private readonly lostHandler: (event: Event) => void;

  constructor(canvas: HTMLCanvasElement, options: GalleryOptions = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = false;
    this.hemisphere = new THREE.HemisphereLight(0xfff5e8, 0x8c7599, 2.9);
    this.sun = new THREE.DirectionalLight(0xffe4bc, 3.15);
    this.sun.position.set(-5, 9, 7);
    const fill = new THREE.DirectionalLight(0xc9d8ff, 1.1); fill.position.set(6, 6, -5);
    this.scene.add(this.hemisphere, this.sun, fill, this.staticRoot, this.clueRoot, this.relicRoot);
    this.buildRoom();
    this.buildFurniture();
    this.buildRelics();
    this.mergeStatic(this.staticRoot);
    this.scene.add(this.pendulum);
    this.character = this.makeCharacter();
    this.character.root.position.copy(this.destination);
    this.character.root.rotation.y = 0.35;
    this.scene.add(this.character.root);
    this.buildClues();
    this.focusRing = new THREE.Mesh(new THREE.RingGeometry(0.51, 0.58, 48), new THREE.MeshBasicMaterial({ color: PALETTE.goldLight, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
    this.focusRing.rotation.x = -Math.PI / 2; this.focusRing.visible = false;
    this.materialsToDispose.add(this.focusRing.material); this.scene.add(this.focusRing);
    this.particleMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.goldLight, transparent: true, opacity: 1 });
    this.materialsToDispose.add(this.particleMaterial);
    this.particles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.052, 0), this.particleMaterial, 30);
    this.particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particles.frustumCulled = false; this.particles.visible = false; this.scene.add(this.particles);
    this.camera.position.set(10, 17.4, 19);
    this.camera.lookAt(0, 1.3, 0);
    this.camera.updateMatrixWorld();
    this.lostHandler = (event: Event) => {
      event.preventDefault(); this.contextLost = true; options.onContextLost?.();
    };
    canvas.addEventListener('webglcontextlost', this.lostHandler);
    this.resize(); this.setState(this.state); this.render(0);
  }

  private material(color: number, kind: 'matte' | 'metal' | 'glow' = 'matte'): THREE.MeshStandardMaterial {
    const key = `${color}:${kind}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: kind === 'metal' ? 0.35 : 0.78, metalness: kind === 'metal' ? 0.42 : 0 });
      if (kind === 'glow') { material.emissive.setHex(color); material.emissiveIntensity = 0.25; }
      this.materials.set(key, material); this.materialsToDispose.add(material);
    }
    return material;
  }

  private mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, kind: 'matte' | 'metal' | 'glow' = 'matte'): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, this.material(color, kind));
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }

  private rounded(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, radius: number, color: number, kind: 'matte' | 'metal' = 'matte'): THREE.Mesh {
    return this.mesh(parent, new RoundedBoxGeometry(w, h, d, radius <= 0.08 ? 1 : 2, Math.min(radius, w / 2, h / 2, d / 2)), color, x, y, z, kind);
  }

  private cylinder(parent: THREE.Object3D, x: number, y: number, z: number, top: number, bottom: number, h: number, color: number, sides = 24, kind: 'matte' | 'metal' | 'glow' = 'matte'): THREE.Mesh {
    return this.mesh(parent, new THREE.CylinderGeometry(top, bottom, h, sides), color, x, y, z, kind);
  }

  private ball(parent: THREE.Object3D, x: number, y: number, z: number, r: number, color: number, sx = 1, sy = 1, sz = 1, kind: 'matte' | 'metal' | 'glow' = 'matte'): THREE.Mesh {
    const sphere = this.mesh(parent, new THREE.SphereGeometry(r, 12, 8), color, x, y, z, kind);
    sphere.scale.set(sx, sy, sz); return sphere;
  }

  private ring(parent: THREE.Object3D, x: number, y: number, z: number, radius: number, tube: number, color: number, floor = true): THREE.Mesh {
    const ring = this.mesh(parent, new THREE.TorusGeometry(radius, tube, 5, 32), color, x, y, z, 'metal');
    if (floor) ring.rotation.x = Math.PI / 2; return ring;
  }

  private extruded(parent: THREE.Object3D, shape: THREE.Shape, depth: number, color: number, x = 0, y = 0, z = 0, bevel = 0.035): THREE.Mesh {
    return this.mesh(parent, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1, curveSegments: 20 }), color, x, y, z);
  }

  private line(parent: THREE.Object3D, points: THREE.Vector3[], r: number, color: number, kind: 'matte' | 'metal' = 'matte'): THREE.Mesh {
    return this.mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(5, points.length * 3), r, 5, false), color, 0, 0, 0, kind);
  }

  private archFrame(parent: THREE.Object3D, x: number, y: number, z: number, width: number, height: number, color: number, thickness = 0.14, depth = 0.12): THREE.Mesh {
    const outer = archShape(width, height);
    outer.holes.push(archHole(0, thickness, width - thickness * 2, height - thickness * 2));
    return this.extruded(parent, outer, depth, color, x, y, z, 0.025);
  }

  private shadow(x: number, z: number, width: number, depth: number, opacity = 0.18, y = 0.095): void {
    let texture = Array.from(this.texturesToDispose)[0];
    if (!texture) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(46,24,66,0.55)'); gradient.addColorStop(0.45, 'rgba(46,24,66,0.34)'); gradient.addColorStop(1, 'rgba(46,24,66,0)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
      texture = new THREE.CanvasTexture(canvas); this.texturesToDispose.add(texture);
    }
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false });
    this.materialsToDispose.add(material);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); mesh.renderOrder = 1; this.scene.add(mesh);
  }

  private buildRoom(): void {
    const g = this.staticRoot;
    this.shadow(0.3, 0.1, 13.5, 10.5, 0.34, -0.51);
    this.rounded(g, 0, -0.24, 0, 8.8, 0.53, 7.5, 0.19, PALETTE.plum);
    this.rounded(g, 0, -0.03, 0, 8.58, 0.13, 7.3, 0.07, PALETTE.gold);
    this.rounded(g, 0, 0.03, 0, 8.44, 0.13, 7.16, 0.08, PALETTE.peach);
    // The floor is an intentionally large, legible checkerboard in warm stone.
    for (let ix = 0; ix < 12; ix++) for (let iz = 0; iz < 10; iz++) {
      const tile = this.mesh(g, new THREE.BoxGeometry(0.675, 0.025, 0.687), (ix + iz) % 2 ? PALETTE.cream : PALETTE.peach,
        -3.713 + ix * 0.675, 0.105, -3.092 + iz * 0.687);
      tile.position.x -= 0.005;
    }
    for (const z of [-3.52, 3.52]) this.rounded(g, 0, 0.135, z, 8.35, 0.055, 0.09, 0.022, PALETTE.gold);
    for (const x of [-4.12, 4.12]) this.rounded(g, x, 0.135, 0, 0.09, 0.055, 7.1, 0.022, PALETTE.gold);
    const wall = new THREE.Shape(); wall.moveTo(-4.28, 0.1); wall.lineTo(4.28, 0.1); wall.lineTo(4.28, 4.46); wall.lineTo(-4.28, 4.46); wall.closePath();
    wall.holes.push(archHole(-2.55, 1.15, 1.85, 2.65));
    wall.holes.push(archHole(0.85, 0.18, 1.85, 3.65));
    this.extruded(g, wall, 0.23, PALETTE.lilac, 0, 0, -3.65, 0.055);
    this.rounded(g, 0, 4.51, -3.57, 8.8, 0.17, 0.43, 0.05, PALETTE.pale);
    this.rounded(g, 0, 4.33, -3.40, 8.62, 0.075, 0.085, 0.03, PALETTE.gold);
    this.rounded(g, 0, 0.34, -3.39, 8.6, 0.4, 0.13, 0.03, PALETTE.lavender);
    this.rounded(g, 0, 0.57, -3.30, 8.6, 0.075, 0.14, 0.026, PALETTE.pale);
    // Side wall slopes down into the cutaway so foreground clues stay visible.
    const side = new THREE.Shape(); side.moveTo(-3.57, 0.08); side.lineTo(3.52, 0.08); side.lineTo(3.52, 0.55);
    side.lineTo(2.00, 1.70); side.lineTo(1.15, 3.70); side.lineTo(-3.57, 4.46); side.closePath();
    const leftWall = this.extruded(g, side, 0.22, PALETTE.lavender, -4.33, 0, 0, 0.055); leftWall.rotation.y = -Math.PI / 2;
    this.rounded(g, -4.17, 0.34, 0, 0.18, 0.42, 7.2, 0.035, PALETTE.violet);
    this.rounded(g, -4.08, 0.59, 0, 0.15, 0.08, 7.12, 0.025, PALETTE.pale);
    for (let i = 0; i < 6; i++) {
      const ornament = this.mesh(g, new THREE.OctahedronGeometry(0.10, 0), PALETTE.gold, -3.5 + i * 1.39, 4.08, -3.34, 'metal');
      ornament.scale.set(0.8, 1.25, 0.4);
    }
    this.window(g); this.door(g); this.terrace(g);
    // Small golden corner feet make the whole museum feel like a crafted toy.
    for (const x of [-3.85, 3.85]) for (const z of [-3.1, 3.1]) this.ball(g, x, -0.45, z, 0.15, PALETTE.gold, 1.3, 0.55, 1.3, 'metal');
    this.cylinder(g, -0.1, 0.138, 0, 1.48, 1.48, 0.025, PALETTE.coral, 64);
    this.ring(g, -0.1, 0.16, 0, 1.36, 0.025, PALETTE.goldLight);
    this.ring(g, -0.1, 0.16, 0, 1.45, 0.012, PALETTE.cream);
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16;
      this.ball(g, -0.1 + Math.cos(a) * 1.22, 0.159, Math.sin(a) * 1.22, 0.028, PALETTE.cream, 1, 0.25, 1);
    }
  }

  private window(g: THREE.Group): void {
    this.extruded(g, archShape(1.82, 2.65), 0.025, PALETTE.night, -2.55, 1.15, -3.76, 0);
    this.archFrame(g, -2.55, 1.07, -3.39, 2.15, 2.88, PALETTE.pale, 0.14, 0.1);
    this.archFrame(g, -2.55, 1.12, -3.26, 1.93, 2.70, PALETTE.gold, 0.052, 0.02);
    const moon = this.ball(g, -2.80, 3.12, -3.63, 0.28, PALETTE.cream, 1, 1, 0.055, 'glow');
    const cut = this.ball(g, -2.65, 3.22, -3.60, 0.245, PALETTE.night, 1, 1, 0.055);
    moon.rotation.z = -0.2; cut.rotation.z = -0.2;
    for (const [x, y, r] of [[-2.02, 2.92, 0.039], [-3.05, 2.57, 0.04], [-2.20, 3.50, 0.026], [-2.11, 2.31, 0.028]]) this.ball(g, x, y, -3.61, r, PALETTE.cream, 1, 1, 0.1, 'glow');
    this.rounded(g, -2.55, 1.10, -3.22, 2.30, 0.15, 0.59, 0.06, PALETTE.cream);
    this.rounded(g, -2.55, 1.02, -3.31, 1.94, 0.10, 0.33, 0.035, PALETTE.gold);
    for (const side of [-1, 1]) {
      const shutter = new THREE.Group(); shutter.position.set(-2.55 + side * 1.03, 1.25, -3.18); shutter.rotation.y = side * 0.65; g.add(shutter);
      this.rounded(shutter, side * 0.28, 1.02, 0, 0.63, 2.14, 0.10, 0.055, PALETTE.teal);
      for (let i = 0; i < 7; i++) this.rounded(shutter, side * 0.28, 0.23 + i * 0.24, 0.065, 0.44, 0.08, 0.065, 0.022, PALETTE.mint);
      this.ball(shutter, side * 0.44, 0.91, 0.11, 0.035, PALETTE.gold, 1, 1, 1, 'metal');
    }
    // Deliberate, quiet moonlight on the gallery floor.
    const light = new THREE.Shape(); light.moveTo(-3.16, -2.97); light.lineTo(-1.79, -2.97); light.lineTo(0.25, -0.70); light.lineTo(-1.88, -0.30); light.closePath();
    const geo = new THREE.ShapeGeometry(light); geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    this.materialsToDispose.add(mat); const beam = new THREE.Mesh(geo, mat); beam.position.y = 0.146; this.scene.add(beam);
  }

  private door(g: THREE.Group): void {
    this.extruded(g, archShape(1.88, 3.65), 0.1, PALETTE.plum, 0.85, 0.18, -3.65, 0.025);
    this.archFrame(g, 0.85, 0.15, -3.39, 2.18, 3.92, PALETTE.pale, 0.16, 0.10);
    this.archFrame(g, 0.85, 0.21, -3.26, 1.90, 3.64, PALETTE.gold, 0.043, 0.03);
    for (const x of [-0.37, 0.37]) {
      this.rounded(g, 0.85 + x, 1.12, -3.40, 0.56, 1.34, 0.05, 0.06, PALETTE.violet);
      this.rounded(g, 0.85 + x, 2.36, -3.40, 0.56, 0.77, 0.05, 0.06, PALETTE.violet);
    }
    const fan = this.mesh(g, new THREE.CircleGeometry(0.45, 24), PALETTE.lilac, 0.85, 3.17, -3.35);
    fan.scale.y = 0.6;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * i / 4;
      this.line(g, [new THREE.Vector3(0.85, 3.0, -3.31), new THREE.Vector3(0.85 + Math.cos(a) * 0.43, 3.0 + Math.sin(a) * 0.39, -3.31)], 0.012, PALETTE.gold, 'metal');
    }
    this.rounded(g, 1.48, 1.55, -3.30, 0.12, 0.36, 0.085, 0.045, PALETTE.gold, 'metal');
    this.ball(g, 1.48, 1.56, -3.20, 0.07, PALETTE.goldLight, 1, 1, 0.8, 'metal');
    this.rounded(g, 0.85, 0.16, -2.99, 1.9, 0.09, 0.58, 0.045, PALETTE.cream);
    this.rounded(g, 0.85, 0.23, -2.62, 1.43, 0.045, 0.52, 0.1, PALETTE.teal);
    for (let i = 0; i < 7; i++) this.rounded(g, 0.31 + i * 0.18, 0.258, -2.62, 0.025, 0.007, 0.35, 0.003, PALETTE.mint);
    // Two miniature brass wall sconces.
    for (const x of [-0.64, 2.32]) {
      this.rounded(g, x, 2.6, -3.27, 0.12, 0.4, 0.11, 0.04, PALETTE.gold, 'metal');
      this.ball(g, x, 2.84, -3.11, 0.16, PALETTE.ivory, 0.9, 1.25, 0.9, 'glow');
      this.cylinder(g, x, 2.67, -3.11, 0.15, 0.10, 0.08, PALETTE.gold, 16, 'metal');
    }
  }

  private terrace(g: THREE.Group): void {
    for (let i = 0; i < 3; i++) {
      this.rounded(g, 4.25 + i * 0.42, -0.04 - i * 0.145, 1.72, 1.05, 0.27, 2.16, 0.15, PALETTE.plum);
      this.rounded(g, 4.25 + i * 0.42, 0.105 - i * 0.145, 1.72, 1.04, 0.055, 2.16, 0.13, PALETTE.cream);
    }
    const arch = new THREE.Group(); arch.position.set(4.15, 0.11, 1.72); arch.rotation.y = Math.PI / 2; g.add(arch);
    this.archFrame(arch, 0, 0, 0, 2.15, 2.58, PALETTE.pale, 0.13, 0.13);
    this.archFrame(arch, 0, 0.03, 0.16, 1.97, 2.43, PALETTE.gold, 0.038, 0.018);
    for (const z of [-2.95, -2.25, -1.55, -0.85, -0.15]) {
      this.cylinder(g, 4.14, 0.56, z, 0.058, 0.070, 0.82, PALETTE.gold, 12, 'metal');
      this.ball(g, 4.14, 1.01, z, 0.085, PALETTE.goldLight, 1, 1, 1, 'metal');
    }
    this.rounded(g, 4.14, 0.93, -1.55, 0.11, 0.09, 3.01, 0.03, PALETTE.pale);
    this.rounded(g, 4.14, 0.30, -1.55, 0.08, 0.06, 3.01, 0.02, PALETTE.pale);
    this.plant(g, 3.46, -2.66, 0.54, PALETTE.coral, 7, 0.78);
  }

  private buildFurniture(): void {
    const g = this.staticRoot;
    // Porcelain and brass display: a recognisable object, even once it is empty.
    this.cylinder(g, -0.1, 0.24, 0, 0.77, 0.85, 0.17, PALETTE.cream, 48);
    this.cylinder(g, -0.1, 0.37, 0, 0.69, 0.73, 0.09, PALETTE.gold, 48, 'metal');
    this.cylinder(g, -0.1, 0.87, 0, 0.58, 0.67, 0.93, PALETTE.ivory, 10);
    this.ring(g, -0.1, 0.55, 0, 0.642, 0.024, PALETTE.gold);
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10;
      this.cylinder(g, -0.1 + Math.sin(a) * 0.62, 0.85, Math.cos(a) * 0.62, 0.017, 0.017, 0.57, PALETTE.peach, 6);
    }
    this.cylinder(g, -0.1, 1.35, 0, 0.78, 0.67, 0.17, PALETTE.cream, 48);
    this.ring(g, -0.1, 1.42, 0, 0.72, 0.045, PALETTE.gold);
    this.ball(g, -0.1, 1.45, 0, 0.59, PALETTE.rust, 1, 0.16, 1);
    this.rounded(g, 0.04, 0.95, 0.611, 0.47, 0.24, 0.034, 0.018, PALETTE.gold, 'metal');
    const plaque = this.extruded(g, starShape(4, 0.063, 0.027), 0.004, PALETTE.plum, 0.04, 0.95, 0.635, 0.003); plaque.rotation.z = 0.15;
    this.shadow(-0.2, 0.26, 2.5, 1.9, 0.38, 0.17);
    this.bench(g); this.clock(g); this.plant(g, -3.0, 1.85, 0.84, PALETTE.coral, 13, 1.17);
    this.plant(g, -3.48, -2.27, 0.4, PALETTE.cream, 6, 0.6);
    this.picture(g, -4.065, 2.25, -0.45, 1.40, 1.82, 1, Math.PI / 2);
    this.picture(g, 3.14, 3.05, -3.26, 1.00, 1.26, 0);
    this.picture(g, -1.02, 3.05, -3.26, 0.47, 0.74, 2);
    // A little catalogue stand and reading lamp fill the gallery with purpose.
    const stand = new THREE.Group(); stand.position.set(-1.42, 0.17, -1.95); g.add(stand);
    this.cylinder(stand, 0, 0.08, 0, 0.32, 0.40, 0.12, PALETTE.gold, 20, 'metal');
    this.cylinder(stand, 0, 0.54, 0, 0.038, 0.051, 0.94, PALETTE.gold, 10, 'metal');
    const book = this.rounded(stand, 0, 1.06, 0, 0.64, 0.09, 0.47, 0.025, PALETTE.plum); book.rotation.x = 0.28;
    const pages = this.rounded(stand, 0, 1.12, 0.015, 0.57, 0.06, 0.42, 0.022, PALETTE.ivory); pages.rotation.x = 0.28;
    this.line(stand, [new THREE.Vector3(0.01, 1.16, -0.17), new THREE.Vector3(0.01, 1.22, 0.19)], 0.012, PALETTE.gold);
    // Tea and a pair of miniature collected curios, all original geometry.
    this.cylinder(g, -3.41, 0.28, -0.52, 0.43, 0.50, 0.19, PALETTE.gold, 16, 'metal');
    this.cylinder(g, -3.41, 0.74, -0.52, 0.04, 0.06, 0.77, PALETTE.plum, 12);
    this.cylinder(g, -3.41, 1.16, -0.52, 0.58, 0.56, 0.12, PALETTE.plum, 32);
    this.makeTeapot(g, -3.47, 1.24, -0.56, 0.42, PALETTE.mint);
    this.cylinder(g, -3.08, 1.25, -0.22, 0.13, 0.13, 0.026, PALETTE.gold, 24, 'metal');
    this.cylinder(g, -3.08, 1.34, -0.22, 0.07, 0.05, 0.14, PALETTE.cream, 16);
    this.shadow(-3.0, 1.88, 2.3, 1.8, 0.37);
    this.shadow(0.25, 2.64, 3.3, 1.65, 0.37);
    this.shadow(3.18, -1.20, 2.0, 1.55, 0.30);
  }

  private bench(g: THREE.Group): void {
    const b = new THREE.Group(); b.position.set(0.17, 0.16, 2.63); b.rotation.y = Math.PI; g.add(b);
    for (const x of [-0.87, 0.87]) for (const z of [-0.24, 0.24]) {
      const leg = this.cylinder(b, x, 0.2, z, 0.066, 0.047, 0.42, PALETTE.gold, 10, 'metal'); leg.rotation.z = x * -0.09;
      this.ball(b, x * 1.04, 0.035, z, 0.07, PALETTE.plum, 1, 0.55, 1);
    }
    this.rounded(b, 0, 0.44, 0, 2.14, 0.17, 0.89, 0.065, PALETTE.plum);
    this.rounded(b, 0, 0.57, 0, 1.97, 0.23, 0.83, 0.13, PALETTE.mint);
    this.rounded(b, 0, 1.03, 0.27, 1.98, 0.56, 0.22, 0.10, PALETTE.teal);
    this.rounded(b, 0, 1.07, 0.12, 1.79, 0.41, 0.11, 0.08, PALETTE.mint);
    for (const x of [-0.58, 0, 0.58]) this.ball(b, x, 1.09, 0.046, 0.035, PALETTE.cream, 1, 1, 0.35);
    for (const x of [-1.07, 1.07]) {
      this.cylinder(b, x, 0.68, 0, 0.055, 0.055, 0.47, PALETTE.gold, 10, 'metal');
      this.rounded(b, x, 0.95, 0, 0.19, 0.17, 0.89, 0.085, PALETTE.teal);
      this.ball(b, x, 0.89, -0.36, 0.095, PALETTE.goldLight, 0.8, 0.8, 0.8, 'metal');
    }
    const pillow = this.rounded(b, -0.62, 0.85, 0.0, 0.42, 0.44, 0.16, 0.08, PALETTE.coral); pillow.rotation.z = -0.22;
    this.ball(b, -0.62, 0.85, -0.092, 0.025, PALETTE.cream, 1, 1, 0.5);
  }

  private clock(g: THREE.Group): void {
    const c = new THREE.Group(); c.position.set(3.15, 0.18, -1.32); g.add(c);
    this.rounded(c, 0, 0.14, 0, 1.12, 0.22, 0.66, 0.075, PALETTE.plum);
    this.rounded(c, 0, 0.42, 0, 0.81, 0.37, 0.52, 0.07, PALETTE.violet);
    this.extruded(c, archShape(0.99, 2.32), 0.37, PALETTE.plum, 0, 0.34, -0.21, 0.08);
    this.extruded(c, archShape(0.79, 2.12), 0.03, PALETTE.lavender, 0, 0.43, 0.20, 0.035);
    this.rounded(c, 0, 1.11, 0.25, 0.35, 0.65, 0.035, 0.12, PALETTE.plum);
    const face = this.cylinder(c, 0, 1.99, 0.30, 0.365, 0.365, 0.025, PALETTE.cream, 48); face.rotation.x = Math.PI / 2;
    this.ring(c, 0, 1.99, 0.33, 0.383, 0.037, PALETTE.gold, false);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      const tick = this.rounded(c, Math.sin(a) * 0.282, 1.99 + Math.cos(a) * 0.282, 0.34, 0.025, i % 3 === 0 ? 0.075 : 0.042, 0.014, 0.005, PALETTE.plum); tick.rotation.z = -a;
    }
    const hour = this.rounded(c, 0.064, 2.04, 0.361, 0.18, 0.039, 0.018, 0.013, PALETTE.plum); hour.rotation.z = 0.57;
    const minute = this.rounded(c, -0.025, 2.105, 0.365, 0.026, 0.24, 0.019, 0.009, PALETTE.plum); minute.rotation.z = 0.2;
    this.ball(c, 0, 1.99, 0.383, 0.037, PALETTE.gold, 1, 1, 0.5, 'metal');
    this.ball(c, 0, 2.72, 0, 0.13, PALETTE.gold, 0.9, 1.1, 0.9, 'metal');
    this.pendulum.position.set(3.15, 1.64, -1.04);
    this.cylinder(this.pendulum, 0, -0.31, 0, 0.016, 0.016, 0.60, PALETTE.gold, 8, 'metal');
    this.ball(this.pendulum, 0, -0.62, 0, 0.11, PALETTE.goldLight, 1, 1, 0.24, 'metal');
  }

  private plant(parent: THREE.Object3D, x: number, z: number, size: number, color: number, leaves: number, height: number): void {
    const g = new THREE.Group(); g.position.set(x, 0.16, z); parent.add(g);
    const points = [new THREE.Vector2(size * 0.32, 0), new THREE.Vector2(size * 0.43, 0.05), new THREE.Vector2(size * 0.48, size * 0.17), new THREE.Vector2(size * 0.54, size * 0.54), new THREE.Vector2(size * 0.50, size * 0.66), new THREE.Vector2(size * 0.44, size * 0.68), new THREE.Vector2(size * 0.42, size * 0.58)];
    this.mesh(g, new THREE.LatheGeometry(points, 20), color);
    this.ring(g, 0, size * 0.59, 0, size * 0.5, size * 0.043, PALETTE.cream);
    this.cylinder(g, 0, size * 0.56, 0, size * 0.415, size * 0.415, size * 0.03, PALETTE.plum, 20);
    this.ring(g, 0, size * 0.14, 0, size * 0.43, size * 0.024, PALETTE.gold);
    for (let i = 0; i < leaves; i++) {
      const angle = i * 2.399;
      const reach = size * (0.33 + (i % 3) * 0.14);
      const h = height * (0.62 + (i % 4) * 0.13);
      const end = new THREE.Vector3(Math.cos(angle) * reach, size * 0.52 + h, Math.sin(angle) * reach);
      this.line(g, [new THREE.Vector3(0, size * 0.55, 0), new THREE.Vector3(end.x * 0.3, size * 0.55 + h * 0.65, end.z * 0.3), end], size * 0.014, PALETTE.leaf);
      const leaf = this.ball(g, end.x * 0.82, end.y - h * 0.12, end.z * 0.82, size * 0.37, [PALETTE.leaf, PALETTE.mint, PALETTE.leafLight][i % 3], 0.49, 1.12, 0.22);
      leaf.rotation.set(0.18 + Math.sin(angle) * 0.45, -angle, -Math.cos(angle) * 0.53);
      const mid = this.ball(g, end.x * 0.48, end.y - h * 0.46, end.z * 0.48, size * 0.25, [PALETTE.mint, PALETTE.leafLight][i % 2], 0.44, 1, 0.24);
      mid.rotation.set(-0.3, angle, Math.sin(angle) * 0.65);
    }
  }

  private picture(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, variant: number, rotation = 0): void {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotation; parent.add(g);
    this.rounded(g, 0, 0, 0, w + 0.15, h + 0.15, 0.12, 0.075, PALETTE.plum);
    this.rounded(g, 0, 0, 0.07, w + 0.075, h + 0.075, 0.055, 0.055, PALETTE.gold, 'metal');
    this.rounded(g, 0, 0, 0.109, w - 0.07, h - 0.07, 0.03, 0.018, PALETTE.cream);
    if (variant === 0) {
      const disc = this.mesh(g, new THREE.CircleGeometry(w * 0.27, 32), PALETTE.coral, 0, h * 0.17, 0.13); disc.scale.y = 0.91;
      this.rounded(g, 0, -h * 0.20, 0.143, w * 0.55, h * 0.21, 0.014, 0.028, PALETTE.teal);
      this.extruded(g, starShape(4, w * 0.10, w * 0.029), 0.013, PALETTE.gold, 0.23 * w, 0.13 * h, 0.156, 0.002);
    } else if (variant === 1) {
      const sun = this.mesh(g, new THREE.CircleGeometry(w * 0.23, 32), PALETTE.gold, -w * 0.13, h * 0.22, 0.13); sun.scale.y = 1;
      const hill = this.mesh(g, new THREE.CircleGeometry(w * 0.32, 32), PALETTE.violet, w * 0.14, -h * 0.07, 0.15); hill.scale.y = 1.37;
      const hill2 = this.mesh(g, new THREE.CircleGeometry(w * 0.30, 32), PALETTE.coral, -w * 0.19, -h * 0.21, 0.167); hill2.scale.y = 0.94;
      this.rounded(g, 0, -h * 0.34, 0.19, w * 0.78, h * 0.10, 0.025, 0.012, PALETTE.teal);
      this.line(g, [new THREE.Vector3(0.18, -0.48, 0.21), new THREE.Vector3(0.08, -0.09, 0.21), new THREE.Vector3(0.19, 0.37, 0.21)], 0.014, PALETTE.cream);
    } else {
      this.extruded(g, starShape(5, w * 0.29, w * 0.14), 0.025, PALETTE.gold, 0, h * 0.08, 0.15, 0.003);
      this.rounded(g, 0, -h * 0.27, 0.15, w * 0.52, 0.025, 0.025, 0.005, PALETTE.coral);
    }
  }

  private makeTeapot(parent: THREE.Object3D, x: number, y: number, z: number, scale: number, color: number): THREE.Group {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); parent.add(g);
    this.ball(g, 0, 0.26, 0, 0.35, color, 1.02, 0.86, 0.83);
    this.cylinder(g, 0, 0.052, 0, 0.23, 0.20, 0.09, PALETTE.gold, 20, 'metal');
    this.ball(g, 0, 0.52, 0, 0.24, color, 1, 0.23, 0.84);
    this.ball(g, 0, 0.60, 0, 0.075, PALETTE.gold, 0.9, 0.9, 0.9, 'metal');
    this.line(g, [new THREE.Vector3(0.22, 0.19, 0), new THREE.Vector3(0.46, 0.32, 0), new THREE.Vector3(0.56, 0.49, 0)], 0.085, color);
    this.line(g, [new THREE.Vector3(-0.2, 0.41, 0), new THREE.Vector3(-0.45, 0.45, 0), new THREE.Vector3(-0.5, 0.23, 0), new THREE.Vector3(-0.27, 0.11, 0)], 0.056, PALETTE.gold, 'metal');
    this.ball(g, 0, 0.27, 0.295, 0.065, PALETTE.cream, 1, 1, 0.15);
    return g;
  }

  private buildRelics(): void {
    this.relicRoot.position.set(-0.1, 1.91, 0);
    for (let i = 0; i < 6; i++) { const g = new THREE.Group(); this.relicRoot.add(g); this.relics.push(g); }
    const gem = this.mesh(this.relics[0], new THREE.OctahedronGeometry(0.40, 0), RELIC_COLORS[0], 0, 0.04, 0, 'metal'); gem.scale.set(0.90, 1.17, 0.90);
    this.ring(this.relics[0], 0, -0.05, 0, 0.27, 0.028, PALETTE.gold);
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4; this.ball(this.relics[0], Math.sin(a) * 0.27, -0.05, Math.cos(a) * 0.27, 0.047, PALETTE.gold, 1, 1, 1, 'metal'); }
    // Sunbird: wing, small beak, fine stand and swept tail give a clear silhouette.
    const bird = this.relics[1];
    this.ball(bird, 0, -0.005, 0, 0.25, RELIC_COLORS[1], 1.13, 0.82, 0.76, 'metal');
    this.ball(bird, 0.18, 0.21, 0, 0.16, RELIC_COLORS[1], 1, 1, 1, 'metal');
    const beak = this.mesh(bird, new THREE.ConeGeometry(0.062, 0.19, 5), PALETTE.coral, 0.365, 0.21, 0); beak.rotation.z = -Math.PI / 2;
    this.ball(bird, 0.219, 0.238, 0.14, 0.025, PALETTE.plum, 1, 1, 0.5);
    const wing = this.ball(bird, -0.08, 0.10, 0.17, 0.25, PALETTE.coral, 0.9, 0.6, 0.20); wing.rotation.z = 0.3;
    const tail = this.mesh(bird, new THREE.ConeGeometry(0.17, 0.40, 4), RELIC_COLORS[1], -0.30, 0.05, 0, 'metal'); tail.rotation.z = Math.PI / 2 + 0.4;
    this.cylinder(bird, 0, -0.24, 0, 0.029, 0.029, 0.16, PALETTE.gold, 8, 'metal');
    this.cylinder(bird, 0, -0.33, 0, 0.19, 0.23, 0.06, PALETTE.plum, 24);
    const pear = this.relics[2];
    this.ball(pear, 0, -0.05, 0, 0.28, RELIC_COLORS[2], 1.05, 1.0, 1.0, 'metal');
    this.ball(pear, 0.025, 0.19, 0, 0.18, RELIC_COLORS[2], 0.83, 1.21, 0.81, 'metal');
    this.line(pear, [new THREE.Vector3(0.02, 0.32, 0), new THREE.Vector3(0.03, 0.46, 0), new THREE.Vector3(0.10, 0.50, 0)], 0.027, PALETTE.plum);
    const leaf = this.ball(pear, 0.16, 0.39, 0, 0.12, PALETTE.mint, 1.3, 0.40, 0.42); leaf.rotation.z = 0.38;
    this.makeTeapot(this.relics[3], 0, -0.31, 0, 0.85, RELIC_COLORS[3]);
    const comet = this.relics[4];
    this.extruded(comet, starShape(5, 0.34, 0.17), 0.16, RELIC_COLORS[4], 0.07, 0.04, -0.06, 0.018);
    this.line(comet, [new THREE.Vector3(-0.11, -0.10, -0.01), new THREE.Vector3(-0.28, -0.24, -0.02), new THREE.Vector3(-0.48, -0.18, -0.02)], 0.064, PALETTE.coral);
    this.line(comet, [new THREE.Vector3(-0.11, -0.17, -0.04), new THREE.Vector3(-0.29, -0.34, -0.02), new THREE.Vector3(-0.41, -0.29, -0.02)], 0.034, PALETTE.gold);
    const shell = this.relics[5];
    for (let i = 0; i < 7; i++) {
      const angle = (i - 3) * 0.23;
      const rib = this.ball(shell, Math.sin(angle) * 0.15, Math.cos(angle) * 0.18 - 0.07, 0, 0.24, i % 2 ? PALETTE.cream : RELIC_COLORS[5], 0.35, 1.25, 0.58); rib.rotation.z = -angle;
    }
    this.ball(shell, 0, -0.19, 0.10, 0.10, PALETTE.gold, 1.5, 0.57, 0.6, 'metal');
    this.ball(shell, 0, -0.04, 0.15, 0.086, PALETTE.ivory, 1, 1, 1, 'glow');
    for (const relic of this.relics) this.mergeStatic(relic);
  }

  private makeCharacter(): Character {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const coat = new THREE.MeshStandardMaterial({ color: PALETTE.coral, roughness: 0.8 }); this.materialsToDispose.add(coat);
    const scarfMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.coral, roughness: 0.85 }); this.materialsToDispose.add(scarfMaterial);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.27, 4, 12), coat); torso.position.y = 0.64; torso.scale.z = 0.88; body.add(torso);
    this.ball(body, 0, 1.08, 0, 0.233, PALETTE.skin, 0.98, 1.04, 0.96);
    this.ball(body, 0, 1.055, 0.207, 0.066, PALETTE.skin, 0.55, 0.55, 0.9);
    for (const x of [-0.23, 0.23]) this.ball(body, x, 1.06, 0, 0.051, PALETTE.skin, 0.7, 1, 0.8);
    for (const x of [-0.077, 0.077]) this.ball(body, x, 1.10, 0.205, 0.028, PALETTE.plum, 0.64, 0.88, 0.53);
    const scarf = this.ring(body, 0, 0.90, 0, 0.175, 0.058, PALETTE.cream); scarf.scale.z = 0.9; scarf.material = scarfMaterial;
    const scarfTail = this.rounded(body, 0.14, 0.76, -0.12, 0.09, 0.31, 0.10, 0.035, PALETTE.cream); scarfTail.rotation.z = -0.24; scarfTail.material = scarfMaterial;
    this.cylinder(body, 0, 0.53, 0, 0.205, 0.21, 0.055, PALETTE.plum, 16);
    this.rounded(body, 0, 0.53, 0.206, 0.086, 0.072, 0.021, 0.018, PALETTE.gold, 'metal');
    const legs: THREE.Group[] = [], arms: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(side * 0.105, 0.35, 0); body.add(leg); legs.push(leg);
      const limb = this.mesh(leg, new THREE.CapsuleGeometry(0.067, 0.20, 3, 8), PALETTE.plum, 0, -0.13, 0);
      limb.scale.z = 0.92;
      this.rounded(leg, 0, -0.285, 0.042, 0.16, 0.10, 0.23, 0.049, PALETTE.plum);
      this.rounded(leg, 0, -0.313, 0.044, 0.162, 0.026, 0.23, 0.012, PALETTE.cream);
      const arm = new THREE.Group(); arm.position.set(side * 0.215, 0.77, 0); body.add(arm); arms.push(arm);
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.20, 3, 8), coat); sleeve.position.y = -0.11; arm.add(sleeve);
      this.ball(arm, 0, -0.29, 0.014, 0.075, PALETTE.skin, 0.82, 1, 0.87);
      arm.rotation.z = side * 0.13;
    }
    const thiefHat = new THREE.Group(); body.add(thiefHat);
    this.ball(thiefHat, 0, 1.25, -0.025, 0.24, PALETTE.plum, 1.04, 0.70, 1.02);
    this.ring(thiefHat, 0, 1.225, -0.019, 0.227, 0.028, PALETTE.violet);
    this.ball(thiefHat, 0.15, 1.42, -0.045, 0.065, PALETTE.gold, 1, 1, 1, 'metal');
    const mask = new THREE.Group(); body.add(mask);
    for (const side of [-1, 1]) {
      const eye = this.ball(mask, side * 0.077, 1.10, 0.197, 0.086, PALETTE.plum, 1.09, 0.60, 0.42); eye.rotation.z = side * -0.06;
      this.ball(mask, side * 0.077, 1.10, 0.228, 0.029, PALETTE.ivory, 0.76, 0.84, 0.19);
      this.ball(mask, side * 0.077, 1.10, 0.235, 0.017, PALETTE.plum, 0.74, 0.92, 0.1);
    }
    const detectiveHat = new THREE.Group(); body.add(detectiveHat);
    this.ball(detectiveHat, 0, 1.29, -0.007, 0.25, PALETTE.teal, 1.05, 0.60, 1.04);
    this.rounded(detectiveHat, 0, 1.24, 0, 0.41, 0.055, 0.68, 0.025, PALETTE.teal);
    for (const side of [-1, 1]) this.ball(detectiveHat, side * 0.213, 1.28, 0, 0.11, PALETTE.mint, 0.27, 0.61, 0.78);
    this.ball(detectiveHat, 0, 1.451, 0, 0.045, PALETTE.gold, 1, 0.7, 1, 'metal');
    const stripe = this.rounded(detectiveHat, 0, 1.418, -0.008, 0.035, 0.025, 0.25, 0.012, PALETTE.mint); stripe.rotation.x = -0.07;
    const bag = new THREE.Group(); bag.position.set(-0.15, 0.6, -0.17); body.add(bag);
    this.ball(bag, 0, 0.02, 0, 0.19, PALETTE.cream, 0.9, 1.1, 0.79);
    this.ring(bag, 0, 0.19, 0, 0.072, 0.024, PALETTE.gold);
    this.rounded(bag, 0, 0.24, 0, 0.13, 0.08, 0.13, 0.035, PALETTE.cream);
    const glass = new THREE.Group(); glass.position.set(0, -0.17, 0.07); arms[1].add(glass);
    const magnifier = this.ring(glass, 0, -0.10, 0.07, 0.10, 0.023, PALETTE.gold, false); magnifier.rotation.y = 0.2;
    this.rounded(glass, 0, -0.245, 0.07, 0.043, 0.14, 0.043, 0.015, PALETTE.plum);
    // One transparent circular contact shadow is attached to the character.
    const material = new THREE.MeshBasicMaterial({ color: PALETTE.plum, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide }); this.materialsToDispose.add(material);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.31, 24), material); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.029; shadow.scale.y = 0.72; root.add(shadow);
    return { root, body, legs, arms, thiefHat, detectiveHat, mask, coat, scarf: scarfMaterial, bag, glass };
  }

  private buildClues(): void {
    for (const id of ['tread', 'fabric', 'charm']) {
      const root = new THREE.Group(); this.clueRoot.add(root);
      if (id === 'tread') {
        for (const pattern of ['dots', 'zigzag', 'bars'] as const) {
          const variant = new THREE.Group(); root.add(variant); this.treadVariants.set(pattern, variant);
          for (let i = 0; i < 4; i++) {
            const sole = new THREE.Group(); sole.position.set(i % 2 * 0.20 - 0.10, 0.015, (i - 1.5) * 0.20);
            sole.rotation.y = (i % 2 ? -1 : 1) * 0.16; variant.add(sole);
            this.ball(sole, 0, 0.012, 0, 0.085, PALETTE.cream, 0.67, 0.08, 1.13);
            this.ball(sole, 0, 0.012, 0.118, 0.040, PALETTE.cream, 0.85, 0.10, 0.72);
            if (pattern === 'dots') {
              for (const x of [-0.023, 0.023]) for (const z of [-0.044, 0, 0.044]) this.cylinder(sole, x, 0.025, z, 0.011, 0.011, 0.007, PALETTE.plum, 8);
            } else if (pattern === 'bars') {
              for (const z of [-0.045, 0, 0.045]) this.mesh(sole, new THREE.BoxGeometry(0.078, 0.007, 0.013), PALETTE.plum, 0, 0.026, z);
            } else {
              // Three real angular zigzags, not a generic sole with a label.
              for (const z of [-0.047, 0, 0.047]) {
                const points = [[-0.038, z], [-0.013, z + 0.018], [0.013, z], [0.038, z + 0.018]];
                for (let j = 0; j < points.length - 1; j++) {
                  const a = points[j], b = points[j + 1], dx = b[0] - a[0], dz = b[1] - a[1];
                  const bar = this.mesh(sole, new THREE.BoxGeometry(Math.hypot(dx, dz), 0.007, 0.010), PALETTE.plum, (a[0] + b[0]) / 2, 0.026, (a[1] + b[1]) / 2);
                  bar.rotation.y = -Math.atan2(dz, dx);
                }
              }
            }
          }
          this.mergeStatic(variant);
        }
      } else if (id === 'fabric') {
        this.line(root, [new THREE.Vector3(-0.18, 0.055, -0.04), new THREE.Vector3(-0.05, 0.035, 0.07), new THREE.Vector3(0.08, 0.075, 0.015), new THREE.Vector3(0.20, 0.026, 0.09)], 0.042, PALETTE.coral);
        this.ball(root, -0.15, 0.045, 0.014, 0.052, PALETTE.coral, 1, 0.17, 0.8);
        this.mergeStatic(root);
        // This material belongs only to the deposited thread. Changing a case
        // must not recolor the rug, flowerpots or other shared coral surfaces.
        this.threadMaterial = this.material(PALETTE.coral).clone();
        this.materialsToDispose.add(this.threadMaterial);
        for (const object of root.children) if (object instanceof THREE.Mesh) object.material = this.threadMaterial;
      } else {
        for (const kind of ['moon', 'star', 'leaf'] as const) {
          const variant = new THREE.Group(); root.add(variant); this.charmVariants.set(kind, variant);
          let shape: THREE.Shape;
          if (kind === 'moon') {
            shape = new THREE.Shape();
            const radius = 0.18, crossingX = radius / 2, crossingY = Math.sqrt(radius * radius - crossingX * crossingX), cutX = 0.105;
            shape.absarc(0, 0, radius, Math.PI / 3, 5 * Math.PI / 3, false);
            shape.absarc(cutX, 0, Math.hypot(crossingX - cutX, crossingY), Math.atan2(-crossingY, crossingX - cutX), Math.atan2(crossingY, crossingX - cutX), true);
            shape.closePath();
          } else if (kind === 'leaf') {
            shape = new THREE.Shape(); shape.moveTo(-0.14, -0.13);
            shape.bezierCurveTo(-0.25, 0.05, -0.04, 0.17, 0.18, 0.19);
            shape.bezierCurveTo(0.20, -0.08, 0.01, -0.22, -0.14, -0.13); shape.closePath();
          } else shape = starShape(5, 0.18, 0.086);
          const charm = this.extruded(variant, shape, 0.035, PALETTE.goldLight, 0, 0.04, 0, 0.005); charm.rotation.x = -Math.PI / 2;
          this.ring(variant, 0.17, 0.068, 0.01, 0.039, 0.014, PALETTE.gold);
          if (kind === 'leaf') this.line(variant, [new THREE.Vector3(-0.10, 0.081, 0.10), new THREE.Vector3(0.0, 0.081, 0), new THREE.Vector3(0.11, 0.081, -0.12)], 0.007, PALETTE.cream);
          this.mergeStatic(variant);
        }
      }
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.30, 32), new THREE.MeshBasicMaterial({ color: PALETTE.mint, opacity: 0.80, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      halo.rotation.x = -Math.PI / 2; halo.position.y = 0.016; halo.visible = false; root.add(halo); this.materialsToDispose.add(halo.material);
      this.clues.set(id, { root, halo });
    }
  }

  private mergeStatic(root: THREE.Group): void {
    root.updateMatrixWorld(true);
    const inverse = root.matrixWorld.clone().invert();
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const original: THREE.Mesh[] = [];
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      let bucket = buckets.get(object.material); if (!bucket) { bucket = []; buckets.set(object.material, bucket); }
      bucket.push(geometry); original.push(object);
    });
    for (const object of original) { object.removeFromParent(); object.geometry.dispose(); }
    for (const [material, geometries] of buckets) {
      const merged = mergeGeometries(geometries, false);
      for (const geometry of geometries) geometry.dispose();
      if (merged) { merged.computeBoundingSphere(); root.add(new THREE.Mesh(merged, material)); }
    }
  }

  setState(next: GalleryState): void {
    if (this.disposed) return;
    const prior = this.state;
    const profile = next.profile ?? DEFAULT_PROFILE;
    this.state = { ...next, profile: { ...profile }, found: [...next.found] };
    const detective = next.phase === 'investigate' || next.phase === 'result';
    this.character.thiefHat.visible = !detective;
    this.character.mask.visible = !detective;
    this.character.detectiveHat.visible = detective;
    this.character.glass.visible = detective;
    this.character.coat.color.setHex(detective ? PALETTE.teal : FABRIC_COLORS[profile.fabric]);
    this.character.scarf.color.setHex(detective ? PALETTE.cream : FABRIC_COLORS[profile.fabric]);
    this.threadMaterial?.color.setHex(FABRIC_COLORS[profile.fabric]);
    for (const [pattern, variant] of this.treadVariants) variant.visible = pattern === profile.tread;
    for (const [kind, variant] of this.charmVariants) variant.visible = kind === profile.charm;
    this.character.bag.visible = !detective && (next.phase === 'stash' || next.phase === 'handoff');
    const relicIndex = ((next.relic % 6) + 6) % 6;
    for (let i = 0; i < this.relics.length; i++) this.relics[i].visible = i === relicIndex;
    this.relicRoot.visible = next.phase === 'intro' || next.phase === 'entry' || next.phase === 'take' || next.phase === 'result';
    if (next.phase !== prior.phase) {
      if (next.phase === 'entry' || next.phase === 'intro') {
        this.character.root.position.set(3.8, 0.13, 2.8); this.destination.copy(this.character.root.position);
        this.character.root.rotation.y = 0.35;
      } else if (next.phase === 'take' && next.entry) {
        this.go(next.entry);
      } else if (next.phase === 'stash') {
        this.go('pedestal');
      } else if (next.phase === 'handoff' && next.stash) {
        this.go(next.stash);
      } else if (next.phase === 'investigate') {
        const at = SPOTS.door.walk; this.character.root.position.set(at[0], at[1], at[2]); this.destination.copy(this.character.root.position); this.character.root.rotation.y = 0.6;
      } else if (next.phase === 'result') {
        this.go('pedestal'); this.burst('pedestal');
      }
    }
    const entered = next.phase !== 'intro' && next.phase !== 'entry';
    const taken = entered && next.phase !== 'take';
    const hidden = taken && next.phase !== 'stash';
    const tread = this.clues.get('tread')!;
    tread.root.visible = !!next.entry && entered;
    if (next.entry) { const at = SPOTS[next.entry].walk; tread.root.position.set(at[0] - 0.19, 0.14, at[2] + 0.2); tread.root.rotation.y = next.entry === 'terrace' ? Math.PI / 2 : 0.25; }
    const fabric = this.clues.get('fabric')!; fabric.root.visible = taken; fabric.root.position.set(-0.56, 0.18, 0.61);
    const charm = this.clues.get('charm')!; charm.root.visible = !!next.stash && hidden;
    if (next.stash) { const at = SPOTS[next.stash].walk; charm.root.position.set(at[0] - 0.12, 0.15, at[2] + 0.22); }
    for (const [id, clue] of this.clues) clue.halo.visible = next.found.includes(id);
    if (next.activeSpot !== undefined) this.focus(next.activeSpot);
  }

  private go(spot: GallerySpot): void {
    const p = SPOTS[spot].walk; this.destination.set(p[0], p[1], p[2]);
    if (this.reducedMotion) this.character.root.position.copy(this.destination);
  }

  focus(spotId: string | null): void {
    const spot = spotId && spotId in SPOTS ? spotId as GallerySpot : null;
    this.focused = spot;
    this.focusRing.visible = !!spot;
    if (!spot) return;
    const p = SPOTS[spot].walk;
    this.focusRing.position.set(p[0], 0.15, p[2]);
    this.focusRing.material.color.setHex(this.state.phase === 'investigate' ? PALETTE.mint : PALETTE.goldLight);
    if (this.state.phase === 'investigate') this.go(spot);
  }

  burst(spotId: string, kind: 'gold' | 'clue' = 'gold'): void {
    if (this.disposed || this.reducedMotion) return;
    const p = spotId in SPOTS ? SPOTS[spotId as GallerySpot].anchor : SPOTS.pedestal.anchor;
    this.particleMaterial.color.setHex(kind === 'clue' ? PALETTE.mint : PALETTE.goldLight);
    for (let i = 0; i < 30; i++) {
      const a = i * 2.399, speed = 0.65 + (i % 5) * 0.13, k = i * 3;
      this.particlePositions[k] = p[0]; this.particlePositions[k + 1] = p[1]; this.particlePositions[k + 2] = p[2];
      this.particleVelocities[k] = Math.cos(a) * speed;
      this.particleVelocities[k + 1] = 0.9 + (i % 7) * 0.20;
      this.particleVelocities[k + 2] = Math.sin(a) * speed;
    }
    this.particleAge = 0; this.particles.visible = true;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (reduced) { this.particles.visible = false; this.character.root.position.copy(this.destination); }
  }

  resize(width = this.canvas.clientWidth, height = this.canvas.clientHeight): void {
    if (this.disposed) return;
    this.width = Math.max(1, width); this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    // Fit authored silhouette points, rather than a giant 3D bounding cube or
    // shadow plane, so the gallery fills both a portrait phone and a desktop.
    const points = [
      [-4.49, -0.54, -3.83], [4.49, -0.54, -3.83], [-4.49, -0.54, 3.80], [4.49, -0.54, 3.80],
      [-4.49, 4.65, -3.83], [4.49, 4.65, -3.83], [-4.49, 3.88, 1.30], [-4.49, 0.7, 3.8],
      [5.75, -0.51, 0.54], [5.75, -0.51, 2.90], [4.35, 2.78, 0.53], [4.35, 2.78, 2.92],
    ];
    this.camera.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      this.temp.set(p[0], p[1], p[2]).applyMatrix4(this.camera.matrixWorldInverse);
      minX = Math.min(minX, this.temp.x); maxX = Math.max(maxX, this.temp.x); minY = Math.min(minY, this.temp.y); maxY = Math.max(maxY, this.temp.y);
    }
    const aspect = this.width / this.height;
    let fitW = (maxX - minX) * 1.035, fitH = (maxY - minY) * 1.055;
    if (fitW / fitH < aspect) fitW = fitH * aspect; else fitH = fitW / aspect;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    this.camera.left = cx - fitW / 2; this.camera.right = cx + fitW / 2;
    this.camera.top = cy + fitH / 2; this.camera.bottom = cy - fitH / 2;
    this.camera.updateProjectionMatrix();
  }

  project(spotId: string): { x: number; y: number; visible: boolean } {
    if (!(spotId in SPOTS)) return { x: 0.5, y: 0.5, visible: false };
    const p = SPOTS[spotId as GallerySpot].anchor;
    this.projected.set(p[0], p[1], p[2]).project(this.camera);
    return { x: this.projected.x * 0.5 + 0.5, y: -this.projected.y * 0.5 + 0.5, visible: this.projected.z > -1 && this.projected.z < 1 && Math.abs(this.projected.x) < 1 && Math.abs(this.projected.y) < 1 };
  }

  render(dt: number): void {
    if (this.disposed || this.contextLost) return;
    const step = clamp(dt, 0, 0.05); this.elapsed += step;
    const detective = this.state.phase === 'investigate' || this.state.phase === 'result';
    const targetSun = detective ? 2.65 : 3.15;
    this.sun.intensity += (targetSun - this.sun.intensity) * Math.min(1, step * 2);
    this.hemisphere.intensity = detective ? 3.0 : 2.9;
    this.temp.subVectors(this.destination, this.character.root.position); this.temp.y = 0;
    const distance = this.temp.length();
    const moving = distance > 0.025;
    if (moving) {
      const amount = Math.min(distance, step * 3.5); this.temp.multiplyScalar(1 / distance);
      this.character.root.position.addScaledVector(this.temp, amount);
      const angle = Math.atan2(this.temp.x, this.temp.z);
      let delta = angle - this.character.root.rotation.y;
      while (delta > Math.PI) delta -= TAU; while (delta < -Math.PI) delta += TAU;
      this.character.root.rotation.y += delta * Math.min(1, step * 10);
    } else if (this.focused || this.state.phase === 'take' || this.state.phase === 'stash' || this.state.phase === 'result') {
      const point = SPOTS[this.focused || 'pedestal'].anchor;
      const angle = Math.atan2(point[0] - this.character.root.position.x, point[2] - this.character.root.position.z);
      let delta = angle - this.character.root.rotation.y;
      while (delta > Math.PI) delta -= TAU; while (delta < -Math.PI) delta += TAU;
      this.character.root.rotation.y += delta * Math.min(1, step * 6);
    }
    if (!this.reducedMotion) {
      const stride = moving ? Math.sin(this.elapsed * 13) : 0;
      for (let i = 0; i < 2; i++) {
        this.character.legs[i].rotation.x = stride * 0.55 * (i === 0 ? 1 : -1);
        this.character.arms[i].rotation.x = stride * 0.35 * (i === 0 ? -1 : 1) - (detective && i === 1 ? 0.22 : 0);
      }
      this.character.body.position.y = moving ? Math.abs(stride) * 0.058 : Math.sin(this.elapsed * 2.4) * 0.013;
      this.character.body.scale.y = moving ? 1 + Math.abs(stride) * 0.025 : 1;
      this.pendulum.rotation.z = Math.sin(this.elapsed * 1.7) * 0.13;
      this.relicRoot.rotation.y = Math.sin(this.elapsed * 0.65) * 0.32 + 0.3;
      this.relicRoot.position.y = 1.91 + Math.sin(this.elapsed * 2.2) * 0.045;
      this.focusRing.scale.setScalar(1 + Math.sin(this.elapsed * 4) * 0.055);
      this.focusRing.material.opacity = 0.56 + Math.sin(this.elapsed * 3.7) * 0.13;
    }
    if (this.particles.visible) {
      this.particleAge += step;
      const progress = this.particleAge / 1.0;
      if (progress >= 1) this.particles.visible = false;
      else {
        this.particleMaterial.opacity = 1 - progress * progress;
        for (let i = 0; i < 30; i++) {
          const k = i * 3;
          this.particlePositions[k] += this.particleVelocities[k] * step;
          this.particlePositions[k + 1] += this.particleVelocities[k + 1] * step;
          this.particlePositions[k + 2] += this.particleVelocities[k + 2] * step;
          this.particleVelocities[k + 1] -= step * 3.6;
          this.dummy.position.set(this.particlePositions[k], this.particlePositions[k + 1], this.particlePositions[k + 2]);
          this.dummy.rotation.set(this.particleAge * 3 + i, this.particleAge * 4, i * 0.7);
          this.dummy.scale.setScalar((0.6 + i % 3 * 0.25) * (1 - progress * 0.65)); this.dummy.updateMatrix();
          this.particles.setMatrixAt(i, this.dummy.matrix);
        }
        this.particles.instanceMatrix.needsUpdate = true;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener('webglcontextlost', this.lostHandler);
    const geometries = new Set<THREE.BufferGeometry>();
    this.scene.traverse((object) => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); });
    for (const geometry of geometries) geometry.dispose();
    for (const material of this.materialsToDispose) material.dispose();
    for (const texture of this.texturesToDispose) texture.dispose();
    this.renderer.dispose();
  }
}
