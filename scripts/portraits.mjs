// Engraved team portraits (DESIGN_SPEC §6) — run with `npm run portraits`.
//
// For every face-centred crop public/team/<slug>.jpg (made from <slug>-full.jpg), writes
// public/team/engraved/<slug>.webp: 800×1000, greyscale, CLAHE-normalised, tone-matched to the
// same mean/contrast as the rest of the set, mapped to the site duotone (#0E0E0D → #ECECE7) with
// a fine deterministic grain. Mismatched phone photos come out as one deliberate print series.
// Also writes public/team/engraved/_pending.webp — the wings "PHOTO PENDING" plate.
//
// Re-run whenever a student adds a photo. Safe to run any number of times.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const IN = path.join(ROOT, "public", "team");
const OUT = path.join(IN, "engraved");
const W = 800;
const H = 1000;
const TARGET_MEAN = 118; // tone match target (0–255)
const TARGET_SD = 60;
const DARK = [0x0e, 0x0e, 0x0d];
const LIGHT = [0xec, 0xec, 0xe7];
const GRAIN = 7; // ± levels of grain

fs.mkdirSync(OUT, { recursive: true });

// Deterministic PRNG (same grain every run → no noisy diffs).
function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth S-curve tone mapping for 0–1 values (a gentle engraving-like contrast). */
const tone = (x) => {
  const s = x * x * (3 - 2 * x); // smoothstep
  return 0.55 * x + 0.45 * s;
};

async function engrave(file, slug) {
  const { data, info } = await sharp(file)
    .rotate()
    .resize(W, H, { fit: "cover", position: sharp.strategy.attention })
    .grayscale()
    .normalise({ lower: 1, upper: 99 })
    .clahe({ width: 96, height: 96, maxSlope: 3 })
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Tone-match every portrait to the same mean / standard deviation.
  let sum = 0;
  let sum2 = 0;
  for (const v of data) {
    sum += v;
    sum2 += v * v;
  }
  const mean = sum / data.length;
  const sd = Math.sqrt(Math.max(1, sum2 / data.length - mean * mean));
  const gain = TARGET_SD / sd;

  const rand = mulberry32([...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 36674));
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < data.length; i++) {
    let g = (data[i] - mean) * gain + TARGET_MEAN;
    g = Math.min(255, Math.max(0, g)) / 255;
    g = tone(g);
    // fine grain, stronger in the mid-tones (like ink on paper)
    const midtone = 1 - Math.abs(g - 0.5) * 2;
    g += ((rand() - 0.5) * 2 * GRAIN * (0.35 + 0.65 * midtone)) / 255;
    g = Math.min(1, Math.max(0, g));
    const o = i * 3;
    out[o] = Math.round(DARK[0] + (LIGHT[0] - DARK[0]) * g);
    out[o + 1] = Math.round(DARK[1] + (LIGHT[1] - DARK[1]) * g);
    out[o + 2] = Math.round(DARK[2] + (LIGHT[2] - DARK[2]) * g);
  }

  const dest = path.join(OUT, `${slug}.webp`);
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: 82, effort: 6 })
    .toFile(dest);
  return { slug, mean: mean.toFixed(1), sd: sd.toFixed(1), dest: path.relative(ROOT, dest) };
}

async function pendingPlate() {
  const wings = fs.readFileSync(path.join(ROOT, "public", "brand", "wings.svg"), "utf8").replace(/fill="#[0-9A-Fa-f]{6}"/, 'fill="#7F7F7F"');
  const wingsPng = await sharp(Buffer.from(wings)).resize(Math.round(W * 0.46)).png().toBuffer();
  const meta = await sharp(wingsPng).metadata();
  // hatch: 1px diagonal lines every 7px at low contrast
  const hatch = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><pattern id="h" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1" height="7" fill="#2B2B29"/></pattern></defs><rect width="100%" height="100%" fill="#1F1F1D"/><rect width="100%" height="100%" fill="url(#h)"/>` +
      `<text x="50%" y="${H - 48}" text-anchor="middle" font-family="monospace" font-size="22" letter-spacing="3" fill="#9C9C96">PHOTO PENDING</text></svg>`,
  );
  const dest = path.join(OUT, "_pending.webp");
  await sharp(hatch)
    .composite([{ input: wingsPng, left: Math.round((W - meta.width) / 2), top: Math.round((H - meta.height) / 2) - 30, blend: "over" }])
    .webp({ quality: 82 })
    .toFile(dest);
  return path.relative(ROOT, dest);
}

const crops = fs
  .readdirSync(IN)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !/-full\.(jpe?g|png|webp)$/i.test(f));

const results = [];
for (const f of crops) {
  const slug = f.replace(/\.(jpe?g|png|webp)$/i, "");
  results.push(await engrave(path.join(IN, f), slug));
}
const plate = await pendingPlate();
for (const r of results) console.log(`engraved ${r.slug.padEnd(24)} (source mean ${r.mean}, sd ${r.sd}) → ${r.dest}`);
console.log(`plate    → ${plate}`);
console.log(`${results.length} portrait(s) done.`);
