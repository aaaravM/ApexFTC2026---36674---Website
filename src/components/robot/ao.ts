/**
 * Baked volumetric ambient occlusion for APEX-R1.
 *
 * Vertex AO doesn't work on this robot (big flat faces have only a handful of vertices), so the
 * chassis is baked into a small 3D texture of "ambient visibility" instead: voxelise the assembled
 * robot (6 mm cells), then for every empty cell within two cells of a surface march 26 rays ≈ 6 cm
 * through the voxels and store the fraction that escape (masked blur over that band only, so far-away
 * empty space never dilutes a crevice). Every studio / clay material samples it per fragment
 * (one 3D texture fetch, no extra passes): the inside of the chassis, the hub stack, motor bays and
 * the underside of the turret plate darken; open faces don't.
 *
 * - Baked once per page load in small resumable time slices (≈ 4 ms a frame, ≈ 25 frames), then
 *   cached for every remount, look and tone. The robot fades AO in when the bake lands and out while
 *   it explodes.
 * - Only chassis-fixed parts are baked (the turret's rotating side and the game pieces are skipped so
 *   the bake stays valid at every yaw and after a ball leaves); the shooter still receives AO from
 *   the plate under it.
 * - Robot-root frame, metres. Shared uniforms: one update per frame serves every material.
 */
import * as THREE from "three";

const VOXEL = 0.006;
/** Bake volume in the robot-root frame (three axes, metres): the 18 in cube plus a margin. */
const MIN = new THREE.Vector3(-0.24, -0.012, -0.24);
const MAX = new THREE.Vector3(0.24, 0.42, 0.24);
const RAY_STEPS = 10;

function whiteVolume() {
  const t = new THREE.Data3DTexture(new Uint8Array([255]), 1, 1, 1);
  t.format = THREE.RedFormat;
  t.type = THREE.UnsignedByteType;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

/** Shared by every robot material (studio + clay looks). */
export const AO_UNIFORMS = {
  uApexAoTex: { value: whiteVolume() as THREE.Data3DTexture },
  uApexAoMin: { value: MIN.clone() },
  uApexAoSize: { value: MAX.clone().sub(MIN) },
  uApexAoInv: { value: new THREE.Matrix4() },
  uApexAoStrength: { value: 0 },
  uApexAoOffset: { value: VOXEL * 0.9 },
};

export const AO_VERTEX_HEAD = /* glsl */ `
uniform mat4 uApexAoInv;
varying vec3 vApexAoP;
varying vec3 vApexAoN;`;

export const AO_VERTEX_BODY = /* glsl */ `
{
  vec4 apexWp = vec4( transformed, 1.0 );
  mat3 apexM = mat3( modelMatrix );
  #ifdef USE_INSTANCING
  apexWp = instanceMatrix * apexWp;
  apexM = apexM * mat3( instanceMatrix );
  #endif
  apexWp = modelMatrix * apexWp;
  vApexAoP = ( uApexAoInv * apexWp ).xyz;
  vApexAoN = mat3( uApexAoInv ) * apexM * objectNormal;
}`;

export const AO_FRAGMENT_HEAD = /* glsl */ `
uniform highp sampler3D uApexAoTex;
uniform vec3 uApexAoMin;
uniform vec3 uApexAoSize;
uniform float uApexAoStrength;
uniform float uApexAoOffset;
varying vec3 vApexAoP;
varying vec3 vApexAoN;`;

export const AO_FRAGMENT_BODY = /* glsl */ `
if ( uApexAoStrength > 0.0 ) {
  vec3 apexN = normalize( vApexAoN );
  vec3 apexUvw = ( vApexAoP + apexN * uApexAoOffset - uApexAoMin ) / uApexAoSize;
  float apexVis = texture( uApexAoTex, apexUvw ).r;
  // an open flat face lets about half the rays escape: that reads as unoccluded; a crevice
  // (< 10 % escaping) keeps a little ambient so nothing goes pure black
  float apexAo = mix( 1.0, mix( 0.14, 1.0, smoothstep( 0.07, 0.47, apexVis ) ), uApexAoStrength );
  reflectedLight.indirectDiffuse *= apexAo;
  reflectedLight.indirectSpecular *= mix( 1.0, apexAo, 0.8 );
  reflectedLight.directDiffuse *= mix( 1.0, apexAo, 0.5 );
  reflectedLight.directSpecular *= mix( 1.0, apexAo, 0.4 );
}`;

let cached: THREE.Data3DTexture | null = null;
/** True once a bake has finished this page load (every later robot reuses it instantly). */
export const aoReady = () => cached !== null;

/** The finished bake, if any (shared across robots on the page). */
export function cachedAo() {
  return cached;
}

/** 26 well-spread unit directions (Fibonacci sphere). */
function rayDirections(n = 26) {
  const dirs: [number, number, number][] = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = g * i;
    dirs.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return dirs;
}

/** One mesh (or one instance of an instanced mesh) to voxelise, with its robot-root matrix. */
interface Job {
  pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
  idx: THREE.BufferAttribute | null;
  /** column-major 4×4, robot-root frame */
  m: number[];
  /** index (or vertex) count */
  n: number;
}

type Phase = "voxelise" | "shell" | "dilate" | "rays" | "blur" | "fill" | "pack" | "done";

/**
 * Time-sliced bake. Construct with the robot root at rest (explode 0) — the constructor only records
 * meshes and matrices — then call `step(ms)` once a frame until it returns the texture. Every phase
 * is resumable, so no single slice runs much past the budget.
 */
export class AoBaker {
  private readonly nx: number;
  private readonly ny: number;
  private readonly nz: number;
  private occ: Uint8Array;
  private band: Uint8Array;
  private vis: Float32Array;
  private tmp: Float32Array | null = null;
  private bytes: Uint8Array | null = null;
  private jobs: Job[] = [];
  private phase: Phase = "voxelise";
  /** voxelise: job + vertex cursor; shell / fill / pack: layer; dilate / rays: list cursor */
  private job = 0;
  private vert = 0;
  private layer = 1;
  private cursor = 0;
  private axis = 0;
  private list: number[] = [];
  private touching = 0;
  private shell: Int32Array = new Int32Array(0);
  private readonly dirs = rayDirections();
  private readonly tri = new Float64Array(9);
  /** dev stats: busy milliseconds, frames, longest slice, baked cells */
  readonly stats = { busyMs: 0, frames: 0, longestMs: 0, cells: 0 };

  constructor(root: THREE.Object3D, skip: (o: THREE.Object3D) => boolean) {
    const size = MAX.clone().sub(MIN);
    this.nx = Math.ceil(size.x / VOXEL);
    this.ny = Math.ceil(size.y / VOXEL);
    this.nz = Math.ceil(size.z / VOXEL);
    const n = this.nx * this.ny * this.nz;
    this.occ = new Uint8Array(n);
    this.band = new Uint8Array(n);
    this.vis = new Float32Array(n).fill(1);
    // record the static, chassis-fixed, opaque layer-0 meshes and their robot-root matrices
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const m = new THREE.Matrix4();
    const mi = new THREE.Matrix4();
    const visit = (o: THREE.Object3D) => {
      if (!o.visible || skip(o)) return;
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.Material | undefined;
      const usable =
        mesh.isMesh &&
        mesh.layers.isEnabled(0) &&
        mat &&
        !Array.isArray(mat) &&
        !mat.transparent &&
        !/:ball/.test(mat.name) &&
        !o.userData?.hitProxy;
      if (usable) {
        const g = mesh.geometry;
        const pos = g.getAttribute("position");
        const idx = g.getIndex();
        const inst = o as THREE.InstancedMesh;
        const count = inst.isInstancedMesh ? inst.count : 1;
        for (let k = 0; k < count; k++) {
          m.multiplyMatrices(inv, o.matrixWorld);
          if (inst.isInstancedMesh) {
            inst.getMatrixAt(k, mi);
            m.multiply(mi);
          }
          this.jobs.push({ pos, idx, m: m.elements.slice(), n: idx ? idx.count : pos.count });
        }
      }
      for (const c of o.children) visit(c);
    };
    visit(root);
  }

  private cell(x: number, y: number, z: number) {
    const i = Math.floor((x - MIN.x) / VOXEL);
    const j = Math.floor((y - MIN.y) / VOXEL);
    const k = Math.floor((z - MIN.z) / VOXEL);
    if (i < 0 || j < 0 || k < 0 || i >= this.nx || j >= this.ny || k >= this.nz) return -1;
    return i + this.nx * (j + this.ny * k);
  }

  /** Run for about `budgetMs`; returns the finished texture once, else null. */
  step(budgetMs: number): THREE.Data3DTexture | null {
    const t0 = performance.now();
    const result = this.run(t0, budgetMs);
    const ms = performance.now() - t0;
    this.stats.busyMs += ms;
    this.stats.frames++;
    this.stats.longestMs = Math.max(this.stats.longestMs, ms);
    return result;
  }

  private run(t0: number, budgetMs: number): THREE.Data3DTexture | null {
    const { nx, ny, nz, occ, band } = this;
    const slab = nx * ny;
    while (performance.now() - t0 < budgetMs) {
      switch (this.phase) {
        case "voxelise": {
          const J = this.jobs[this.job];
          if (!J) {
            this.jobs = [];
            this.layer = 1;
            this.phase = "shell";
            break;
          }
          // rasterise each triangle by barycentric sampling at ≤ half a voxel
          const { pos, idx, m: e } = J;
          const t = this.tri;
          for (let q = 0; q < 240 && this.vert + 2 < J.n; q++, this.vert += 3) {
            for (let v = 0; v < 3; v++) {
              const vi = idx ? idx.getX(this.vert + v) : this.vert + v;
              const x = pos.getX(vi);
              const y = pos.getY(vi);
              const z = pos.getZ(vi);
              t[v * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
              t[v * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
              t[v * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
            }
            const edge = Math.max(
              Math.hypot(t[3] - t[0], t[4] - t[1], t[5] - t[2]),
              Math.hypot(t[6] - t[0], t[7] - t[1], t[8] - t[2]),
              Math.hypot(t[6] - t[3], t[7] - t[4], t[8] - t[5]),
            );
            const s = Math.min(64, Math.max(1, Math.ceil(edge / (VOXEL * 0.5))));
            for (let i = 0; i <= s; i++)
              for (let j = 0; j <= s - i; j++) {
                const u = i / s;
                const w = j / s;
                const r = 1 - u - w;
                const c = this.cell(t[0] * r + t[3] * u + t[6] * w, t[1] * r + t[4] * u + t[7] * w, t[2] * r + t[5] * u + t[8] * w);
                if (c >= 0) occ[c] = 1;
              }
          }
          if (this.vert + 2 >= J.n) {
            this.job++;
            this.vert = 0;
          }
          break;
        }
        case "shell": {
          // band 1: empty cells touching a surface (one k layer per pass)
          if (this.layer >= nz - 1) {
            this.touching = this.list.length;
            this.cursor = 0;
            this.phase = "dilate";
            break;
          }
          const k = this.layer++;
          for (let j = 1; j < ny - 1; j++)
            for (let i = 1; i < nx - 1; i++) {
              const c = i + nx * (j + ny * k);
              if (occ[c]) continue;
              if (occ[c - 1] || occ[c + 1] || occ[c - nx] || occ[c + nx] || occ[c - slab] || occ[c + slab]) {
                band[c] = 1;
                this.list.push(c);
              }
            }
          break;
        }
        case "dilate": {
          // band 2: one cell further out (everything a surface sample or the blur can reach)
          const end = Math.min(this.touching, this.cursor + 4000);
          for (; this.cursor < end; this.cursor++) {
            const c = this.list[this.cursor];
            for (const d of [1, -1, nx, -nx, slab, -slab]) {
              const n = c + d;
              if (!occ[n] && !band[n]) {
                band[n] = 2;
                this.list.push(n);
              }
            }
          }
          if (this.cursor >= this.touching) {
            this.shell = Int32Array.from(this.list);
            this.list = [];
            this.stats.cells = this.shell.length;
            this.cursor = 0;
            this.phase = "rays";
          }
          break;
        }
        case "rays": {
          const shell = this.shell;
          const end = Math.min(shell.length, this.cursor + 300);
          for (; this.cursor < end; this.cursor++) {
            const c = shell[this.cursor];
            const i0 = c % nx;
            const j0 = Math.floor(c / nx) % ny;
            const k0 = Math.floor(c / slab);
            let free = 0;
            for (const [dx, dy, dz] of this.dirs) {
              let hit = false;
              for (let s = 1; s <= RAY_STEPS; s++) {
                const i = Math.round(i0 + dx * s);
                const j = Math.round(j0 + dy * s);
                const k = Math.round(k0 + dz * s);
                if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) break;
                if (occ[i + nx * (j + ny * k)]) {
                  hit = true;
                  break;
                }
              }
              if (!hit) free++;
            }
            this.vis[c] = free / this.dirs.length;
          }
          if (this.cursor >= shell.length) {
            this.axis = 0;
            this.phase = "blur";
          }
          break;
        }
        case "blur": {
          // masked 3-tap blur along one axis per pass, over the band only
          const src = this.vis;
          const dst = this.tmp ?? new Float32Array(src.length);
          dst.set(src);
          const stride = [1, nx, slab][this.axis];
          const len = [nx, ny, nz][this.axis];
          const axis = this.axis;
          const shell = this.shell;
          for (let q = 0; q < shell.length; q++) {
            const c = shell[q];
            const at = axis === 0 ? c % nx : axis === 1 ? Math.floor(c / nx) % ny : Math.floor(c / slab);
            let sum = src[c];
            let w = 1;
            if (at > 0 && band[c - stride]) {
              sum += src[c - stride];
              w++;
            }
            if (at < len - 1 && band[c + stride]) {
              sum += src[c + stride];
              w++;
            }
            dst[c] = sum / w;
          }
          this.vis = dst;
          this.tmp = src;
          if (++this.axis === 3) {
            this.tmp = null;
            this.layer = 0;
            this.phase = "fill";
          }
          break;
        }
        case "fill": {
          // occupied cells take the mean of their band neighbours, so trilinear filtering right at a
          // surface neither brightens nor darkens it (one k layer per pass)
          if (this.layer >= nz) {
            this.layer = 0;
            this.bytes = new Uint8Array(this.vis.length);
            this.phase = "pack";
            break;
          }
          const k = this.layer++;
          const vis = this.vis;
          for (let j = 0; j < ny; j++)
            for (let i = 0; i < nx; i++) {
              const c = i + nx * (j + ny * k);
              if (!occ[c]) continue;
              let sum = 0;
              let w = 0;
              if (i > 0 && band[c - 1]) {
                sum += vis[c - 1];
                w++;
              }
              if (i < nx - 1 && band[c + 1]) {
                sum += vis[c + 1];
                w++;
              }
              if (j > 0 && band[c - nx]) {
                sum += vis[c - nx];
                w++;
              }
              if (j < ny - 1 && band[c + nx]) {
                sum += vis[c + nx];
                w++;
              }
              if (k > 0 && band[c - slab]) {
                sum += vis[c - slab];
                w++;
              }
              if (k < nz - 1 && band[c + slab]) {
                sum += vis[c + slab];
                w++;
              }
              vis[c] = w ? sum / w : 0.5;
            }
          break;
        }
        case "pack": {
          const bytes = this.bytes!;
          const vis = this.vis;
          if (this.layer < nz) {
            const from = this.layer * slab;
            const to = Math.min(nz, this.layer + 8) * slab;
            for (let c = from; c < to; c++) bytes[c] = Math.max(0, Math.min(255, Math.round(vis[c] * 255)));
            this.layer = Math.min(nz, this.layer + 8);
            break;
          }
          const tex = new THREE.Data3DTexture(bytes, nx, ny, nz);
          tex.format = THREE.RedFormat;
          tex.type = THREE.UnsignedByteType;
          tex.minFilter = tex.magFilter = THREE.LinearFilter;
          tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping;
          tex.unpackAlignment = 1;
          tex.needsUpdate = true;
          cached = tex;
          this.phase = "done";
          this.occ = new Uint8Array(0);
          this.band = new Uint8Array(0);
          this.vis = new Float32Array(0);
          this.bytes = null;
          this.shell = new Int32Array(0);
          return tex;
        }
        default:
          return null;
      }
    }
    return null;
  }
}
