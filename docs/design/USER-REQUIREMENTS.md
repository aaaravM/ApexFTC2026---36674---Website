# Direct requirements from the user (Apex Robotics, FTC 36674) — these override defaults

1. **Our robot, swappable later.** The 3D robot must represent THEIR robot. Their real robot/CAD is not finished yet,
   so ship the procedural APEX-R1 (built from RobotConstants.java dimensions) now, and make it trivially replaceable:
   when they export their finished CAD to `public/models/apex-r1.glb`, the site must use it automatically everywhere
   (home hero, Meet the Robot, CAD) with no code changes. Fall back to the procedural model when the file is absent.
   - Detect the file at build time (server-side fs check) and pass a flag down, or use a single config value in
     `src/content/robot.ts`; never 404-spam the console at runtime.
   - Define a simple node-naming convention for the export (e.g. groups named `drivetrain`, `intake`, `hopper`,
     `turret`, `shooter`, `vision`, `electronics`, `odometry`; optional `flywheel`, `wheel_fl/fr/bl/br`) so explode,
     highlight, turret aim and flywheel spin keep working on the real model; degrade gracefully when names are missing
     (whole model still spins/renders).
   - Write a short student-facing guide (`docs/ROBOT-MODEL.md`): exporting to GLB, compressing it
     (gltf-transform / Draco or Meshopt), naming the parts, and dropping it in. **The team uses BOTH Onshape and
     Fusion 360** (user confirmed 2026-10-12), so cover both:
     - Onshape (native): GLB export exists since release 1.217 (2026-06-26) for parts and assemblies — Assembly tab →
       right-click → Export → format GLB (tick "Compress"). Docs: https://cad.onshape.com/help/Content/File/exporting_files.htm
     - Fusion 360: NO native glTF/GLB export (only paid third-party plugins). Free path: File → Export → STEP → import
       the STEP into Onshape → export GLB from the Onshape assembly (keeps part names). Fallback: Fusion → FBX/OBJ →
       Blender (free) → File → Export → glTF 2.0 (.glb) with Draco compression.
     - Provide an npm script that validates/compresses a dropped-in model (e.g. `npm run model:check` using
       @gltf-transform/cli: inspect size + node names, report which convention names were found/missing).
2. **It spins when you scroll.** Scrolling must rotate the robot (scroll-linked, smooth, reversible — scrolling back
   rotates it back). At minimum on the home hero and the Meet the Robot page.
   - Signature behaviour: as the chassis spins with scroll, the TURRET COUNTER-ROTATES TO STAY LOCKED ON THE TARGET —
     exactly what their real code does (`turretAngle = azimuth − robotHeading`, heading-velocity feedforward in
     Turret.java). Surface this in the UI copy ("scroll to spin the chassis — the turret holds its lock").
   - Respect prefers-reduced-motion (no scroll-scrubbed spin; static angle or gentle step changes instead).
3. Real photos of the robot should be easy to add later too (Meet the Robot gallery with graceful empty state).
4. **HOME PAGE CHOREOGRAPHY — specified by the user (2026-10-12), implement exactly this flow:**
   a. **Open on the name.** First screen = the team name "APEX ROBOTICS" huge and alone (the wordmark is the hero).
   b. **The name disappears into the robot as you scroll.** Scroll-scrubbed: the letters collapse/fly/shrink INTO the
      robot (e.g. the wordmark scales down and converges on the robot's position while the robot rises/assembles out
      of it). Reversible on scroll-up.
   c. **Then the scroll-spinning robot takes over.** The 3D robot is pinned (sticky full-viewport canvas) and rotates
      with scroll (turret counter-rotates to hold its lock — see #2).
   d. **The robot moves to alternating sides to make space for the words.** A sequence of text sections (story
      chapters: who we are / the machine / drivetrain+odometry / intake+sorter / turret+shooter+solver / the season)
      — for each, the robot glides to the left or right half of the screen (and may re-frame/zoom) while that
      chapter's text occupies the other half. Smooth eased transitions between sides, never overlapping text.
   e. **Then the team.** After the robot story, the Meet the Team section (faces) arrives; the robot exits.
   Mobile: same story, robot above/below text instead of left/right (keep it legible). Reduced motion: no scrub;
   static robot render beside each chapter.
5. The user wants to SEE THE REAL PAGES on localhost ASAP — every route (/, /team, /outreach, /robot, /cad, /code,
   /sponsors, /links) should exist early with real content, then get progressively polished.
6. **User feedback after seeing the first build (2026-10-12, late):** "I really like it… I love the simplistic nature…
   I really like everything." KEEP the minimal, simple look (graphite, thin wide type, lots of space).
   - **REMOVE the live Tracy clock** from the header — done (src/components/site/clock.tsx deleted). Never re-add a clock.
   - **"I need more animations."** Add MORE motion everywhere, while keeping it simple and monochrome:
     every page H1 rises in letter-by-letter on load; section headings rise in when scrolled to; mono eyebrow labels
     decode; hairline rules draw across; real numbers count up; images/portraits/panels wipe in; lists/grids stagger in;
     links/buttons roll their labels on hover and lean toward the cursor (magnetic); long pages get a pollen scroll-
     progress hairline; gentle parallax on big figures/type. Use the shared kit in `src/components/motion`
     (TextReveal, StretchIn, CountUp, Scramble, LineDraw, ImageWipe, RollText, Parallax, ScrollProgress, Stagger,
     StaggerItem, Magnetic — see its index.ts + the demo at /lab/motion). This overrides the spec's earlier "most text
     is static" restraint. Still: reduced-motion safe, no gimmicks (no bouncing, glows, rainbow, cursor blobs).
7. **More user feedback (2026-10-13 morning)** — "I really like the scrolling thing" (keep the home story as is). Plus:
   a. **C2 "A turret shooter that aims while it drives" must HIGHLIGHT THE TURRET** (like C3 highlights the wheels/odometry).
      DONE: src/content/robot.ts C2 `focus: ["turret"]`.
   b. **The yellow progress line on HOME tracks the scroll animation**: it fills while the story plays, reaches full width when the
      scroll animation ends, then stays full all the way to the end of the page. DONE: `<ScrollProgress target="#home-story" />`
      (verified: 25%→0.25, 60%→0.59, end→1.0, after→1.0). Keep it that way.
   c. **Team ("Meet the team"), CAD ("the drawing set") and Sponsors ("Become a Founding Partner") need MORE and MORE VARIED
      animation** — right now "it's all the same line swipe when you scroll". Do NOT use the same clip-wipe Reveal for every section.
      Give each page its own signature, content-specific motion (see the page briefs), mixing the motion kit's effects, and use the
      generic Reveal wipe sparingly. Same principle for every other page: vary the motion section to section.
8. **Robot lab (/lab/robot) — FINAL DECISION by the user (2026-10-13): PUBLIC, WITH A LINK.** This SUPERSEDES any
   "never link to /lab/*" / "dev-only" instruction you were given. Implement: (a) /lab/robot stays a normal public page (keep it
   as it is — the user likes it "how it is for now"; don't redesign it); (b) add a clear link to it from the Meet the Robot page
   (e.g. an "Open the Robot Lab →" button near the 3D stage or the AIM playground, styled like the site's secondary buttons with
   RollText), and add it to the ⌘K palette ("Robot Lab"); (c) give it proper metadata (title "Robot Lab", description) and include
   it in the sitemap. The motion demo /lab/motion is NOT part of this — keep that one dev-only (notFound() in production), noindex,
   unlinked.
