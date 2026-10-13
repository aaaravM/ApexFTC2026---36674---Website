"use client";

import * as THREE from "three";
import { useRigRef } from "../context";
import { DERIVED, HOPPER, INTAKE, liftPoint, TURRET } from "../dimensions";
import { AssemblyBuilder, cachedAssembly, inMetres, Mm, StaticAssembly } from "../assembly";
import { cachedGeo, chamferCyl, cyl, deg, lathe, ring, sphere } from "../geometry";
import { HitProxy, type ProxyBox } from "../parts/PartMesh";
import { servoGeometries } from "../parts/Servo";
import { rmm } from "./util";

/**
 * Hopper + lift. The roller pushes a ball under itself and up a clear polycarbonate scoop that is
 * concentric with it and funnels from full width at the lip to the lift throat. The scoop runs
 * tangentially into a 60° chute; two urethane round-belt runs pinch the ball from the sides (6 mm
 * on POLLEN, compliant for NECTAR) and carry it up and back to the turret bore. The belts are the
 * team's "leftintake" / "rightintake" continuous-rotation servos, mounted behind the chute floor.
 * Every passage is ≥ BALL_PATH_CLEAR_MM wide.
 */

const RX = INTAKE.rollerXmm;
const RZ = INTAKE.rollerZmm;
const [DX, DZ] = DERIVED.liftDir; // up-and-back
const [BX, BZ] = DERIVED.liftBack; // toward the chute floor
const PULLEY_Y = HOPPER.beltContactYmm + HOPPER.beltRadiusMm + HOPPER.pulleyGrooveRadiusMm; // ≈ 41
/** Scoop end: where the scoop runs tangentially into the chute floor. */
const SCOOP_END_DEG = 210;

/** Half-width of the scoop at angle a (deg): full width at the lip, funnelled to the throat. */
function scoopHalfWidth(aDeg: number) {
  const t = Math.min(1, Math.max(0, (aDeg - 216) / (266 - 216)));
  const s = t * t * (3 - 2 * t);
  return INTAKE.throatHalfWidthMm + (INTAKE.scoopHalfWidthMm - INTAKE.throatHalfWidthMm) * s;
}

/** Robot-frame mm (x, y, z) → three metres, as a Vector3. */
const V = (x: number, y: number, z: number) => new THREE.Vector3(y * 0.001, z * 0.001, x * 0.001);

/** Thin solid on a grid: `pos(i, j)` = inner surface, `off(i, j)` = outward offset. Metres. */
function gridSolid(nu: number, nv: number, pos: (u: number, v: number) => THREE.Vector3, thickness: (u: number, v: number) => THREE.Vector3) {
  const verts: number[] = [];
  const idx: number[] = [];
  const add = (p: THREE.Vector3) => {
    verts.push(p.x, p.y, p.z);
    return verts.length / 3 - 1;
  };
  const layer = (outer: boolean) => {
    const base = verts.length / 3;
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const p = pos(i / nu, j / nv);
        if (outer) p.add(thickness(i / nu, j / nv));
        add(p);
      }
    return base;
  };
  const a = layer(false);
  const b = layer(true);
  const at = (base: number, i: number, j: number) => base + j * (nu + 1) + i;
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      idx.push(at(a, i, j), at(a, i + 1, j), at(a, i + 1, j + 1), at(a, i, j), at(a, i + 1, j + 1), at(a, i, j + 1));
      idx.push(at(b, i, j), at(b, i + 1, j + 1), at(b, i + 1, j), at(b, i, j), at(b, i, j + 1), at(b, i + 1, j + 1));
    }
  // rims
  const rim = (i0: number, j0: number, i1: number, j1: number) => {
    idx.push(at(a, i0, j0), at(b, i0, j0), at(b, i1, j1), at(a, i0, j0), at(b, i1, j1), at(a, i1, j1));
  };
  for (let i = 0; i < nu; i++) {
    rim(i + 1, 0, i, 0);
    rim(i, nv, i + 1, nv);
  }
  for (let j = 0; j < nv; j++) {
    rim(0, j, 0, j + 1);
    rim(nu, j + 1, nu, j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Funnel scoop: concentric with the roller, variable width. */
function scoopGeometry() {
  return cachedGeo("scoop-funnel", () => {
    const a0 = SCOOP_END_DEG;
    const a1 = INTAKE.scoopStartDeg;
    const r = INTAKE.scoopRadiusMm;
    const t = INTAKE.scoopThicknessMm;
    return gridSolid(
      36,
      10,
      (u, v) => {
        const a = a0 + (a1 - a0) * u;
        const w = scoopHalfWidth(a);
        const rad = deg(a);
        return V(RX + r * Math.cos(rad), -w + 2 * w * v, RZ + r * Math.sin(rad));
      },
      (u) => {
        const rad = deg(a0 + (a1 - a0) * u);
        return V(t * Math.cos(rad), 0, t * Math.sin(rad));
      },
    );
  });
}

/** Funnel side wall: rises from the scoop edge toward the roller axis (stays outside the flaps). */
function funnelWallGeometry(side: 1 | -1) {
  return cachedGeo(`funnel-wall-${side}`, () => {
    const a0 = SCOOP_END_DEG;
    const a1 = 262;
    const r0 = INTAKE.scoopRadiusMm;
    const r1 = INTAKE.rollerFlapRadiusMm + 4;
    return gridSolid(
      24,
      2,
      (u, v) => {
        const a = a0 + (a1 - a0) * u;
        const rad = deg(a);
        const r = r0 + (r1 - r0) * v;
        return V(RX + r * Math.cos(rad), side * scoopHalfWidth(a), RZ + r * Math.sin(rad));
      },
      () => V(0, side * 2, 0),
    );
  });
}

/** Chute floor: clear strip along the lift, ~one ball radius behind the ball-centre line. */
function chuteFloorGeometry() {
  return cachedGeo("lift-floor", () => {
    const off = HOPPER.floorOffsetMm;
    const half = 58;
    const s0 = 0;
    const s1 = HOPPER.liftLengthMm - 4;
    return gridSolid(
      2,
      2,
      (u, v) => {
        const s = s0 + (s1 - s0) * u;
        const [x, z] = liftPoint(s);
        return V(x + BX * off, -half + 2 * half * v, z + BZ * off);
      },
      () => V(BX * 2.5, 0, BZ * 2.5),
    );
  });
}

/** Round-belt pulley (Ø18 groove), axle along local +Y, centred. In mm. */
function beltPulley() {
  return lathe(
    [
      [3.1, -3.6],
      [11.5, -3.6],
      [11.5, -2.4],
      [9, -0.8],
      [8.6, 0],
      [9, 0.8],
      [11.5, 2.4],
      [11.5, 3.6],
      [3.1, 3.6],
    ],
    24,
  );
}

/** Closed round belt around the two pulleys of one side (in the plane spanned by the lift dir and y). Metres. */
function roundBeltGeometry(side: 1 | -1) {
  return cachedGeo(`lift-belt-${side}`, () => {
    const Rg = HOPPER.pulleyGrooveRadiusMm;
    const pts: THREE.Vector3[] = [];
    const c0 = liftPoint(HOPPER.pulleyLowMm);
    const c1 = liftPoint(HOPPER.pulleyHighMm);
    const n = 14;
    // around the top pulley (from the inner run to the outer run), then the bottom one
    for (let k = 0; k <= n; k++) {
      const a = -Math.PI / 2 + (k / n) * Math.PI; // -90° (inner) → +90° (outer), through "up the incline"
      const along = Rg * Math.cos(a);
      const across = Rg * Math.sin(a);
      pts.push(V(c1[0] + DX * along, side * (PULLEY_Y + across), c1[1] + DZ * along));
    }
    for (let k = 0; k <= n; k++) {
      const a = Math.PI / 2 + (k / n) * Math.PI;
      const along = Rg * Math.cos(a);
      const across = Rg * Math.sin(a);
      pts.push(V(c0[0] + DX * along, side * (PULLEY_Y + across), c0[1] + DZ * along));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    return new THREE.TubeGeometry(curve, 72, HOPPER.beltRadiusMm * 0.001, 6, true);
  });
}

/** Rotation that maps a part's local +Y onto `dir` and local +X onto `xDir` (three axes). */
function basis(xDir: THREE.Vector3, yDir: THREE.Vector3) {
  const z = new THREE.Vector3().crossVectors(xDir, yDir).normalize();
  return new THREE.Matrix4().makeBasis(xDir.clone().normalize(), yDir.clone().normalize(), z);
}

/** Robot-frame direction → three direction. */
const D = (x: number, y: number, z: number) => new THREE.Vector3(y, z, x);

export const LIFT_PULLEYS = { y: PULLEY_Y, low: liftPoint(HOPPER.pulleyLowMm), high: liftPoint(HOPPER.pulleyHighMm) };

const build = cachedAssembly("hopper-lift", () => {
  const b = new AssemblyBuilder();
  // ---- scoop (funnelled) + stiffening ribs underneath (kept ≥ 8 mm above the tiles)
  b.add("polycarb", scoopGeometry());
  for (const s of [-1, 1] as const) b.add("polycarb", funnelWallGeometry(s));
  for (const y of [-30, 0, 30]) {
    const rib = gridSolid(
      16,
      1,
      (u, v) => {
        const a = deg(216 + (252 - 216) * u);
        const r = INTAKE.scoopRadiusMm + INTAKE.scoopThicknessMm + 6 * v;
        return V(RX + r * Math.cos(a), y - 1.2, RZ + r * Math.sin(a));
      },
      () => V(0, 2.4, 0),
    );
    b.add("polycarb", rib);
  }
  // ---- lift chute floor (clear)
  b.add("polycarb", chuteFloorGeometry());
  // ---- belt runs: pulleys on stub axles from the chute floor, round urethane belts
  const pulley = inMetres(beltPulley());
  const stub = inMetres(cyl(3, HOPPER.floorOffsetMm, 10));
  const backDir = D(BX, 0, BZ);
  const alongDir = D(DX, 0, DZ);
  for (const side of [-1, 1] as const) {
    for (const c of [LIFT_PULLEYS.low, LIFT_PULLEYS.high]) {
      const m = basis(alongDir, backDir).setPosition(V(c[0], side * PULLEY_Y, c[1]));
      b.add("plasticDark", pulley, m);
      const ms = basis(alongDir, backDir).setPosition(V(c[0] + (BX * HOPPER.floorOffsetMm) / 2, side * PULLEY_Y, c[1] + (BZ * HOPPER.floorOffsetMm) / 2));
      b.add("steel", stub, ms);
    }
    b.add("urethane", roundBeltGeometry(side));
  }
  // ---- CR servos behind the chute floor, splines through it into the top pulleys' stub axles
  const servo = servoGeometries();
  const behind = HOPPER.floorOffsetMm + 2.5;
  const servoBasis = basis(alongDir, backDir.clone().negate());
  for (const side of [-1, 1] as const) {
    const c = LIFT_PULLEYS.high;
    const m = servoBasis.clone().setPosition(V(c[0] + BX * behind, side * PULLEY_Y, c[1] + BZ * behind));
    b.addPart(servo, m);
  }
  // printed bracket tying the two servos together just below them, on the back of the floor
  {
    const c = liftPoint(HOPPER.pulleyHighMm - 40);
    const m = basis(alongDir, backDir).setPosition(V(c[0] + BX * (behind + 14), 0, c[1] + BZ * (behind + 14)));
    const bar = new THREE.BoxGeometry(12, 26, 2 * PULLEY_Y + 24);
    bar.scale(0.001, 0.001, 0.001);
    b.add("plasticDark", bar, m);
    for (const side of [-1, 1]) {
      const sc = inMetres(chamferCyl(3.4, 2, 0.4, 12));
      const p = liftPoint(HOPPER.pulleyHighMm - 40);
      b.add("fastener", sc, basis(alongDir, backDir).setPosition(V(p[0] + BX * (HOPPER.floorOffsetMm - 1), side * 26, p[1] + BZ * (HOPPER.floorOffsetMm - 1))));
    }
  }
  // ---- aluminium flange under the turret base plate around the bore (the ball rises through it)
  b.add("aluminium", inMetres(ring(51, 60, 3, 48, 0.4)), Mm(rmm(TURRET.axisXmm, 0, TURRET.basePlateZmm - 1.5)));
  return b.build();
});

/** Ball positions (robot mm) for the preloaded POLLEN that wait in the hopper / lift. */
export function preloadPositions(): [number, number, number][] {
  const r = DERIVED.pollenRadiusMm;
  const p0 = liftPoint(6);
  const p1 = liftPoint(6 + 2 * r + 0.5);
  return [
    [p0[0], 0, p0[1]],
    [p1[0], 0, p1[1]],
  ];
}

const buildPreload = (count: number) =>
  cachedAssembly(`preload-lift-${count}`, () => {
    const b = new AssemblyBuilder();
    const ball = inMetres(sphere(DERIVED.pollenRadiusMm, 28, 18));
    preloadPositions()
      .slice(0, count)
      .forEach((p) => b.add("ballPollen", ball, Mm(rmm(...p))));
    return b.build();
  });
const PRELOAD_BUILDERS = [1, 2].map((n) => buildPreload(n));

const PROXY: readonly ProxyBox[] = [
  // scoop under the roller
  [52, 172, -118, 118, 6, 122],
  // lift chute + servos
  [-22, 100, -60, 60, 60, 178],
];

/** `preload` 1–2 balls wait here; the third preloaded ball is staged on the turret (Shooter). */
export function Hopper({ preload = 0 }: { preload?: number }) {
  const anchor = useRigRef<THREE.Object3D>("anchor.hopper");
  const beltL = useRigRef<THREE.Object3D>("liftBelt.l");
  const n = Math.max(0, Math.min(2, Math.round(preload)));
  const mid = liftPoint(50);
  return (
    <>
      <StaticAssembly build={build} skipEdges={["fastener", "nylonYellow", "steel", "led", "nylonWhite", "urethane"]} />
      {n > 0 ? <StaticAssembly build={PRELOAD_BUILDERS[n - 1]} /> : null}
      <HitProxy boxes={PROXY} />
      <object3D ref={beltL} position={rmm(mid[0], PULLEY_Y, mid[1])} />
      <object3D ref={anchor} position={rmm(mid[0] + 8, 66, mid[1])} />
    </>
  );
}
