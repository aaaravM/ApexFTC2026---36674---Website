// Rough performance probe: frame rate while idle and while scrolling, long tasks, CLS, LCP, JS weight.
// Usage: node scripts/perf.mjs /robot [--mobile] [--cpu 4]   (--cpu throttles the CPU to mimic a mid-range phone)
import { chromium } from "playwright";

// Git Bash rewrites args that start with "/" into Windows paths ("/team" -> "C:/Program Files/Git/team").
// Undo that so routes work from any shell.
const unmangle = (a) => (/^[A-Za-z]:[\/]+Program Files[\/]+Git(?=[\/]|$)/i.test(a) ? a.replace(/^[A-Za-z]:[\/]+Program Files[\/]+Git/i, "") || "/" : a);
const args = process.argv.slice(2).map((a) => a.split(",").map(unmangle).join(","));
const flag = (n) => args.includes(`--${n}`);
const opt = (n, f) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : f;
};
const route = args.find((a) => a.startsWith("/")) ?? "/";
const base = opt("base", process.env.BASE_URL ?? "http://localhost:3000");
const mobile = flag("mobile");
const cpu = Number(opt("cpu", mobile ? 4 : 1));

let browser;
for (const channel of ["chrome", "msedge"]) {
  try {
    browser = await chromium.launch({ channel, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
    break;
  } catch {}
}
browser ??= await chromium.launch();

const context = await browser.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: mobile ? 3 : 1,
  isMobile: mobile,
  hasTouch: mobile,
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });

await page.addInitScript(() => {
  window.__perf = { cls: 0, lcp: 0, longTasks: 0, longTaskMs: 0 };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__perf.cls += e.value; })).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__perf.lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__perf.longTasks++; window.__perf.longTaskMs += e.duration; })).observe({ type: "longtask", buffered: true });
});

let jsBytes = 0;
page.on("response", async (r) => {
  if (r.request().resourceType() === "script") {
    const len = Number(r.headers()["content-length"] ?? 0);
    jsBytes += len || (await r.body().catch(() => Buffer.alloc(0))).length;
  }
});

const t0 = Date.now();
await page.goto(base + route, { waitUntil: "networkidle", timeout: 120_000 });
const loadMs = Date.now() - t0;
await page.waitForTimeout(1500);

const measureFps = (ms) =>
  page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        let frames = 0;
        let worst = 0;
        let last = performance.now();
        const start = last;
        const tick = (now) => {
          frames++;
          worst = Math.max(worst, now - last);
          last = now;
          if (now - start < ms) requestAnimationFrame(tick);
          else resolve({ fps: Math.round((frames * 1000) / (now - start)), worstFrameMs: Math.round(worst) });
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );

const idle = await measureFps(3000);
const scrollPromise = (async () => {
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(90);
  }
})();
const scrolling = await measureFps(2800);
await scrollPromise;
const vitals = await page.evaluate(() => window.__perf);
const heap = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));

console.log(JSON.stringify({
  route, mobile, cpuThrottle: cpu, loadMs,
  idle, scrolling,
  lcpMs: Math.round(vitals.lcp), cls: Number(vitals.cls.toFixed(3)),
  longTasks: vitals.longTasks, longTaskMs: Math.round(vitals.longTaskMs),
  jsKB: Math.round(jsBytes / 1024), heapMB: heap,
}, null, 2));
await browser.close();
