/**
 * Procedural textures (canvas → THREE.CanvasTexture), created lazily on the client and cached.
 * Nothing here downloads anything. Text is drawn in the site's own fonts (read from the CSS
 * variables next/font sets on <html>); textures are redrawn once those fonts have loaded.
 */
import * as THREE from "three";
import { CHANNEL } from "./dimensions";

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { c, ctx };
}

function finish(tex: THREE.Texture, color: boolean) {
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function cached<T extends THREE.Texture>(key: string, make: () => T): T {
  const hit = cache.get(key);
  if (hit) return hit as T;
  const t = make();
  cache.set(key, t);
  return t;
}

const FALLBACK_SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const FALLBACK_MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

/** The site's font stacks (next/font CSS variables), or a system stack outside the site. */
function siteFont(kind: "display" | "text" | "mono") {
  if (typeof document === "undefined") return kind === "mono" ? FALLBACK_MONO : FALLBACK_SANS;
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--ff-${kind}`).trim();
  const fallback = kind === "mono" ? FALLBACK_MONO : FALLBACK_SANS;
  return v ? `${v}, ${fallback}` : fallback;
}

/**
 * Draw a text texture now (with whatever font is available), and once more after the site fonts
 * finish loading, so the first frame never waits on a font and the final look uses the real one.
 */
function textTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, fonts: string[]) {
  return cached(key, () => {
    const { c, ctx } = canvas(w, h);
    draw(ctx, w, h);
    const t = finish(new THREE.CanvasTexture(c), true);
    if (typeof document !== "undefined" && document.fonts) {
      Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => [])))
        .then(() => {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, w, h);
          draw(ctx, w, h);
          t.needsUpdate = true;
        })
        .catch(() => {});
    }
    return t;
  });
}

/** Draw a capsule (slot) from (x1,y1) to (x2,y2) with radius r. */
function slot(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, r: number) {
  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.lineWidth = r * 2;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function hole(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * goBILDA 1120 U-channel face pattern, ONE 24 mm period (u) × 48 mm face (v), as an alpha map
 * (white = metal, black = hole). From the 1120 drawing: 8 mm grid, Ø4 holes at (±8, ±8) and
 * (±8, ±16) around each Ø14 bore, vertical slots above/below the bore, horizontal slots between bores.
 * UV convention: u = along-length / 24 mm (bore centred at u = 0.5), v = (across + 24 mm) / 48 mm.
 * (The shader draws the same pattern procedurally; this map is a reference / fallback.)
 */
export function channelHoleAlpha() {
  return cached("channel-alpha", () => {
    const pxPerMm = 10;
    const W = CHANNEL.pitchMm * pxPerMm; // 240
    const H = CHANNEL.outerMm * pxPerMm; // 480
    const { c, ctx } = canvas(256, 512);
    ctx.scale(256 / W, 512 / H);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    const X = (mm: number) => mm * pxPerMm;
    const Y = (mm: number) => (24 - mm) * pxPerMm; // across-axis, +up
    const r4 = X(2);
    hole(ctx, X(12), Y(0), X(7));
    for (const dx of [-8, 8]) for (const dy of [-16, -8, 8, 16]) hole(ctx, X(12 + dx), Y(dy), r4);
    slot(ctx, X(12), Y(12), X(12), Y(19), r4);
    slot(ctx, X(12), Y(-12), X(12), Y(-19), r4);
    slot(ctx, X(-4), Y(0), X(4), Y(0), r4);
    slot(ctx, X(20), Y(0), X(28), Y(0), r4);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return finish(t, false);
  });
}

/** A UV inside channelHoleAlpha() that is solid metal (for end faces and edges). */
export const CHANNEL_SOLID_UV: [number, number] = [8 / 24, 0.75];

/**
 * goBILDA pattern-plate cell (24 × 24 mm): Ø14 bore in the middle, Ø4 holes on the 16 mm square
 * and on the cell edges. Tiles in both directions.
 */
export function gridPlateAlpha() {
  return cached("grid-alpha", () => {
    const N = 256;
    const s = N / 24;
    const { c, ctx } = canvas(N, N);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, N, N);
    ctx.fillStyle = "#000";
    hole(ctx, 12 * s, 12 * s, 7 * s);
    for (const [x, y] of [
      [4, 4],
      [20, 4],
      [4, 20],
      [20, 20],
      [12, 0],
      [12, 24],
      [0, 12],
      [24, 12],
    ])
      hole(ctx, x * s, y * s, 2 * s);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return finish(t, false);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Top label of a REV hub: dark panel, port legend and the hub name. Canvas TOP = the hub's
 * motor/encoder edge, canvas BOTTOM = its servo edge (ControlHub turns the label plane so the text
 * reads from behind the robot, where the electronics are shown).
 */
export function hubLabel(variant: "control" | "expansion") {
  const display = siteFont("display");
  const mono = siteFont("mono");
  return textTexture(
    `hub2-${variant}`,
    1024,
    740,
    (ctx, W, H) => {
      ctx.fillStyle = "#2c2f34";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#3a3e45";
      roundRect(ctx, 70, 90, W - 140, H - 180, 26);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 3;
      ctx.stroke();
      // motor port legend along the top edge (4 ports)
      ctx.fillStyle = "rgba(235,235,230,0.85)";
      ctx.font = `600 22px ${mono}`;
      ctx.textAlign = "center";
      for (let i = 0; i < 4; i++) {
        const x = 150 + i * 120;
        ctx.fillText(String(i), x, 70);
        ctx.fillRect(x - 40, 40, 80, 3);
      }
      ctx.textAlign = "left";
      ctx.fillText("MOTOR", 640, 70);
      // servo header legend along the bottom edge (6 ports)
      ctx.textAlign = "center";
      for (let i = 0; i < 6; i++) {
        const x = 130 + i * 92;
        ctx.fillText(String(i), x, H - 46);
        ctx.fillRect(x - 30, H - 34, 60, 3);
      }
      ctx.textAlign = "left";
      ctx.fillText("SERVO", 700, H - 46);
      // name
      ctx.fillStyle = "#e9e7e1";
      ctx.font = `700 64px ${display}`;
      ctx.fillText(variant === "control" ? "CONTROL HUB" : "EXPANSION HUB", 130, 330);
      ctx.font = `500 26px ${mono}`;
      ctx.fillStyle = "rgba(233,231,225,0.6)";
      ctx.fillText(variant === "control" ? "REV-31-1595" : "REV-31-1153", 134, 380);
      ctx.fillStyle = "rgba(233,231,225,0.25)";
      ctx.fillRect(130, 410, 520, 2);
      ctx.fillStyle = "rgba(233,231,225,0.16)";
      for (let i = 0; i < 4; i++) {
        roundRect(ctx, 130 + i * 70, 450, 52, 110, 8);
        ctx.fill();
      }
      // status LED window
      ctx.fillStyle = "#16181b";
      roundRect(ctx, W - 230, 150, 110, 60, 12);
      ctx.fill();
    },
    [`700 64px ${display}`, `600 22px ${mono}`],
  );
}

/**
 * FTC robot sign [CM R401–R403]: solid alliance colour, white team number in ≈ 2.25 in numerals
 * inside the 0.25 in border, and nothing else. The canvas is 5 px/mm of the 200 × 70 mm sign.
 */
export function numberPlate(teamNumber: string, alliance: "red" | "blue") {
  const display = siteFont("display");
  return textTexture(
    `sign-${teamNumber}-${alliance}`,
    1000,
    350,
    (ctx, W, H) => {
      ctx.fillStyle = alliance === "red" ? "#c8232c" : "#1f4fd8";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      // size the numerals to a 57 mm cap height (285 px), then condense to fit inside the border
      ctx.font = `800 100px ${display}`;
      const m = ctx.measureText("0");
      const cap = (m.actualBoundingBoxAscent || 72) / 100;
      const size = 285 / cap;
      ctx.font = `800 ${size.toFixed(0)}px ${display}`;
      const width = ctx.measureText(teamNumber).width;
      const usable = W - 2 * 6.35 * 5 - 30;
      const sx = Math.min(1, usable / width);
      ctx.save();
      ctx.translate(W / 2, H / 2 + 285 / 2);
      ctx.scale(sx, 1);
      ctx.fillText(teamNumber, 0, 0);
      ctx.restore();
    },
    [`800 100px ${display}`],
  );
}

/** Battery shrink-wrap label. */
export function batteryLabel() {
  const display = siteFont("display");
  return textTexture(
    "battery2",
    1024,
    400,
    (ctx, W) => {
      ctx.fillStyle = "#17181a";
      ctx.fillRect(0, 0, W, 400);
      ctx.fillStyle = "#f2c200";
      ctx.fillRect(0, 120, W, 160);
      ctx.fillStyle = "#17181a";
      ctx.font = `800 92px ${display}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText("12V  NiMH", 60, 200);
      ctx.font = `700 54px ${display}`;
      ctx.textAlign = "right";
      ctx.fillText("3000 mAh", W - 60, 200);
    },
    [`800 92px ${display}`],
  );
}

/** @deprecated The studio metals no longer use a roughness map (it was sub-pixel at robot scale). */
export function roughnessNoise() {
  return cached("rough-noise", () => {
    const N = 64;
    const { c, ctx } = canvas(N, N);
    const img = ctx.createImageData(N, N);
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < N * N; i++) {
      const v = 200 + Math.floor(rnd() * 55);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return finish(t, false);
  });
}

/** Radial motion-blur streaks for fast spinning parts (alpha in the red channel; centre clear). */
export function spinBlurTexture() {
  return cached("spin-blur", () => {
    const N = 256;
    const { c, ctx } = canvas(N, N);
    const img = ctx.createImageData(N, N);
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    // concentric rings of slightly different density = circular streaks once spinning
    const rings = Array.from({ length: 64 }, () => 0.55 + rnd() * 0.45);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const dx = (x + 0.5) / N - 0.5;
        const dy = (y + 0.5) / N - 0.5;
        const r = Math.sqrt(dx * dx + dy * dy) * 2; // 0 centre → 1 rim
        const band = rings[Math.min(63, Math.floor(r * 64))];
        const edge = Math.max(0, Math.min(1, (1 - r) / 0.04)) * Math.max(0, Math.min(1, (r - 0.16) / 0.08));
        const v = Math.round(255 * band * edge);
        const i = (y * N + x) * 4;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    return finish(t, false);
  });
}
