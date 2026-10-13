// Like shoot-all.mjs, but sets the site's persisted theme (next-themes localStorage "theme")
// before each page loads — the site ignores prefers-color-scheme (dark default + manual toggle),
// so this is how to QA the light theme. Also supports --reduced (prefers-reduced-motion).
// Usage: node scripts/shoot-themed.mjs --theme light [--out dir] [--routes /,/team,...] [--full] [--reduced]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Git Bash rewrites args that start with "/" into Windows paths ("/team" -> "C:/Program Files/Git/team").
// Undo that so routes work from any shell.
const unmangle = (a) => (/^[A-Za-z]:[\/]+Program Files[\/]+Git(?=[\/]|$)/i.test(a) ? a.replace(/^[A-Za-z]:[\/]+Program Files[\/]+Git/i, "") || "/" : a);
const args = process.argv.slice(2).map((a) => a.split(",").map(unmangle).join(","));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const base = opt("base", process.env.BASE_URL ?? "http://localhost:3000");
const outDir = opt("out", "scripts/shots/themed");
const routes = opt("routes", "/,/team,/outreach,/robot,/cad,/code,/sponsors,/links").split(",");
const full = flag("full");
const theme = opt("theme", flag("light") ? "light" : "dark");
const scheme = theme;
const sizes = [
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
];

fs.mkdirSync(outDir, { recursive: true });

async function launch() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
    } catch {}
  }
  return chromium.launch();
}

const browser = await launch();
const results = [];

for (const size of sizes) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    isMobile: size.mobile,
    hasTouch: size.mobile,
    colorScheme: scheme,
    reducedMotion: flag("reduced") ? "reduce" : "no-preference",
  });
  await context.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }, theme);
  for (const route of routes) {
    const page = await context.newPage();
    const issues = [];
    page.on("console", (m) => m.type() === "error" && issues.push(m.text()));
    page.on("pageerror", (e) => issues.push(e.message));
    let status = 0;
    try {
      const res = await page.goto(base + route, { waitUntil: "networkidle", timeout: 90_000 });
      status = res?.status() ?? 0;
      await page.waitForTimeout(2000);
      if (full) {
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 100));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(500);
      }
      // clientWidth, not innerWidth: in mobile emulation innerWidth grows to fit wide content,
      // which would hide the very overflow we're looking for.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) issues.push(`horizontal overflow: ${overflow}px`);
    } catch (e) {
      issues.push(`[goto] ${e.message}`);
    }
    const slug = (route === "/" ? "home" : route.slice(1).replace(/\//g, "_")) + `-${size.name}`;
    const file = path.join(outDir, `${slug}.png`);
    await page.screenshot({ path: file, fullPage: full }).catch(() => {});
    results.push({ route, size: size.name, status, file, issues });
    console.log(`${status} ${route} [${size.name}]${issues.length ? `  ⚠ ${issues.length} issue(s): ${issues.slice(0, 3).join(" | ")}` : ""}`);
    await page.close();
  }
  await context.close();
}
await browser.close();

// Contact sheet: one row per route, desktop left, mobile right (top 900px of each).
const cellH = 450;
const rows = [];
for (const route of routes) {
  const d = results.find((r) => r.route === route && r.size === "desktop");
  const m = results.find((r) => r.route === route && r.size === "mobile");
  const tiles = [];
  for (const r of [d, m]) {
    if (!r || !fs.existsSync(r.file)) continue;
    const img = sharp(r.file);
    const meta = await img.metadata();
    const crop = await img
      .extract({ left: 0, top: 0, width: meta.width, height: Math.min(meta.height, r.size === "desktop" ? 900 : 844) })
      .resize({ height: cellH })
      .png()
      .toBuffer();
    tiles.push(crop);
  }
  rows.push(tiles);
}
const widths = await Promise.all(rows.map(async (t) => (await Promise.all(t.map(async (b) => (await sharp(b).metadata()).width))).reduce((a, b) => a + b + 12, 0)));
const sheetW = Math.max(...widths, 400);
const composite = [];
let y = 0;
for (const tiles of rows) {
  let x = 0;
  for (const b of tiles) {
    composite.push({ input: b, left: x, top: y });
    x += (await sharp(b).metadata()).width + 12;
  }
  y += cellH + 12;
}
const sheet = path.join(outDir, "_contact-sheet.png");
await sharp({ create: { width: sheetW, height: Math.max(y, 1), channels: 3, background: "#111" } })
  .composite(composite)
  .png()
  .toFile(sheet);
fs.writeFileSync(path.join(outDir, "_results.json"), JSON.stringify(results, null, 2));
console.log(`contact sheet: ${sheet}`);
