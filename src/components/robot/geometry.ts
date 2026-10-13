/**
 * Geometry toolkit for the procedural robot.
 *
 * Parts are authored in MILLIMETRES with these helpers and converted to metres once (`GeoBuilder`
 * scales by 0.001). Each part merges its pieces per material role, so a part costs one draw call per
 * role instead of one per piece.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { MaterialRole } from "./materials";

export type V3 = [number, number, number];

const DEG = Math.PI / 180;
export const deg = (d: number) => d * DEG;

// ------------------------------------------------------------------------------------------------
// caching
// ------------------------------------------------------------------------------------------------
const geoCache = new Map<string, unknown>();
/** Memoise expensive geometry by a string key for the lifetime of the page. */
export function cachedGeo<T>(key: string, make: () => T): T {
  if (geoCache.has(key)) return geoCache.get(key) as T;
  const v = make();
  geoCache.set(key, v);
  return v;
}

// ------------------------------------------------------------------------------------------------
// transforms
// ------------------------------------------------------------------------------------------------
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

/** Compose a matrix from position (mm), Euler rotation (radians, XYZ) and scale. */
export function M(position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], scale: V3 | number = 1) {
  _e.set(rotation[0], rotation[1], rotation[2]);
  _q.setFromEuler(_e);
  if (typeof scale === "number") _s.setScalar(scale);
  else _s.set(scale[0], scale[1], scale[2]);
  return new THREE.Matrix4().compose(_p.set(position[0], position[1], position[2]), _q, _s);
}

/** Matrix that rotates +Y onto `dir` and translates to `pos`. */
export function alignY(pos: V3, dir: V3) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  return new THREE.Matrix4().compose(new THREE.Vector3(pos[0], pos[1], pos[2]), q, new THREE.Vector3(1, 1, 1));
}

/** Clone + transform, keeping triangle winding correct for mirrored matrices. */
export function transformed(geo: THREE.BufferGeometry, matrix?: THREE.Matrix4) {
  const g = normalize(geo.clone());
  if (matrix) {
    g.applyMatrix4(matrix);
    if (matrix.determinant() < 0) flipWinding(g);
  }
  return g;
}

function flipWinding(g: THREE.BufferGeometry) {
  const index = g.getIndex();
  if (!index) return;
  const a = index.array as Uint16Array | Uint32Array;
  for (let i = 0; i < a.length; i += 3) {
    const t = a[i + 1];
    a[i + 1] = a[i + 2];
    a[i + 2] = t;
  }
  index.needsUpdate = true;
}

/** Extra per-vertex attributes that survive normalize() (e.g. the pattern-plate edge mask). */
const KEEP_ATTRIBUTES = new Set(["position", "normal", "uv", "apexMask"]);

/** Make a geometry mergeable: indexed, with position / normal / uv (+ the kept extras). */
export function normalize(g: THREE.BufferGeometry) {
  for (const name of Object.keys(g.attributes)) {
    if (!KEEP_ATTRIBUTES.has(name)) g.deleteAttribute(name);
  }
  g.morphAttributes = {};
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  if (!g.getAttribute("uv")) {
    const n = g.getAttribute("position").count;
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  if (!g.getIndex()) {
    const n = g.getAttribute("position").count;
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  g.clearGroups();
  return g;
}

export function merge(geos: THREE.BufferGeometry[]) {
  if (geos.length === 1) return geos[0];
  const out = mergeGeometries(geos.map((g) => normalize(g)), false);
  if (!out) throw new Error("mergeGeometries failed");
  return out;
}

/** Collects pieces per material role and merges them (mm → m). */
export class GeoBuilder {
  private parts = new Map<MaterialRole, THREE.BufferGeometry[]>();
  add(role: MaterialRole, geo: THREE.BufferGeometry, matrix?: THREE.Matrix4) {
    const list = this.parts.get(role) ?? [];
    list.push(transformed(geo, matrix));
    this.parts.set(role, list);
    return this;
  }
  /** Merged geometries in METRES, keyed by role. */
  build(scale = 0.001): RoleGeometries {
    const out: RoleGeometries = {};
    for (const [role, list] of this.parts) {
      const g = merge(list);
      g.scale(scale, scale, scale);
      g.computeBoundingSphere();
      g.computeBoundingBox();
      out[role] = g;
    }
    return out;
  }
}
export type RoleGeometries = Partial<Record<MaterialRole, THREE.BufferGeometry>>;

// ------------------------------------------------------------------------------------------------
// primitives (all in mm, centred unless stated)
// ------------------------------------------------------------------------------------------------
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

export function rbox(w: number, h: number, d: number, r: number, segments = 2) {
  return new RoundedBoxGeometry(w, h, d, segments, Math.min(r, w / 2, h / 2, d / 2));
}

/** Cylinder along +Y, centred. */
export const cyl = (r: number, h: number, seg = 32, rTop?: number, open = false) =>
  new THREE.CylinderGeometry(rTop ?? r, r, h, seg, 1, open);

/** Rotations that turn a +Y-axis primitive onto X or Z. */
export const AXIS_X: V3 = [0, 0, -Math.PI / 2];
export const AXIS_Z: V3 = [Math.PI / 2, 0, 0];

/**
 * Lathe around +Y from an (r, y) profile. Profile runs bottom → top, outside surface.
 * Closed solids should start and end at r = 0 or form a loop.
 */
export function lathe(profile: [number, number][], seg = 40, phiStart = 0, phiLength = Math.PI * 2) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
  return new THREE.LatheGeometry(pts, seg, phiStart, phiLength);
}

/** Solid ring (tube with thickness) along Y: inner/outer radius, height, small edge chamfer. */
export function ring(rIn: number, rOut: number, h: number, seg = 32, chamfer = 0.4) {
  const c = Math.min(chamfer, (rOut - rIn) / 3, h / 3);
  const y0 = -h / 2;
  const y1 = h / 2;
  return lathe(
    [
      [rIn + c, y0],
      [rOut - c, y0],
      [rOut, y0 + c],
      [rOut, y1 - c],
      [rOut - c, y1],
      [rIn + c, y1],
      [rIn, y1 - c],
      [rIn, y0 + c],
      [rIn + c, y0],
    ],
    seg,
  );
}

/** Solid disc/cylinder with chamfered edges along Y. */
export function chamferCyl(r: number, h: number, chamfer = 0.6, seg = 24) {
  const c = Math.min(chamfer, r / 3, h / 3);
  return lathe(
    [
      [0, -h / 2],
      [r - c, -h / 2],
      [r, -h / 2 + c],
      [r, h / 2 - c],
      [r - c, h / 2],
      [0, h / 2],
    ],
    seg,
  );
}

export function torus(R: number, r: number, radial = 10, tubular = 40, arc = Math.PI * 2) {
  return new THREE.TorusGeometry(R, r, radial, tubular, arc);
}

export function sphere(r: number, w = 24, h = 16) {
  return new THREE.SphereGeometry(r, w, h);
}

/**
 * Box (mm) whose ±Y faces carry UVs in `cell`-mm units for a tiling grid alpha map; the edge faces
 * point at a solid spot of the grid texture.
 */
export function gridUvBox(w: number, h: number, d: number, cell = 24) {
  const g = new THREE.BoxGeometry(w, h, d);
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const uv = g.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(nor.getY(i)) > 0.9) uv.setXY(i, (pos.getX(i) + w / 2) / cell, (pos.getZ(i) + d / 2) / cell);
    else uv.setXY(i, 2 / 24, 1 - 8 / 24);
  }
  setPlateMask(g, 0, 0, w, d);
  return g;
}

/**
 * Pattern-plate edge mask: the plate's outline as a rectangle in its UV millimetres (u·24, v·24).
 * The hole shader keeps a solid 4 mm border inside it (no half-holes along the edges).
 */
export function setPlateMask(g: THREE.BufferGeometry, u0: number, v0: number, u1: number, v1: number) {
  const n = g.getAttribute("position").count;
  const a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) a.set([u0, v0, u1, v1], i * 4);
  g.setAttribute("apexMask", new THREE.BufferAttribute(a, 4));
  return g;
}

// ------------------------------------------------------------------------------------------------
// shapes + extrusion
// ------------------------------------------------------------------------------------------------
export function roundedRectShape(w: number, h: number, r: number, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  roundedRectPath(s, w, h, r, cx, cy);
  return s;
}

export function roundedRectPath(p: THREE.Path, w: number, h: number, r: number, cx = 0, cy = 0) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  p.moveTo(x + rr, y);
  p.lineTo(x + w - rr, y);
  p.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  p.lineTo(x + w, y + h - rr);
  p.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false);
  p.lineTo(x + rr, y + h);
  p.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false);
  p.lineTo(x, y + rr);
  p.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return p;
}

export function circlePath(x: number, y: number, r: number, clockwise = true) {
  const p = new THREE.Path();
  p.absarc(x, y, r, 0, Math.PI * 2, clockwise);
  return p;
}

export function slotPath(x1: number, y1: number, x2: number, y2: number, r: number) {
  const p = new THREE.Path();
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.absarc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2, false);
  p.absarc(x1, y1, r, a + Math.PI / 2, a + Math.PI * 1.5, false);
  p.closePath();
  return p;
}

/** Polygon shape from points. */
export function polyShape(points: [number, number][]) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  return s;
}

/**
 * Extrude a shape (XY plane) along +Z by `depth`, centred on Z, with an optional small bevel so
 * edges catch light. Result lies in XY with thickness along Z.
 */
export function extrude(shape: THREE.Shape | THREE.Shape[], depth: number, bevel = 0.5, curveSegments = 24) {
  const bevelEnabled = bevel > 0;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - (bevelEnabled ? 2 * bevel : 0)),
    bevelEnabled,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevelEnabled ? 1 : 0,
    curveSegments,
    steps: 1,
  });
  g.translate(0, 0, -depth / 2 + (bevelEnabled ? bevel : 0));
  return g;
}

/** Annular sector in the XY plane (angles in radians, CCW from +X), extruded along Z. */
export function arcPlate(rIn: number, rOut: number, a0: number, a1: number, depth: number, bevel = 0.3, seg = 48) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, a0, a1, false);
  s.absarc(0, 0, rIn, a1, a0, true);
  s.closePath();
  return extrude(s, depth, bevel, seg);
}

/**
 * Spur gear outline (simple trapezoid involute approximation) with a bore and optional lightening
 * holes, in the XY plane.
 */
export function gearShape(
  teeth: number,
  module: number,
  boreR: number,
  opts: { holes?: number; holeR?: number; holeAt?: number; boltR?: number; bolts?: number } = {},
) {
  const pitchR = (module * teeth) / 2;
  const addR = pitchR + module;
  const dedR = pitchR - 1.25 * module;
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [dedR, a - step * 0.5],
      [dedR, a - step * 0.3],
      [addR, a - step * 0.14],
      [addR, a + step * 0.14],
      [dedR, a + step * 0.3],
    ];
    pts.forEach(([r, ang], j) => {
      const x = r * Math.cos(ang);
      const y = r * Math.sin(ang);
      if (i === 0 && j === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  s.holes.push(circlePath(0, 0, boreR));
  if (opts.holes && opts.holeR && opts.holeAt) {
    for (let i = 0; i < opts.holes; i++) {
      const a = (i / opts.holes) * Math.PI * 2 + Math.PI / opts.holes;
      s.holes.push(circlePath(opts.holeAt * Math.cos(a), opts.holeAt * Math.sin(a), opts.holeR));
    }
  }
  if (opts.bolts && opts.boltR) {
    for (let i = 0; i < opts.bolts; i++) {
      const a = (i / opts.bolts) * Math.PI * 2;
      s.holes.push(circlePath(opts.boltR * Math.cos(a), opts.boltR * Math.sin(a), 2.1));
    }
  }
  return s;
}

/** Closed timing-belt loop around two pulleys (centres in the XY plane), extruded along Z. */
export function beltLoop(c1: [number, number], r1: number, c2: [number, number], r2: number, width: number, thickness = 1.6) {
  const outer = stadium(c1, r1 + thickness, c2, r2 + thickness);
  const inner = stadium(c1, r1, c2, r2);
  const s = new THREE.Shape(outer.getPoints(64));
  s.holes.push(new THREE.Path(inner.getPoints(64).reverse()));
  return extrude(s, width, 0, 64);
}

function stadium(c1: [number, number], r1: number, c2: [number, number], r2: number) {
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const d = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  const phi = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / d)));
  const p = new THREE.Path();
  p.absarc(c2[0], c2[1], r2, base - phi, base + phi, false);
  p.absarc(c1[0], c1[1], r1, base + phi, base + Math.PI * 2 - phi, false);
  p.closePath();
  return p;
}

// ------------------------------------------------------------------------------------------------
// tubes
// ------------------------------------------------------------------------------------------------
export function tubeAlong(points: V3[], radius: number, segmentsPerUnit = 0.14, radial = 6, tension = 0.5) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    "catmullrom",
    tension,
  );
  const len = curve.getLength();
  const segs = Math.max(8, Math.round(len * segmentsPerUnit));
  return { geometry: new THREE.TubeGeometry(curve, segs, radius, radial, false), curve };
}

// ------------------------------------------------------------------------------------------------
// edges (blueprint)
// ------------------------------------------------------------------------------------------------
const edgeCache = new WeakMap<THREE.BufferGeometry, Map<number, THREE.EdgesGeometry>>();
export function edgesOf(geo: THREE.BufferGeometry, threshold = 30) {
  let byT = edgeCache.get(geo);
  if (!byT) {
    byT = new Map();
    edgeCache.set(geo, byT);
  }
  let e = byT.get(threshold);
  if (!e) {
    e = new THREE.EdgesGeometry(geo, threshold);
    byT.set(threshold, e);
  }
  return e;
}

/** Apply mm → m and return a fresh geometry (for one-off meshes not built with GeoBuilder). */
export function toMetres<T extends THREE.BufferGeometry>(g: T): T {
  g.scale(0.001, 0.001, 0.001);
  g.computeBoundingSphere();
  return g;
}
