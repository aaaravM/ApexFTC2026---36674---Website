// Screenshot helper for visual QA.
// Usage: node scripts/shot.mjs <path> [--out dir] [--w 1440] [--h 900] [--full] [--mobile] [--scroll 0.5] [--wait 1500] [--dark|--light]
// Examples:
//   node scripts/shot.mjs /team --full
//   node scripts/shot.mjs /robot --mobile --scroll 0.4
// Uses the locally installed Chrome (falls back to Edge), so no browser download is needed.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

// Git Bash rewrites args that start with "/" into Windows paths ("/team" -> "C:/Program Files/Git/team").
// Undo that so routes work from any shell.
const unmangle = (a) => (/^[A-Za-z]:[\/]+Program Files[\/]+Git(?=[\/]|$)/i.test(a) ? a.replace(/^[A-Za-z]:[\/]+Program Files[\/]+Git/i, "") || "/" : a);
const args = process.argv.slice(2).map((a) => a.split(",").map(unmangle).join(","));
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

const route = args.find((a) => a.startsWith("/")) ?? "/";
const base = opt("base", process.env.BASE_URL ?? "http://localhost:3000");
const mobile = flag("mobile");
const width = Number(opt("w", mobile ? 390 : 1440));
const height = Number(opt("h", mobile ? 844 : 900));
const outDir = opt("out", "scripts/shots");
const scroll = Number(opt("scroll", 0));
const wait = Number(opt("wait", 1500));
const scheme = flag("light") ? "light" : "dark";

fs.mkdirSync(outDir, { recursive: true });

async function launch() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({
        channel,
        args: ["--use-angle=d3d11", "--enable-gpu-rasterization", "--ignore-gpu-blocklist"],
      });
    } catch {}
  }
  return chromium.launch();
}

const browser = await launch();
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
  colorScheme: scheme,
  reducedMotion: flag("reduced") ? "reduce" : "no-preference",
});
const page = await context.newPage();
const logs = [];
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(base + route, { waitUntil: "networkidle", timeout: 90_000 }).catch((e) => logs.push(`[goto] ${e.message}`));
if (flag("skip-intro")) await page.evaluate(() => sessionStorage.setItem("apex:intro", "seen"));
await page.waitForTimeout(wait);

if (scroll > 0) {
  // Scroll in steps so scroll-driven animations and lazy sections run.
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const target = scroll <= 1 ? total * scroll : scroll;
  for (let y = 0; y <= target; y += 300) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(wait);
}

const slug = (route === "/" ? "home" : route.replace(/^\//, "").replace(/[\/?=&]/g, "_")) +
  (mobile ? "-mobile" : "") + (scroll ? `-s${scroll}` : "") + (flag("full") ? "-full" : "") + (scheme === "light" ? "-light" : "");
const file = path.join(outDir, `${slug}.png`);

if (flag("full")) {
  // Walk the page first so reveal-on-scroll content is visible in the full capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}

await page.screenshot({ path: file, fullPage: flag("full") });
console.log(`saved ${file}`);
if (logs.length) console.log(`console issues (${logs.length}):\n` + logs.slice(0, 30).join("\n"));
await browser.close();
