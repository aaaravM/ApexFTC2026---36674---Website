// Generate the site icons from the wings mark — `npm run icons`.
//   src/app/icon.svg        browser tab icon (wings on the graphite plate, light ink)
//   src/app/apple-icon.png  180×180 home-screen icon
//   src/app/favicon.ico     16 + 32 px PNG-in-ICO for clients that ask for /favicon.ico
// Source: src/components/brand/wings-paths.ts (the vector trace of the team's logo).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const src = fs.readFileSync(path.join(ROOT, "src/components/brand/wings-paths.ts"), "utf8");
const pick = (name) => src.match(new RegExp(`${name} =\\s*"([^"]+)"`))[1];
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))));
const left = round(pick("WING_LEFT_PATH"));
const right = round(pick("WING_RIGHT_PATH"));

const PLATE = "#0E0E0D";
const INK = "#ECECE7";

/** Square icon: wings centred on a plate with 2px-radius corners (scaled). */
function iconSvg(size = 64, { plate = true, pad = 0.12 } = {}) {
  const vbW = 803;
  const vbH = 578;
  const inner = 1 - pad * 2;
  const scale = (size * inner) / vbW;
  const w = vbW * scale;
  const h = vbH * scale;
  const tx = (size - w) / 2;
  const ty = (size - h) / 2;
  const r = Math.max(1, size * 0.06);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${
    plate ? `<rect width="${size}" height="${size}" rx="${r}" fill="${PLATE}"/>` : ""
  }<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})" fill="${INK}" fill-rule="evenodd"><path d="${left}"/><path d="${right}"/></g></svg>`;
}

const appDir = path.join(ROOT, "src", "app");
fs.writeFileSync(path.join(appDir, "icon.svg"), iconSvg(64));
await sharp(Buffer.from(iconSvg(180, { pad: 0.14 }))).png().toFile(path.join(appDir, "apple-icon.png"));

// favicon.ico with two PNG entries (16, 32)
const pngs = await Promise.all([16, 32].map((s) => sharp(Buffer.from(iconSvg(s, { pad: 0.06 }))).png().toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const entries = pngs.map((buf, i) => {
  const size = [16, 32][i];
  const e = Buffer.alloc(16);
  e.writeUInt8(size, 0);
  e.writeUInt8(size, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(buf.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += buf.length;
  return e;
});
fs.writeFileSync(path.join(appDir, "favicon.ico"), Buffer.concat([header, ...entries, ...pngs]));

console.log("wrote src/app/icon.svg, src/app/apple-icon.png, src/app/favicon.ico");
