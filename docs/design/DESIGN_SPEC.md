# APEX ROBOTICS — DESIGN SPEC v1 · "Engraved Instrument"
Single source of truth for every build agent. Decided by the design lead from research/design-direction.md (recommended
direction), research/interaction-eng.md, the three component-library reports, research/biobuzz-first.md, CONTENT.md and
USER-REQUIREMENTS.md (the user's own instructions — they override anything here).

---------------------------------------------------------------------------------------------------------------------
## 0. North star
The site is the **instrument panel of a real machine, drawn in the line-engraving style of the wings logo**.
- Every section contains something only Apex has: their robot, their code, their people, their real numbers. If a section
  would look the same with another team's name on it, it's wrong.
- Motion = **mechanisms**: damped, settling, purposeful. Every animation explains a state, a cause or a space.
- Brand thread: **APEX = the highest point of a trajectory.** Their robot computes and launches arcs (src/lib/ballistics.ts
  `apexOf()`). The arc + apex marker is a recurring graphic motif (thin hairline parabola with a small tick + mono label
  "APEX · 42.4 in").
- Voice: a product manual, not a pitch deck. Specific, numeric, plain. "Fixed 40° hood. 4-inch flywheel. The solver finds
  flight time in 2 passes standing still, 4–6 while strafing." No "unleash/elevate/seamless/cutting-edge", no emoji, no rhetorical triplets.
- Self-test per section: (1) could this exist on another team's site? (2) does every animated thing explain a state, cause
  or space? (3) is every number real? One "no" → rework.

## 1. Tokens (Palette A "Graphite / Pollen", dark-first; light theme supported)
Dark is the default theme (`<html class="dark">` via next-themes `defaultTheme="dark"`, `attribute="class"`,
`enableSystem={false}`). Light theme is a real, polished alternative (toggle in header + ⌘K).

| token | dark | light | use |
|---|---|---|---|
| --bg | #0E0E0D | #F4F4F1 | page ground |
| --surface-1 | #171716 | #FFFFFF | panels |
| --surface-2 | #1F1F1D | #ECECE8 | raised panels, button rest |
| --surface-logo | #242424 | #242424 | plate behind the wings mark when shown as a "badge" |
| --hairline | #2B2B29 | #D6D6D0 | 1px decorative rules, panel outlines (decorative only) |
| --border-ui | #6B6B66 | #7F7F7A | interactive borders (≥3:1) |
| --text | #ECECE7 | #111110 | body text (16.3:1 / 17.2:1) |
| --muted | #9C9C96 | #5C5C57 | secondary text (7.0:1 / 6.1:1) |
| --wing | #7F7F7F | #7F7F7F | the wings mark ink, large display only |
| --pollen | #F7E326 | #F7E326 | THE accent (official BIOBUZZ yellow). On light: fills only, always with ink text/1px ink outline |
| --pollen-ink | #0E0E0D | #0E0E0D | text on pollen fills |
| --pollen-text | #F7E326 | #7A6A00 | yellow-family TEXT (light uses the dark ochre for 4.9:1) |
| --data-red | #FF5A4E | #D21F1F | alliance/NECTAR data ONLY |
| --data-blue | #4C8DFF | #0066B3 | alliance/NECTAR data ONLY |
| --focus | #F7E326 | #111110 | 2px focus ring + 2px offset |

shadcn token mapping (so cult/watermelon/skiper "-base" components inherit the system):
`--background=bg, --foreground=text, --card=surface-1, --card-foreground=text, --popover=surface-2,
--popover-foreground=text, --primary=text, --primary-foreground=bg, --secondary=surface-2, --secondary-foreground=text,
--muted=surface-2, --muted-foreground=muted, --accent=surface-2, --accent-foreground=text, --destructive=data-red,
--border=hairline, --input=border-ui, --ring=focus, --radius=0.125rem, --chart-1..5 = text, muted, wing, pollen, border-ui`.
Yellow is NOT shadcn `--accent` (that would paint every menu hover yellow).

**Yellow budget:** pollen covers ≤ ~3% of any screen: POLLEN balls, the READY/active state, focus ring, the primary
action's hover fill, at most one word or number per screen. Red/blue never decorative; always with a redundant cue
(R/B glyph, position, or hatch).

### Typography (all OFL, `next/font/google`, self-hosted at build)
```ts
// src/app/fonts.ts
import { Hubot_Sans, Mona_Sans, Martian_Mono } from "next/font/google";
export const display = Hubot_Sans({ subsets: ["latin"], axes: ["wdth"], variable: "--ff-display", display: "swap" });
export const text = Mona_Sans({ subsets: ["latin"], axes: ["wdth"], variable: "--ff-text", display: "swap" });
export const mono = Martian_Mono({ subsets: ["latin"], axes: ["wdth"], variable: "--ff-mono", display: "swap" });
```
```css
@theme inline { --font-display: var(--ff-display); --font-sans: var(--ff-text); --font-mono: var(--ff-mono); }
```
(Never name the next/font variable the same as the theme key — circular. shadcn init writes `--font-sans: var(--font-sans)`;
replace it with the mapping above.) Width axis = `font-stretch: 75%..125%` (Tailwind `font-stretch-125%`).

| role | font | settings | size |
|---|---|---|---|
| wordmark (home hero, footer) | Hubot Sans | UPPERCASE, wdth 125, wght 300, tracking +0.04em | clamp(56px, 15.5vw, 260px), lh 0.86 |
| display (page H1) | Hubot Sans | sentence case, wdth 112, wght 600, tracking −0.01em | clamp(44px, 7.2vw, 112px), lh 0.94 |
| h2 | Hubot Sans | wdth 108, wght 560 | clamp(30px, 3.6vw, 52px), lh 1.0 |
| h3 | Mona Sans | wdth 100, wght 600 | 20–24px |
| lede | Mona Sans | wght 400 | clamp(18px, 1.5vw, 22px), lh 1.45, max 56ch, color muted→text mix |
| body | Mona Sans | wght 400 (560 for emphasis) | 16–17px, lh 1.55, max 68ch |
| label | Martian Mono | UPPERCASE, wdth 100, wght 400, tracking +0.08em | 11–12px |
| data | Martian Mono | tabular-nums (`font-variant-numeric: tabular-nums`) | 12–14px; big figures clamp(40px, 5vw, 72px) wght 300 |
| code | Martian Mono | wdth 87.5, ligatures off | 13px, lh 1.6 |
Emphasis comes from width/weight or pollen colour — never serif italic, never gradient text. FIRST must be italic: Hubot/Mona
have real italics (load `style: ["normal","italic"]` if next/font requires it for the italic face).

### Space, grid, shape
- 4px base. Section vertical padding `clamp(88px, 12vw, 168px)`. Page margin `clamp(16px, 4vw, 56px)`.
- 12-col grid, max content width 1440px, gutter `clamp(16px, 2vw, 28px)`.
- Radius scale: **0** (panels, cards, images) · **2px** (buttons, inputs, chips, kbd) · **full** (status dots/LEDs only).
- Depth from rules + tone, not shadows. No drop shadows except the 3D scene's own.
- Texture: a static grain overlay (SVG feTurbulence, 3–4% opacity, `pointer-events:none`, fixed) site-wide;
  cult `texture-overlay` crosshatch/halftone at 4–8% inside select panels; CAD sheet uses a paper grid.
- z-index: canvas 0 · content 10 · sticky UI 30 · header 50 · overlays/drawers 60 · command palette 70 · toasts 80.

## 2. Motion tokens
```css
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);    /* entrances, reveals */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* state changes, transitions */
--ease-in: cubic-bezier(0.55, 0, 1, 0.45);     /* exits only */
--dur-micro: 120ms; --dur-small: 220ms; --dur-medium: 420ms; --dur-large: 900ms;
```
- motion springs: **servo** `{type:"spring", stiffness:260, damping:30, mass:1}` (turret, reticle, active indicators);
  **heavy** `{stiffness:120, damping:24, mass:1.6}` (exploded parts, chassis, robot side-to-side moves).
- In R3F `useFrame`: `THREE.MathUtils.damp(cur, target, λ, delta)` (λ≈8–12 turret, 4–6 chassis) + slew-rate clamp.
- Stagger 30–50ms, max 6 items. Exits ≈70% of entrance duration. Input feedback starts < 100ms.
- Root `<MotionConfig reducedMotion="user">`. Reduced motion: no scroll-scrubbed transforms (show end states), no Lenis,
  no idle 3D animation, crossfades ≤150ms only.
- **Lenis** (lenis/react `ReactLenis root`, `lerp: 0.1`, `smoothWheel: true`), disabled on touch (`syncTouch:false`) and for
  reduced motion. Never scroll-jack (don't change scroll distance). Programmatic scroll via `lenis.scrollTo`. Overlays:
  `lenis.stop()/start()` + `data-lenis-prevent` on inner scroll areas.
- **Page transitions:** native React 19.3 `<ViewTransition>` + Next 16.4 `<Link transitionTypes={["nav-forward"]}>`
  (see node_modules/next/dist/docs/01-app/02-guides/view-transitions.md). Wrap each page's content (in page.tsx, not the
  layout) with enter/exit maps for `nav-forward`/`nav-back`, `default="none"`. Header anchored with
  `viewTransitionName: "site-header"`. Recipe: old content fades 150ms + 24px slide; new content 250ms after 100ms delay;
  total ≤ 450ms. `::view-transition { pointer-events: none; }`. Shared-element morph: team card portrait →
  /team/[slug] hero (`<ViewTransition name={"member-"+slug} share="morph" default="none">`). Reduced motion: crossfade only.
- **No full-page preloader.** Only 3D canvas regions show a ≤1s "SYSTEM CHECK" list driven by real drei `useProgress`
  (lines: `T1 ODOMETRY … OK`, `T4 HIVE TRACKER … OK`, `T5 FLYWHEEL … 5000 RPM MAX`); skipped on repeat visits
  (sessionStorage in try/catch) and with reduced motion.

## 3. Global shell
- **Header** (`src/components/site/header.tsx`): full-width bar, 56px, hairline bottom border, `bg-[var(--bg)]/85` + backdrop
  blur ONLY on subpages (never over a live canvas: on home it's transparent until the story ends). Left: wings mark (28px,
  draws on once per session) + "APEX ROBOTICS" (Hubot wdth 125 wght 400, 13px, tracking .16em, uppercase) + mono
  "FTC 36674". Right: nav (Mona 14px; active = 1px pollen underline sliding with motion `layoutId` + servo spring;
  hover = text→text, underline draws), live clock `TRACY 21:24 PT` (mono 11px; client-only, renders `TRACY --:-- PT` on
  the server), ⌘K button (`kbd` chip), theme toggle. `style={{ viewTransitionName: "site-header" }}`.
  Mobile (<900px): wings + name + "MENU" button → cult **family-drawer** (vaul) with nav list (big Hubot links with mono
  index numbers) + season quick facts.
- **Footer**: giant wordmark "APEX ROBOTICS" (Hubot wdth 125 wght 250, cropped by the page bottom), an engineering
  **title block** grid (DWG-001 · REV A · © 2026 · SHEET 1/1 · DRAWN BY APEX ROBOTICS · SCALE 1:1), nav + external links
  (GitHub repo, FTC Scout, FTC Events, sponsorship packet), a calm **Season/Program strip** with the OFFICIAL FIRST Tech
  Challenge + BIOBUZZ logo PNGs (reverse versions on dark, static, min sizes respected, with "Apex Robotics · Team 36674"
  beside them), the trademark line (see §7), and a "Colophon" line crediting Cult UI, Watermelon UI, Skiper UI (MIT
  notices) and fonts. BUILD_YEAR must be computed at module scope (cacheComponents forbids `new Date()` in render).
- **Command palette** (cmdk, ⌘K / Ctrl+K / "/"): pages, team members, robot subsystems, links, actions (toggle theme,
  "Fire POLLEN" on home). Mono group labels. Escape closes; focus returns.
- **Page header pattern** (`PageHeader`): eyebrow label `[ 03 / ROBOT ]` + H1 + lede + a meta row styled as a title block
  (`DWG-003 · REV A · UPDATED 2026-10-12`). Left-aligned, never centered.
- **Section label** (`SectionLabel`): mono `[ SUB-04 / TURRET ]` + hairline rule extending right.
- **Buttons**: primary = surface-2 bg + 1px border-ui + text; hover/focus-visible fills pollen with pollen-ink text in
  120ms. Secondary = text link with "→" that nudges 4px on hover + underline draw. 2px radius.
- **Chips**: mono 11px uppercase, 1px hairline, 2px radius, 4px 8px padding.
- **Spec table**: mono label left (muted), value right (text, tabular), hairline row rules, optional source ref
  (`RobotConstants.java · Shoot.LAUNCH_PITCH_DEG`) in tiny muted mono.
- **Wings mark** (`src/components/brand/apex-wings.tsx`, paths in `wings-paths.ts`): props `size`, `animate`
  ("draw" | "flap" | "none"). Draw-on: render each path with transparent fill + 0.8px stroke `pathLength=1`, animate
  dashoffset 1→0 over 700ms ease-in-out, then crossfade fill in 250ms, then each wing rotates ±3° about its root
  (left pivot ≈ (388,540), right ≈ (415,540) in the 803×578 viewBox) with the servo spring. Once per session.
- **Reveal**: one section-level clip/mask reveal at 20% visibility, --dur-medium, --ease-out, once. Most text is static.
- **Grain overlay** fixed full-screen, static.
- `<MotionConfig reducedMotion="user">`, `ThemeProvider`, `ReactLenis`, command palette, toaster in the root layout.

## 4. 3D (robot engine at src/components/robot — built by a parallel workflow; read its index.ts API)
- Site render look: **"clay" in graphite** — matte/satin graphite metals (#2A2A28–#4A4A46), slightly lighter edges,
  cool rim light, NO saturated colours on the robot except functional micro-accents in --wing grey; **POLLEN balls are the
  only yellow** (#F7E326); NECTAR balls use --data-red/--data-blue. CAD page uses the **"blueprint"** look.
  (Final look tuning is done in visual QA — keep it a single prop.)
- Stage: lightformer studio (no external HDRI downloads), soft contact shadow, graphite ground that fades into --bg via
  fog/vignette; dpr [1, 1.75]; one WebGL context per page; `frameloop` set to "never" when the route is hidden by
  Activity (cacheComponents keeps 3 routes mounted — see interaction-eng.md §9.3 `SceneShell` fix) and when offscreen
  (IntersectionObserver).
- Client-only: either `next/dynamic(..., {ssr:false})` from a client file or React 19.3 `use(browser())` inside
  `<Suspense fallback={<Poster/>}>` so static HTML carries a poster (an inline SVG line drawing of the robot or a still).
- **Scroll-spin (user requirement):** chassis yaw driven by scroll progress (smoothly damped), reversible. Turret holds a
  world-space target: `turretYaw = clamp(wrap(azimuthToTarget − chassisYaw), ±170°)`; when the turret hits a limit it
  shows LIMIT (honest), the chassis keeps spinning.
- **Real model swap (user requirement):** `src/content/robot.ts` exports `modelSrc` = "/models/apex-r1.glb" if
  `public/models/apex-r1.glb` exists at build time (fs check in a server module), else null → procedural. A `RobotModel`
  component renders the GLB via drei `useGLTF` when available, mapping node names (`drivetrain`, `intake`, `hopper`,
  `turret`, `shooter`, `vision`, `electronics`, `odometry`, optional `flywheel`, `wheel_fl|fr|bl|br`) onto the same rig
  props; missing names degrade gracefully (whole model still renders + spins). `docs/ROBOT-MODEL.md` explains export from
  Onshape (native GLB since 1.217) and Fusion 360 (STEP → Onshape → GLB, or FBX → Blender → GLB), compression and naming.
  `npm run model:check` (gltf-transform inspect) reports size + found/missing names.
- Concept-model honesty: wherever the procedural robot appears, a small mono caption: `CONCEPT MODEL · GENERATED FROM
  RobotConstants.java · REAL CAD PENDING` (hidden automatically when a real GLB is present).
- The HIVE target in scenes is OUR stylised line-art HIVE (proportioned from the manual: CELL opening ~20×14 in, pivot
  ~43.95 in high), never FIRST's field CAD.

## 5. Pages

### HOME `/` — the user's choreography (USER-REQUIREMENTS #4 — implement exactly)
One long scroll story with a sticky full-viewport stage (`position: sticky; top:0; height:100svh`) holding the R3F canvas
and the DOM overlay; scroll progress (motion `useScroll` on the story container) drives everything. Total story length
≈ 7–8 viewport heights on desktop.
1. **NAME (0 → 1.0 vh)** — first screen is only the name: wings mark (draws on, ~120px) above **"APEX ROBOTICS"** in the
   wordmark style (two lines on mobile, one line on wide screens), below it a mono line
   `FIRST® TECH CHALLENGE · TEAM 36674 · TRACY, CA · BIOBUZZ™ 2026–27`, and a scroll cue `SCROLL ↓` (mono, subtle).
   The robot is not visible yet (or a faint, tiny silhouette at the vanishing point).
2. **INTO THE ROBOT (1.0 → 2.0 vh)** — scroll-scrubbed and reversible: every letter of the wordmark accelerates toward
   the stage centre (each letter on its own vector, slight stagger, scale → 0.1, blur 0→6px, opacity → 0) as if being
   absorbed; at the same time the robot scales up from 0.4 → 1 out of that centre point and its chassis begins to spin;
   the wings mark lifts and fades into the header's mark. The name must read as *disappearing into the robot*.
3. **THE STORY (2.0 → ~7.0 vh)** — robot pinned and **spinning with scroll** (≈ 1 full turn per 2 chapters; turret
   counter-rotates holding lock on a target point). Six chapters; for each, the robot **glides to one side** (heavy
   spring; achieve by shifting the canvas content / camera view offset so the robot occupies the left or right ~45% of the
   screen) and the chapter text occupies the other side; text panels crossfade/slide in as their chapter becomes active
   and never overlap the robot. Alternate sides: R, L, R, L, R, L.
   - C1 **Who we are** — H2 "Twelve students. One rookie season. One machine." Body: "We're Apex Robotics — *FIRST*®
     Tech Challenge Team 36674 from Tracy, California, competing in BIOBUZZ™ presented by RTX." Mini stats (real):
     `12 STUDENTS · ROOKIE YEAR 2026 · FOUNDED BY ANISH P.` Link → /team.
   - C2 **APEX-R1** — "A turret shooter that aims while it drives." 3–4 key figures (18 in start cube · ±170° turret ·
     4 in flywheel · 40° fixed hood). Link → /robot.
   - C3 **Drive + odometry** — mecanum strafing, Pinpoint odometry fused IMU at 1500 Hz; robot highlights drivetrain,
     wheels spin.
   - C4 **Intake + sorter** — intake rollers; REV Color Sensor V3 classifies POLLEN vs NECTAR, sets RPM, ejects the
     opponent's NECTAR (rule G408 — "a rule-compliance feature, not just an efficiency one").
   - C5 **Turret + solver → the APEX** — the robot fires a POLLEN ball; the arc is drawn as a hairline with the apex
     tick + label `APEX · 42.4 in`; a cult **dynamic-island** HUD shows live solver values (RANGE · TOF · RPM · TURRET ·
     ITER) and four gate LEDs (SOLUTION · ON TARGET · AT SPEED · HIVE FRESH). Desktop: the canvas becomes interactive in
     this chapter — the watermelon **cursor** reticle (scoped) aims the turret at the pointer and click fires; touch:
     tap to fire. Copy: "Odometry says where we are. Vision says where the HIVE is. The solver closes the loop."
     Link → /code.
   - C6 **The season** — BIOBUZZ™ in three facts (POLLEN 2.8 in ×40 · NECTAR 3.6 in red/blue · HIVE TIP = 20 pts) and the
     strategy line "A TIP is worth ten CELL points — so we built for consistency: no shot fires until four gates agree."
4. **THE TEAM (after the story)** — the robot exits (drops/fades as the stage unpins); section label `[ THE TEAM ]`, H2
   "The people behind APEX-R1."; watermelon **team-5** expanding portrait strip adapted to 12 (two rows of 6 on desktop,
   swipe row on mobile), engraved duotone portraits + PHOTO PENDING plates; link "Meet the team →".
5. **EXPLORE + SPONSOR** — a compact index of the other pages as a numbered drawing-sheet list (01 TEAM … 07 LINKS) with
   one-line descriptions, and a sponsor band: "Become a Founding Partner" + Gold/Silver/Bronze thresholds + packet CTA.
6. Footer.
Mobile: same order; during the story the robot sits in the top ~55% of the viewport and chapter text in the bottom part
(no side-switching needed — instead the robot subtly shifts/zooms per chapter). Reduced motion: no scrubbing — show the
name, then a static robot render beside each chapter in normal flow.

### TEAM `/team` (+ `/team/[slug]`)
- PageHeader `[ 01 / TEAM ]` · H1 "Meet the team." · lede "Twelve students across CAD, code, build and outreach —
  founded by Anish Pattanaik in 2026." · meta row with live roster counts derived from data (CAD 8 · CODE 6 · BUILD 9 ·
  SOCIALS 1 · LEAD 1 — compute, don't hardcode).
- Filter: watermelon **continuous-tabs-base** (ALL · LEAD · CAD · CODE · BUILD · SOCIALS) with proper tablist semantics;
  grid reflows with motion `layout`.
- Roster grid (desktop 4 cols, tablet 3, mobile 2… 1 on <380px): each card = cult **cutout-card** shell restyled (0 radius
  panel, hairline border, cutout corner carries the mono index `#01 / 12`), portrait 4:5 with the build-time **engraved
  duotone** treatment (§6); hover/focus = **x-ray reveal**: original colour photo shown through a circular clip-path that
  follows the pointer (keyboard focus = centered circle grows). Name (Hubot wdth 108 wght 560), role line (mono), chips.
  Founder card gets a `FOUNDER` pollen tag. No-photo members: wings-mark plate in the same duotone + `PHOTO PENDING`.
- Click → `/team/[slug]` (generateStaticParams, NO `dynamicParams` export) with a ViewTransition portrait morph: large
  portrait with cult **dither-image** "develop" reveal (DitherImageReveal), name, role, disciplines, bio; pending bios show
  a designed `BIO PENDING` state (never invented text); prev/next member links; back link (nav-back).
- Privacy: `site.privacy.nameFormat` = "full" | "initial" (default "full" — the team already publishes full names; a coach
  may switch to first name + last initial per FIRST YPP guidance). Per-member `consent` flag gates the photo.

### ROBOT `/robot`
- PageHeader `[ 03 / ROBOT ]` · H1 "APEX-R1." · lede "A turret shooter for BIOBUZZ™ that aims while it drives."
  + concept-model caption.
- Sticky 3D stage + cult **feature-sticky-section** walkthrough (index: 01 DRIVE · 02 ODOMETRY · 03 INTAKE · 04 HOPPER ·
  05 TURRET · 06 SHOOTER · 07 VISION · 08 ELECTRONICS). Active panel → robot highlights + partially explodes that subsystem
  and the camera frames it; robot **spins with scroll** (user requirement). Panels = spec sheets with real values + source
  refs to RobotConstants.java / docs.
- Mode switch: cult **halo-segmented** (ASSEMBLED · EXPLODED · X-RAY) — strip its rainbow rims.
- Data sheet: 6 big figures (18 in · 104 mm · ±170° · 4 in · 40° · 5000 RPM) then a dense spec table.
- AIM playground: watermelon **run-widget-base** range ruler (RANGE TO HIVE, inches/feet ticks) + watermelon
  **knob-slider-base** turret dial (−170…+170 with hatched dead zone) + watermelon **gauge** flywheel RPM with READY band;
  all drive the 3D robot + solver readouts.
- Robot photo gallery: designed empty state `ROBOT PHOTOS PENDING — FIRST BUILD SEASON`.
- watermelon **scroll-island-base** as the page's section navigator (reads window/Lenis scroll).

### CAD `/cad`
- The page body is a **drawing sheet** on the light "drafting" sub-theme regardless of site theme: paper #EFEDE6, ink
  #141413, pencil #55534C, grid #D3D0C6, pollen highlighter fills; framed with border ticks + zone letters/numbers and a
  title block (DWG-004 · APEX-R1 GENERAL ASSEMBLY · REV A · SCALE 1:4 · DRAWN APEX ROBOTICS).
- Blueprint 3D viewer (robot look "blueprint"), OrbitControls allowed here, **section view** slider (clipping plane +
  cap), **explode** slider, cult **direction-aware-tabs** assembly switcher (FULL ASSEMBLY · DRIVETRAIN · INTAKE ·
  TURRET + SHOOTER), dimension callouts for real numbers (14 in muzzle, 40°, 18 in envelope).
- Design-story cards per mechanism (Requirement → Options → Decision + math → Iterations → Risk): requirements cite the
  manual (R102 18 in start cube; R105 18×24×29 in expansion; G407 ≤4 elements; G408 no opponent NECTAR); decisions use
  the real numbers (turret ±170° at 5:1, 4 in flywheel, fixed 40° hood, muzzle 14 in); iterations/risks are designed
  placeholders `PENDING — LOG FROM BUILD`.
- Model index CAD-001…004 (Full Assembly, Drivetrain, Intake, Scoring/Turret) with `PUBLIC ONSHAPE LINK PENDING`.
- Toolchain: Onshape · Fusion 360 · 3D print · mill.

### CODE `/code`
- PageHeader `[ 05 / CODE ]` · H1 "How APEX-R1 thinks." · lede "Java on the FTC SDK v12.0. One loop, six steps, four
  gates." · repo CTA (https://github.com/aaaravM/ApexFTC2026---36674).
- cult **terminal-animation** console with REAL content: tab 1 `./gradlew :TeamCode:assembleDebug` → BUILD SUCCESSFUL
  (from docs), tab 2 a solver run whose numbers are generated from src/lib/ballistics.ts at build time, tab 3 the tuning
  OpMode list T0→T6.
- **Live control-loop diagram**: Odometry → BallSorter → HiveTracker → Ballistics → Turret + Shooter → AimController,
  pulsing left→right at loop rate; each node expands to its one-line job.
- "Swap what each sensor is responsible for" comparison table (usual FTC vs BIOBUZZ).
- **Interactive solver**: side-view arc (with apex), top-down lead view (robot velocity vector, virtual target −v·t),
  POLLEN/NECTAR toggle, distance + velocity controls; formulas shown: `t = √(2(d·tanθ − h)/g)`,
  `rpm = 60·v / (η·π·D)`.
- **Four-gate panel**: toggle each gate; READY lights pollen only when all four pass (the real `isReadyToFire()`).
- Code excerpts via **shiki** in a `"use cache"` + `cacheLife("max")` function (shiki calls Date.now internally):
  `isReadyToFire()`, the solver loop, `muzzleSpeedToRpm`, `BallType`. Theme: custom monochrome + pollen.
- watermelon **tree-menu-base** "Explore the codebase" (TeamCode → subsystems/vision/util/opmodes → files with one-line
  descriptions and line counts).
- Tuning sequence T0–T6 + "Rules of the road" + stack list (Java 8 target · FTC SDK 12.0 · Gradle 9.1 · AGP 8.13.2 ·
  Pedro Pathing · goBILDA Pinpoint · AprilTag Clusters · Limelight 3A · VS Code/Cursor + adb).

### OUTREACH `/outreach`
- PageHeader `[ 02 / OUTREACH ]` · H1 "Engineering in the community." · lede (old site).
- Activity log as dated "mission" entries OUT-001…004 (Workshop / Event / Mentorship / Community — keep these labels;
  dates/reach `PENDING`), filterable; each entry a wide row with a hairline, mono ID, title, one-liner, tags.
- Impact strip with honest `—` placeholders labelled "Logged after our first season report" (no invented numbers).
- "Bring Apex to your school or event" CTA (contact via packet / future team inbox).

### SPONSORS `/sponsors`
- PageHeader `[ 06 / SPONSORS ]` · H1 "Become a Founding Partner." · lede from the packet ("As a rookie team in our
  inaugural season…").
- Tier spec cards from the REAL packet: GOLD $500+ · SILVER $250+ · BRONZE $100+ · IN-KIND (tools, materials,
  mentorship) — each with its real benefits list and an `OPEN SLOT` state (no fake sponsor names).
- "Where it goes": rookie startup budget $3,800–$5,500 with the packet's line items (≈$550 startup hardware, ≈$650+
  practice field, robot components, competition fees) as a simple hairline bar breakdown (only the two known amounts are
  sized; others marked "varies").
- CTA: View the sponsorship packet (real Google Doc link) + contact slot.
- watermelon **marquee** only for a real-data ticker (e.g. what sponsors fund), never a fake logo wall.

### LINKS `/links`
- PageHeader `[ 07 / LINKS ]` · H1 "Resources we use." · the 20 VERIFIED links from research/biobuzz-first.md §4 grouped
  Season · Our team · Build · Learn; directory rows: mono index, title, domain, one-line description, ↗; a filter input.

### 404 `not-found.tsx`
- watermelon **error-3** adapted: `NO SOLUTION — TARGET OUT OF RANGE (404)` + solver-style failReason line + buttons
  RETURN TO FIELD (home) / OPEN ⌘K.

## 6. Images
- Team portraits: build-time pipeline script `scripts/portraits.mjs` (sharp) → `public/team/engraved/<slug>.webp` (CLAHE-
  like normalisation via sharp `normalise()`/`clahe()`, greyscale, tone curve, duotone #0E0E0D→#ECECE7, fine grain) +
  colour originals for the x-ray reveal. Re-runnable when students add photos (`npm run portraits`).
- `next/image` for all raster images (local files only).

## 7. FIRST branding (mandatory)
- `<Mark id="first|ftc|biobuzz|canopy|gp" />` component renders *FIRST*® (italic caps), *FIRST*® Tech Challenge,
  FTC®, BIOBUZZ™ (caps) + "presented by RTX" on first body mention, *FIRST*® CANOPY™, Gracious Professionalism®; tracks
  first use per page. Never "BioBuzz", never possessive "FIRST's", never fuse ("ApexFTC").
- Official logos: static reverse PNGs from research-tmp/biobuzz-first/dl/logos (copy the needed ones to public/first/),
  min sizes (FTC horizontal ≥60px tall; BIOBUZZ lockup ≥336px wide), clear space, no CSS filters/animation, always next to
  "Apex Robotics · Team 36674".
- Footer trademark line: "*FIRST*®, *FIRST*® Tech Challenge, FTC®, *FIRST*® CANOPY™ and BIOBUZZ™ are trademarks of For
  Inspiration and Recognition of Science and Technology (*FIRST*). Apex Robotics (Team 36674) is a student team; this is
  not an official *FIRST* website." + link to firstinspires.org.
- Link to the manual (ftc.game/manual), never re-host it.

## 8. Component usage map (all three libraries must appear; restyle every one to these tokens — keep mechanics, delete
gradients/glows/rainbow rims; fix the a11y gaps listed in the reports; rewrite any `framer-motion` import to `motion/react`
and never add framer-motion to package.json)
- **Cult UI** (`npx shadcn@latest add @cult-ui/<name>`): family-drawer, dynamic-island, feature-sticky-section,
  cutout-card, dither-image (+ `@import "dither-plugin";`), terminal-animation (+ caret-blink keyframes), halo-segmented,
  direction-aware-tabs, texture-overlay, rolling-number, edge-blur.
- **Watermelon UI** (`npx shadcn@latest add https://registry.watermelon.sh/r/<name>.json`, prefer `-base` twins):
  cursor, run-widget-base, gauge, knob-slider-base, scroll-island-base, team-5, continuous-tabs-base, tree-menu-base,
  marquee (+ keyframes), error-3.
- **Skiper UI** (FREE only, `npx shadcn@latest add @skiper-ui/skiperN`): pick 3–5 from research/skiper-ui.md top picks
  (text/scroll/hover effects that fit the instrument voice — e.g. link hover rolls, scroll text reveals, theme-toggle
  transition), restyled.
- Keep MIT notices in installed files; list all three in the footer colophon.

## 9. Engineering rules (lab-verified gotchas — see research/interaction-eng.md)
- Root layout: `export const ensureStatic = "navigation";` — every route must stay fully static.
- No `new Date()`/`Date.now()` in server render (hoist to module scope); no `Math.random()` in client render (seeded PRNG
  or effects); shiki only inside `"use cache"` + `cacheLife("max")`; no `dynamicParams` export; dynamic routes need
  `generateStaticParams()`.
- cacheComponents keeps up to 3 visited routes mounted (Activity): prefix DOM ids per page; R3F canvases must
  `setFrameloop("never")` on hide (useLayoutEffect cleanup) — use one shared `SceneShell` wrapper.
- `<html suppressHydrationWarning>`; fixed `Intl.NumberFormat("en-US")` for numbers (no locale hydration mismatches).
- Every route: no console errors, no horizontal overflow at 390px, keyboard reachable, visible focus, reduced-motion path.
- Performance budget: home JS ≤ ~450 KB gz excluding three; LCP < 2.5s (desktop dev build excluded); CLS < 0.05; 3D ≥ 50fps
  on desktop GPU, pauses offscreen.

---------------------------------------------------------------------------------------------------------------------
## 10. ERRATA — verified critic corrections (MUST APPLY; they override anything above)
Source: research/BRIEF.md "## Critic corrections" (each tested). Owners in brackets.
1. **Theme scopes [foundation/integration, cad].** CSS custom properties resolve where they are DECLARED, so a subtree that only
   overrides raw tokens (e.g. `[data-surface="paper"]` setting `--bg/--text`) still renders every shadcn/registry token
   (`bg-background`, `text-foreground`, `border-border`, …) in the DARK values. Re-declare the full alias block (and derived
   color-mix tokens) on every themed scope: `:root, .dark, [data-surface="paper"] { --background: var(--bg); --foreground:
   var(--text); --card: …; --border: …; --ring: …; … }`. Verify on /cad by checking computed colours of a registry component.
2. **Solver copy [home, robot, code].** Never write "converges in 2–3 iterations". Truth (6,600-shot sweep): **2 passes when
   stationary; typically 4–6 while strafing (max 6)**. The HUD shows `ITER` live — copy must agree with it.
3. **Apex edge case [home, robot, code, ArcMotif].** With the fixed 40° hood the apex comes AFTER arrival when
   d < 2h / tan θ (≈ 86 in for a 36 in rise): the ball is still rising at the CELL. If `apex.time > solution.flightTimeSec`,
   do not draw an apex marker past the target — label it `RISING AT TARGET` (or hide it). Arc samples stop at the TOF.
   Valid window note: ~44 in fails on RPM (> 5000), 36 in fails geometrically ("back up").
4. **Library file locations [all].** Watermelon `-base` items installed FLAT in `src/components/` (`run-widget.tsx`,
   `knob-slider.tsx`, `continuous-tabs.tsx`, `tree-menu.tsx`, `scroll-island.tsx`); non-base ones in `src/components/ui/`.
   Import from where they actually are (check the foundation's API doc). `cursor`, `gauge`, `flip-clock`, `book`, `marquee`
   have NO `-base` twin (404) — use the originals and restyle by hand.
5. **react-icons [foundation/integration].** Swap the react-icons imports in run-widget/tree-menu for lucide or inline SVG,
   then `npm rm react-icons`. lucide 1.55 has NO brand icons (GitHub/Instagram/YouTube) — use inline SVG.
6. **Fonts [foundation/integration].** next/font preloads every file of a preloaded subset regardless of style: loading italic
   for both Hubot and Mona preloads ~+190 KB on every page. Drop the Hubot italic; load Mona italic as a SEPARATE instance
   (`style:"italic", preload:false, variable:"--ff-text-italic"`) and have `<Mark id="first">` use that family explicitly.
   Martian Mono has no italic (FIRST in mono labels = faux oblique; acceptable, or set those words in Mona).
7. **OG images [foundation/integration].** `ImageResponse` only accepts ttf/otf/woff — commit static TTF/OTF instances of the
   fonts for opengraph-image routes (next/font woff2 can't be reused).
8. **Deploy [integration].** Add `app/sitemap.ts` and `app/robots.ts` (static). `metadataBase` must not fall back to
   localhost in production: use `NEXT_PUBLIC_SITE_URL ?? (VERCEL_PROJECT_PRODUCTION_URL && "https://"+…) ?? localhost`.
9. **GLB loading [robot engine / RobotModel / docs].** drei `useGLTF` defaults Draco ON with decoders from **gstatic.com** and
   the DRACOLoader path is a module singleton reset on every call — self-host the decoders at `public/draco/gltf/` (copy from
   three/examples/jsm/libs/draco/gltf) and pass `"/draco/gltf/"` on EVERY `useGLTF(...)` AND `useGLTF.preload(...)` call.
10. **ROBOT-MODEL.md [foundation].** Onshape export dialog: tick **"Export models oriented Y axis up"** (glTF is Y-up, Onshape is
    Z-up — otherwise the model loads on its side); leave **"Export unique parts as individual files" unchecked**; tick
    Compress. Tell students to verify part names with `npm run model:check` because whether sub-assembly instance names
    survive as glTF node names is unverified.
11. **Skiper attribution [all].** Skiper free items REQUIRE attribution ("Attribution to Skiper UI is required when using the
    free version") — keep each file's header incl. upstream "inspired by" credits, and credit Skiper UI in the footer
    colophon. Never publish the components as a kit.
12. **Wings draw-on [foundation].** The wing paths are filled outlines (36 closed sub-paths each); a single-path pathLength
    stroke traces outlines in tracer order. For a pen-like draw, split sub-paths into separate <path>s and stagger by feather
    (or accept the contour-scan look).
13. **Next event context.** Earliest League Meets/Qualifiers start **15 Oct 2026** (Key Season Dates V26-27.1). We do NOT know the
    team's event date — never invent one; a "NEXT EVENT" slot stays `TBA` until the team fills `site.ts`.
