// AnnotationLayer — drafting annotations for the 3D viewer, drawn in SCREEN space on an SVG + DOM
// overlay and re-projected from 3D every rendered frame.
//
// Why screen space: on a drawing, line weights, dash patterns (phantom lines), arrowheads and text
// are constant on the paper whatever the scale. Projecting 3D anchor points and drawing the
// annotation in 2D gives exactly that: 1 px dimension lines, crisp arrowheads that always face the
// viewer, horizontal (unidirectional) text with a paper knock-out, at any orbit or zoom.
//
// Imperative on purpose: ~100 attribute writes per frame, no React re-render per frame. The React
// side only mounts the container; the canvas side calls update() from useFrame.

import * as THREE from "three";

export type Pt = (out: THREE.Vector3) => THREE.Vector3 | null;
export type AnnGroup = "dims" | "balloons" | "section";

interface Base {
  id: string;
  group: AnnGroup;
}
/** Linear dimension between a and b, drawn offset by `off` (world vector) with extension lines. */
export interface LinearAnn extends Base {
  kind: "linear";
  a: Pt;
  b: Pt;
  off: THREE.Vector3;
  text: string;
  sub?: string;
}
/** Angular dimension at c from direction u to direction v (unit vectors), radius r (m). */
export interface AngleAnn extends Base {
  kind: "angle";
  c: Pt;
  u: Pt;
  v: Pt;
  r: number;
  text: string;
  sub?: string;
}
/** Leader from a point to a note (screen offset dx, dy). */
export interface LeaderAnn extends Base {
  kind: "leader";
  at: Pt;
  dx: number;
  dy: number;
  text: string;
  sub?: string;
}
/** Phantom-line box (an envelope). Optional tag near the top front edge. */
export interface BoxAnn extends Base {
  kind: "box";
  min: THREE.Vector3;
  max: THREE.Vector3;
  text?: string;
}
/** Horizontal travel arc about a vertical axis through c: from..to (rad, 0 = +Z forward, + = CCW
 *  seen from above), with a hatched dead zone for the rest of the circle. */
export interface TravelAnn extends Base {
  kind: "travel";
  c: Pt;
  r: number;
  from: number;
  to: number;
  text: string;
  deadText?: string;
}
/** Exploded-view balloon: item number in a circle, leader to the part. */
export interface BalloonAnn extends Base {
  kind: "balloon";
  at: Pt;
  text: string;
  /** Optional emphasis (the hovered item). */
  active?: boolean;
}
/** Cutting-plane line for a section normal to X at world x = getX(): ends + arrows + letters. */
export interface CutAnn extends Base {
  kind: "cut";
  x: () => number;
  z0: number;
  z1: number;
  height: number;
  letter: string;
}

export type AnnSpec = LinearAnn | AngleAnn | LeaderAnn | BoxAnn | TravelAnn | BalloonAnn | CutAnn;

export interface AnnContext {
  camera: THREE.Camera;
  width: number;
  height: number;
  fade: Record<AnnGroup, number>;
  /** Screen centre of the robot (balloons radiate away from it). */
  centre: { x: number; y: number };
}

const SVG_NS = "http://www.w3.org/2000/svg";
const PHANTOM = "14 3 3 3";
const CENTRE = "10 2.5 2 2.5";
const ARROW_L = 7;
const ARROW_W = 2.4;

type El = SVGElement;
interface Item {
  spec: AnnSpec;
  g: SVGGElement;
  els: El[];
  labels: HTMLElement[];
  shown: boolean;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  return el;
}

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

export class AnnotationLayer {
  private host: HTMLElement;
  private svgEl: SVGSVGElement;
  private items: Item[] = [];
  private labelClass: string;
  // scratch
  private v = new THREE.Vector3();
  private w1 = new THREE.Vector3();
  private w2 = new THREE.Vector3();
  private w3 = new THREE.Vector3();
  private w4 = new THREE.Vector3();
  private s1 = { x: 0, y: 0 };
  private s2 = { x: 0, y: 0 };
  private s3 = { x: 0, y: 0 };
  private s4 = { x: 0, y: 0 };
  private ctx: AnnContext | null = null;

  constructor(host: HTMLElement, opts: { svgClass: string; labelClass: string; hatchId: string }) {
    this.host = host;
    this.labelClass = opts.labelClass;
    this.svgEl = svg("svg", { class: opts.svgClass, "aria-hidden": "true" }) as SVGSVGElement;
    const defs = svg("defs");
    const pat = svg("pattern", { id: opts.hatchId, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    pat.appendChild(svg("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "currentColor", "stroke-width": 1 }));
    defs.appendChild(pat);
    this.svgEl.appendChild(defs);
    this.hatchUrl = `url(#${opts.hatchId})`;
    host.appendChild(this.svgEl);
  }
  private hatchUrl: string;

  destroy() {
    this.clear();
    this.svgEl.remove();
  }

  private clear() {
    for (const it of this.items) {
      it.g.remove();
      for (const l of it.labels) l.remove();
    }
    this.items = [];
  }

  private label(html: string, extra = "") {
    const d = document.createElement("div");
    d.className = `${this.labelClass} ${extra}`.trim();
    d.innerHTML = html;
    this.host.appendChild(d);
    return d;
  }

  set(specs: AnnSpec[]) {
    this.clear();
    for (const spec of specs) {
      const g = svg("g", { "data-ann": spec.id }) as SVGGElement;
      const els: El[] = [];
      const labels: HTMLElement[] = [];
      const line = (attrs: Record<string, string | number> = {}) => {
        const l = svg("line", { stroke: "currentColor", "stroke-width": 1, ...attrs });
        g.appendChild(l);
        els.push(l);
        return l;
      };
      const poly = (attrs: Record<string, string | number> = {}) => {
        const p = svg("polyline", { fill: "none", stroke: "currentColor", "stroke-width": 1, ...attrs });
        g.appendChild(p);
        els.push(p);
        return p;
      };
      const arrow = () => {
        const p = svg("polygon", { fill: "currentColor" });
        g.appendChild(p);
        els.push(p);
        return p;
      };
      const text = (t: string, sub?: string) => (sub ? `${t} <small>${sub}</small>` : t);
      switch (spec.kind) {
        case "linear":
          line({ "stroke-width": 0.75 }); // ext a
          line({ "stroke-width": 0.75 }); // ext b
          line(); // dimension line
          arrow();
          arrow();
          labels.push(this.label(text(spec.text, spec.sub)));
          break;
        case "angle":
          line({ "stroke-width": 0.75, "stroke-dasharray": CENTRE }); // reference
          line({ "stroke-width": 0.75 }); // ray
          poly(); // arc
          arrow();
          arrow();
          labels.push(this.label(text(spec.text, spec.sub)));
          break;
        case "leader": {
          const dot = svg("circle", { r: 2, fill: "currentColor" });
          g.appendChild(dot);
          els.push(dot);
          poly({ "stroke-width": 0.85 });
          labels.push(this.label(text(spec.text, spec.sub)));
          break;
        }
        case "box":
          for (let i = 0; i < 12; i++) line({ "stroke-width": 0.9, "stroke-dasharray": PHANTOM });
          if (spec.text) labels.push(this.label(spec.text));
          break;
        case "travel": {
          const dead = svg("path", { fill: this.hatchUrl, stroke: "currentColor", "stroke-width": 0.75 });
          g.appendChild(dead);
          els.push(dead);
          poly(); // travel arc
          arrow();
          arrow();
          line({ "stroke-width": 0.75, "stroke-dasharray": CENTRE }); // 0° (forward) centre line
          labels.push(this.label(spec.text));
          if (spec.deadText) labels.push(this.label(spec.deadText));
          break;
        }
        case "balloon": {
          const dot = svg("circle", { r: 1.8, fill: "currentColor" });
          g.appendChild(dot);
          els.push(dot);
          line({ "stroke-width": 0.85 });
          const ring = svg("circle", { r: 11, fill: "var(--bg)", stroke: "currentColor", "stroke-width": spec.active ? 2 : 1 });
          g.appendChild(ring);
          els.push(ring);
          const t = svg("text", {
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "font-size": 10,
            fill: "currentColor",
            "font-family": "var(--ff-mono), ui-monospace, monospace",
          });
          t.textContent = spec.text;
          g.appendChild(t);
          els.push(t);
          break;
        }
        case "cut":
          for (let i = 0; i < 4; i++) line({ "stroke-width": 0.9, "stroke-dasharray": PHANTOM }); // plane outline
          line({ "stroke-width": 2.5 }); // end a (thick)
          line({ "stroke-width": 2.5 }); // end b (thick)
          line({ "stroke-width": 1.25 }); // leg a
          line({ "stroke-width": 1.25 }); // leg b
          arrow();
          arrow();
          labels.push(this.label(spec.letter, "font-semibold"));
          labels.push(this.label(spec.letter, "font-semibold"));
          break;
      }
      g.style.opacity = "0";
      this.svgEl.appendChild(g);
      this.items.push({ spec, g, els, labels, shown: false });
    }
  }

  // ─── geometry helpers ─────────────────────────────────────────────────────
  private project(p: THREE.Vector3, out: { x: number; y: number }) {
    const c = this.ctx!;
    this.v.copy(p).project(c.camera);
    out.x = (this.v.x * 0.5 + 0.5) * c.width;
    out.y = (-this.v.y * 0.5 + 0.5) * c.height;
    return out;
  }

  private setLine(el: El, a: { x: number; y: number }, b: { x: number; y: number }) {
    el.setAttribute("x1", f1(a.x));
    el.setAttribute("y1", f1(a.y));
    el.setAttribute("x2", f1(b.x));
    el.setAttribute("y2", f1(b.y));
  }

  /** Arrowhead with its tip at p, pointing along (dx, dy). */
  private setArrow(el: El, p: { x: number; y: number }, dx: number, dy: number) {
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const bx = p.x - ux * ARROW_L;
    const by = p.y - uy * ARROW_L;
    const nx = -uy * ARROW_W;
    const ny = ux * ARROW_W;
    el.setAttribute("points", `${f1(p.x)},${f1(p.y)} ${f1(bx + nx)},${f1(by + ny)} ${f1(bx - nx)},${f1(by - ny)}`);
  }

  private place(el: HTMLElement, x: number, y: number, anchor = "translate(-50%, -50%)") {
    el.style.transform = `translate(${f1(x)}px, ${f1(y)}px) ${anchor}`;
  }

  private show(it: Item, o: number) {
    const on = o > 0.004;
    if (on !== it.shown) {
      it.shown = on;
      it.g.style.display = on ? "" : "none";
      for (const l of it.labels) l.style.display = on ? "" : "none";
    }
    if (on) {
      const s = o.toFixed(3);
      it.g.style.opacity = s;
      for (const l of it.labels) l.style.opacity = s;
    }
    return on;
  }

  update(ctx: AnnContext) {
    this.ctx = ctx;
    for (const it of this.items) {
      if (!this.show(it, ctx.fade[it.spec.group])) continue;
      switch (it.spec.kind) {
        case "linear":
          this.linear(it, it.spec);
          break;
        case "angle":
          this.angle(it, it.spec);
          break;
        case "leader":
          this.leader(it, it.spec);
          break;
        case "box":
          this.box(it, it.spec);
          break;
        case "travel":
          this.travel(it, it.spec);
          break;
        case "balloon":
          this.balloon(it, it.spec);
          break;
        case "cut":
          this.cut(it, it.spec);
          break;
      }
    }
  }

  private linear(it: Item, s: LinearAnn) {
    const A = s.a(this.w1);
    const B = s.b(this.w2);
    if (!A || !B) return this.show(it, 0);
    const len = s.off.length() || 1;
    const k = (gap: number) => (len + gap) / len;
    // extension lines: a small gap off the feature, overshoot past the dimension line
    const a0 = this.project(this.w3.copy(s.off).multiplyScalar(0.008 / len).add(A), this.s1);
    const a1 = this.project(this.w3.copy(s.off).multiplyScalar(k(0.012)).add(A), this.s2);
    this.setLine(it.els[0], a0, a1);
    const b0 = this.project(this.w3.copy(s.off).multiplyScalar(0.008 / len).add(B), this.s1);
    const b1 = this.project(this.w3.copy(s.off).multiplyScalar(k(0.012)).add(B), this.s2);
    this.setLine(it.els[1], b0, b1);
    const da = this.project(this.w3.copy(A).add(s.off), this.s3);
    const db = this.project(this.w4.copy(B).add(s.off), this.s4);
    this.setLine(it.els[2], da, db);
    this.setArrow(it.els[3], da, da.x - db.x, da.y - db.y);
    this.setArrow(it.els[4], db, db.x - da.x, db.y - da.y);
    this.place(it.labels[0], (da.x + db.x) / 2, (da.y + db.y) / 2);
  }

  private angle(it: Item, s: AngleAnn) {
    const C = s.c(this.w1);
    const U = s.u(this.w2);
    const V = s.v(this.w3);
    if (!C || !U || !V) return this.show(it, 0);
    U.normalize();
    V.normalize();
    const theta = Math.acos(Math.min(1, Math.max(-1, U.dot(V))));
    const W = this.w4.copy(V).addScaledVector(U, -U.dot(V)).normalize();
    const c = this.project(C, this.s1);
    const pts: string[] = [];
    const N = 18;
    let prev = { x: 0, y: 0 };
    let first = { x: 0, y: 0 };
    let last = { x: 0, y: 0 };
    let beforeLast = { x: 0, y: 0 };
    let second = { x: 0, y: 0 };
    const p = new THREE.Vector3();
    for (let i = 0; i <= N; i++) {
      const t = (theta * i) / N;
      p.copy(C).addScaledVector(U, Math.cos(t) * s.r).addScaledVector(W, Math.sin(t) * s.r);
      const q = this.project(p, { x: 0, y: 0 });
      pts.push(`${f1(q.x)},${f1(q.y)}`);
      if (i === 0) first = q;
      if (i === 1) second = q;
      if (i === N - 1) beforeLast = q;
      if (i === N) last = q;
      prev = q;
    }
    void prev;
    it.els[2].setAttribute("points", pts.join(" "));
    this.setArrow(it.els[3], first, first.x - second.x, first.y - second.y);
    this.setArrow(it.els[4], last, last.x - beforeLast.x, last.y - beforeLast.y);
    // reference line (horizontal) and the launch ray, a little longer than the arc
    const ref = this.project(p.copy(C).addScaledVector(U, s.r * 1.45), this.s2);
    this.setLine(it.els[0], c, ref);
    const ray = this.project(p.copy(C).addScaledVector(V, s.r * 1.6), this.s3);
    this.setLine(it.els[1], c, ray);
    const mid = this.project(
      p
        .copy(C)
        .addScaledVector(U, Math.cos(theta / 2) * s.r * 1.42)
        .addScaledVector(W, Math.sin(theta / 2) * s.r * 1.42),
      this.s4,
    );
    this.place(it.labels[0], mid.x, mid.y);
  }

  private leader(it: Item, s: LeaderAnn) {
    const P = s.at(this.w1);
    if (!P) return this.show(it, 0);
    const p = this.project(P, this.s1);
    const ex = p.x + s.dx;
    const ey = p.y + s.dy;
    const shoulder = s.dx >= 0 ? 14 : -14;
    it.els[0].setAttribute("cx", f1(p.x));
    it.els[0].setAttribute("cy", f1(p.y));
    it.els[1].setAttribute("points", `${f1(p.x)},${f1(p.y)} ${f1(ex)},${f1(ey)} ${f1(ex + shoulder)},${f1(ey)}`);
    this.place(it.labels[0], ex + shoulder + (s.dx >= 0 ? 4 : -4), ey, s.dx >= 0 ? "translate(0, -50%)" : "translate(-100%, -50%)");
  }

  private box(it: Item, s: BoxAnn) {
    const { min, max } = s;
    const corners = [
      [min.x, min.y, min.z],
      [max.x, min.y, min.z],
      [max.x, min.y, max.z],
      [min.x, min.y, max.z],
      [min.x, max.y, min.z],
      [max.x, max.y, min.z],
      [max.x, max.y, max.z],
      [min.x, max.y, max.z],
    ].map(([x, y, z]) => this.project(this.w1.set(x, y, z), { x: 0, y: 0 }));
    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];
    edges.forEach(([a, b], i) => this.setLine(it.els[i], corners[a], corners[b]));
    if (it.labels[0]) {
      // tag the highest projected corner
      let top = corners[0];
      for (const c of corners) if (c.y < top.y) top = c;
      this.place(it.labels[0], top.x, top.y - 12, "translate(-50%, -100%)");
    }
  }

  private travel(it: Item, s: TravelAnn) {
    const C = s.c(this.w1);
    if (!C) return this.show(it, 0);
    const at = (a: number, r = s.r) => this.project(this.w2.set(C.x + Math.sin(a) * r, C.y, C.z + Math.cos(a) * r), { x: 0, y: 0 });
    const N = 48;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) pts.push(at(s.from + ((s.to - s.from) * i) / N));
    it.els[1].setAttribute("points", pts.map((q) => `${f1(q.x)},${f1(q.y)}`).join(" "));
    this.setArrow(it.els[2], pts[0], pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    this.setArrow(it.els[3], pts[N], pts[N].x - pts[N - 1].x, pts[N].y - pts[N - 1].y);
    // dead zone wedge (the rest of the circle, behind)
    const c = this.project(C, this.s1);
    const dead: string[] = [`M${f1(c.x)},${f1(c.y)}`];
    const M = 10;
    const span = Math.PI * 2 - (s.to - s.from);
    for (let i = 0; i <= M; i++) {
      const q = at(s.to + (span * i) / M, s.r * 1.12);
      dead.push(`L${f1(q.x)},${f1(q.y)}`);
    }
    dead.push("Z");
    it.els[0].setAttribute("d", dead.join(" "));
    const fwd = at(0, s.r * 1.25);
    this.setLine(it.els[4], c, fwd);
    const lab = at(0, s.r * 1.42);
    this.place(it.labels[0], lab.x, lab.y);
    if (it.labels[1]) {
      const back = at(Math.PI, s.r * 1.42);
      this.place(it.labels[1], back.x, back.y);
    }
  }

  private balloon(it: Item, s: BalloonAnn) {
    const P = s.at(this.w1);
    if (!P) return this.show(it, 0);
    const p = this.project(P, this.s1);
    const c = this.ctx!.centre;
    let dx = p.x - c.x;
    let dy = p.y - c.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) {
      dx = 0;
      dy = -1;
    } else {
      dx /= len;
      dy /= len;
    }
    const L = 44 + Math.max(0, 60 - len) * 0.6;
    const bx = p.x + dx * L;
    const by = p.y + dy * L;
    it.els[0].setAttribute("cx", f1(p.x));
    it.els[0].setAttribute("cy", f1(p.y));
    this.setLine(it.els[1], p, { x: bx - dx * 11, y: by - dy * 11 });
    it.els[2].setAttribute("cx", f1(bx));
    it.els[2].setAttribute("cy", f1(by));
    it.els[3].setAttribute("x", f1(bx));
    it.els[3].setAttribute("y", f1(by + 0.5));
  }

  private cut(it: Item, s: CutAnn) {
    const x = s.x();
    const H = s.height;
    const z0 = s.z0;
    const z1 = s.z1;
    const p = [
      this.project(this.w1.set(x, 0, z0), { x: 0, y: 0 }),
      this.project(this.w1.set(x, 0, z1), { x: 0, y: 0 }),
      this.project(this.w1.set(x, H, z1), { x: 0, y: 0 }),
      this.project(this.w1.set(x, H, z0), { x: 0, y: 0 }),
    ];
    for (let i = 0; i < 4; i++) this.setLine(it.els[i], p[i], p[(i + 1) % 4]);
    // cutting-plane line ends on the floor, beyond the envelope, with arrows showing the direction
    // of sight (toward −X: looking from the removed side at what remains)
    const ext = 0.07;
    const ea0 = this.project(this.w1.set(x, 0, z0 - ext), { x: 0, y: 0 });
    const ea1 = this.project(this.w1.set(x, 0, z0 - 0.012), { x: 0, y: 0 });
    const eb0 = this.project(this.w1.set(x, 0, z1 + ext), { x: 0, y: 0 });
    const eb1 = this.project(this.w1.set(x, 0, z1 + 0.012), { x: 0, y: 0 });
    this.setLine(it.els[4], ea0, ea1);
    this.setLine(it.els[5], eb0, eb1);
    // legs from the outer end of each thick segment toward −X, arrowheads at their tips
    const ta = this.project(this.w1.set(x - 0.055, 0, z0 - ext), { x: 0, y: 0 });
    const tb = this.project(this.w1.set(x - 0.055, 0, z1 + ext), { x: 0, y: 0 });
    this.setLine(it.els[6], ea0, ta);
    this.setLine(it.els[7], eb0, tb);
    this.setArrow(it.els[8], ta, ta.x - ea0.x, ta.y - ea0.y);
    this.setArrow(it.els[9], tb, tb.x - eb0.x, tb.y - eb0.y);
    const la = this.project(this.w1.set(x - 0.08, 0, z0 - ext - 0.012), { x: 0, y: 0 });
    const lb = this.project(this.w1.set(x - 0.08, 0, z1 + ext + 0.012), { x: 0, y: 0 });
    this.place(it.labels[0], la.x, la.y);
    this.place(it.labels[1], lb.x, lb.y);
  }
}
