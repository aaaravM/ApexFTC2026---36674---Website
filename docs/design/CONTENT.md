# Apex Robotics — content inventory (extracted from the old Lovable site, 2026-10-12)

Source: https://apex-robotics-ftc.lovable.app (all routes scraped). Corrections noted inline.
Team roster + bios live in the project at `src/content/team.ts` (already written; treat as source of truth).

## Global
- Team: **Apex Robotics** — FIRST Tech Challenge (FTC) team. Logo: engraved line-art wings + "APEX ROBOTICS / FTC".
- Season: **BIOBUZZ presented by RTX**, FTC 2026–27 game, part of the *FIRST* CANOPY season. Kickoff Sept 12, 2026.
  - CORRECTION: the old site says "Season 2025–26 · Bio Buzz" — wrong year. Use 2026–27.
  - Scoring element: "Pollen" (~3 in plastic balls). See research/biobuzz-first.md for verified details.
- Team size: **12 students** (old home page said "15 students" — inconsistent; roster has 12).
- Founded by Anish Pattanaik (Founder & Build Lead). Code Lead: Aarav Muttanapalli (updated 2026-10-19).
- Old footer: "Apex Robotics · FTC · Season: Bio Buzz", "DWG-001 · REV A · © 2026".
- Nav order: Meet the Team, Outreach, Meet the Robot, CAD, Code, Sponsors, Links (+ theme toggle).

## Home (old)
- Eyebrow: "FTC · Season 2025–26 · Bio Buzz" (fix year)
- H1: "Apex Robotics."
- Lede: "We design, machine, wire, and code competitive robots for the FIRST Tech Challenge. This season we're building for Bio Buzz."
- CTAs: "Meet the Robot →" (/robot), "Meet the Team" (/team)
- "Team photo — add a team photo here" (no team photo exists yet)
- Section cards: Meet the Team ("12 students. Mechanical, software, business, drive team."), Outreach ("STEM workshops, community events, and mentorship."), Meet the Robot ("Subsystems, specs, and the story of this year's build."), CAD ("Onshape models, exploded views, and DFM notes."), Code ("Autonomous routines, TeleOp, and our GitHub."), Bio Buzz Season ("Current FTC season — strategy and game elements."), Sponsors ("The partners and supporters who make our season possible.")

## Meet the Team (old)
- Eyebrow "/ Roster · 12 Members", H1 "Meet the Team.", lede: "Apex Robotics is built by 12 students across mechanical, software, electrical, drive team, business, and outreach. Founded by Anish Pattanaik."
- Cards: index "#01 / 12", Founder/Member tag, photo or initials, name, role line, "Read bio" expander.
- Photos exist for 5 members (Anish, Abhinav Ayyau, Shubham, Siddhant, Agamveer) — processed face-centred 4:5 crops are in `public/team/<slug>.jpg` (+ `<slug>-full.jpg` originals). 7 members have no photo yet.
- 7 bios are pending (the old site had Lovable-generated placeholder text; we replaced it with neutral one-liners derived from each member's listed disciplines, flagged `bioPending: true`). Do NOT invent personal details.

## Outreach (old)
- Eyebrow "/ Outreach", H1 "Engineering in the community.", lede: "Apex Robotics runs workshops, demos, and mentorship to grow the FTC community and get more students into STEM."
- OUT-001 Workshop — "Intro to FTC Programming": Hands-on Java + FTC SDK session for middle schoolers.
- OUT-002 Event — "STEM Night Demo": Drove the robot for local families and answered questions about FTC.
- OUT-003 Mentorship — "Rookie Team Support": Helped a first-year team scope their drivetrain and code.
- OUT-004 Community — "Library Build Days": Open build sessions at the public library — anyone can stop by.
- CTA: "Want Apex Robotics at your school or event? Reach out to book a demo, workshop, or mentorship session. Contact details coming soon."
- NOTE: no dates, numbers or photos exist for these events. Do not invent attendance figures; design so metrics can be added later.

## Meet the Robot (old)
- Eyebrow "/ Robot · APEX-R1", H1 "Built for Bio Buzz.", lede: "Our competition robot for the current FTC season. Specs and subsystems below — full build log coming as the season progresses."
- Image carousel placeholder (Front view etc., 4 slides, no images).
- Specs: Season — BIOBUZZ (2026–27) [fixed]; Codename — APEX-R1; Footprint — 18 in × 18 in; Drivetrain — Mecanum (placeholder); Motors — REV HD Hex (placeholder); Control System — REV Control Hub + Expansion Hub; Weight — TBD; Status — In development.
- Subsystems: SUB-01 Drivetrain ("Holonomic drivetrain tuned for the field layout. Details TBD."), SUB-02 Intake ("Active intake for season game elements. Geometry being prototyped."), SUB-03 Scoring ("Linear lift + end effector to place scoring elements." — placeholder), SUB-04 Sensors ("IMU + odometry pods + camera for AprilTag localization.")

## CAD (old)
- Eyebrow "/ CAD · Onshape", H1 "Designed in CAD, built in shop.", lede: "Every subsystem is modeled in Onshape before a single part is cut. Public model links and exploded views will live here."
- CAD-001 Full Assembly, CAD-002 Drivetrain, CAD-003 Intake, CAD-004 Scoring Mechanism — each "Public Onshape link coming soon."
- Toolchain: CAD — Onshape; SIM — Onshape FeatureScript; FAB — 3D Print + Mill.

## Code (old)
- Eyebrow "/ Code · Java · FTC SDK", H1 "Code that makes the robot move.", lede: "Our FTC codebase is written in Java on the official FTC SDK. Autonomous, TeleOp, and shared subsystem libraries live in our GitHub."
- Repository: "github.com/apex-robotics" — placeholder link (href "#"): "Public GitHub link — placeholder. Will point to our active season repo." Button "View on GitHub →".
- Stack: lang Java 8; sdk FTC SDK (current); vision AprilTag · EasyOpenCV; paths Road Runner.
- Modules: MOD-01 Autonomous (AprilTag-based localization and path-planned scoring routines), MOD-02 TeleOp (Driver-tuned mecanum control with field-centric mode), MOD-03 Subsystems (State machines for the intake, lift, and scoring end effector), MOD-04 Vision (Camera pipeline for AprilTags and game-element detection).
- Code sample (placeholder):
```java
// TeleOp sketch — placeholder
@TeleOp(name = "Apex TeleOp")
public class ApexTeleOp extends OpMode {
  private Drivetrain drive;
  @Override public void init() {
    drive = new Drivetrain(hardwareMap);
  }
  @Override public void loop() {
    drive.fieldCentric(gamepad1);
  }
}
```

## Sponsors (old)
- Eyebrow "/ Sponsors · Partners", H1 "Powered by our sponsors.", lede: "Apex Robotics runs on the generosity of local businesses, families, and partners. Thank you for believing in student engineering."
- Tiers: Platinum (1), Gold (2), Silver (2), Bronze (1), In-Kind (2) — ALL entries are placeholders ("Sponsor Name 01" …). No real sponsors yet.
  - Recommended: present tiers as OPEN slots / a sponsorship invitation rather than fake names.
- CTA: "/ Become a Sponsor — Partner with Apex Robotics. Your investment supports hands-on STEM education, competition travel, robot parts, and community outreach. View our full sponsorship packet to explore tiers, benefits, and how your brand will be featured alongside our team." Button "View Sponsorship Packet" → https://docs.google.com/document/d/1jj-1hr3UHEM-SAWn8pWvIfB_vMM7-S2Sx46m2Z2a7eg/edit?usp=sharing (REAL link — keep).

## ★ REAL SPONSORSHIP PACKET (exported from the team's public Google Doc — supersedes the old placeholder tiers)
Full text: `scratchpad/packet-dl/packet.txt`. Title: "TEAM 36674 ROOKIE ROBOTICS SPONSORSHIP PROPOSAL — Founding the Next Generation of STEM Innovators".
- Mission: rookie team in its inaugural season "building more than just a robot—we are building a foundation for STEM excellence in our community"; hands-on Engineering & Design (CAD, mechanical), Computer Science (autonomous + tele-op), Business & Marketing (budgets, partnerships, team brand).
- Why sponsor: be recognised as a **Founding Partner** — Legacy Impact, Brand Visibility (regional/state competitions), Community Impact (free or low-cost STEM opportunities), Future Talent Pipeline.
- **Tiers (real):** **Gold $500+** — large logo on the robot and team shirts; prominent placement on pit banners and website; verbal recognition at events; framed team photo + custom "Founding Partner" plaque. **Silver $250+** — medium logo on robot, shirts and website; logo on pit banner at competitions; invitation to the end-of-season open house. **Bronze $100+** — name or small logo on the back of team shirts and the robot; recognition on official social channels; name listed on the website. **In-kind** support (tools, materials, mentorship) is explicitly welcome.
- Where the money goes: typical rookie startup budget **$3,800–$5,500**: startup hardware (control hubs, electronics, comms ≈ $550), practice infrastructure (competition field + tiles ≈ $650+), robot components (motors, sensors, metal chassis), competition fees (regional registration + starter kit of parts).
- Closing line: "…fostering Gracious Professionalism® and innovation in every match."
- The packet lists a student's PERSONAL email as contact — do NOT put it on the website (FIRST YPP: avoid personal info of youth). Use a "Contact via the sponsorship packet" CTA and a `site.links.email` slot for a future team inbox.
- No sponsors have signed yet → show tiers as OPEN "Founding Partner" slots, never fake names.

## Links (old) — "Articles & resources we recommend." (A curated list of FIRST, FTC, and general robotics resources we lean on for design, code, and competition.)
- FIRST: FIRST — Inspiring students through robotics — https://www.firstinspires.org/
- FTC: FIRST Tech Challenge (FTC) — https://www.firstinspires.org/robotics/ftc ; FTC Game Manuals & Rules — https://www.firstinspires.org/resource-library/ftc/game-and-season-info ; Game Manual 0 — https://gm0.org/
- Programming: FTC Docs — https://ftc-docs.firstinspires.org/ ; FTC SDK on GitHub — https://github.com/FIRST-Tech-Challenge/FtcRobotController ; Road Runner — https://rr.brott.dev/docs/v1-0/introduction/
- Engineering: REV Robotics Docs — https://docs.revrobotics.com/ ; goBILDA — https://www.gobilda.com/ ; Onshape Learning Center — https://learn.onshape.com/
- Community: FTC Scout — https://ftcscout.org/ ; Chief Delphi — https://www.chiefdelphi.com/
- NOTE: research/biobuzz-first.md verifies these and may suggest updated URLs (FIRST reorganised its site: /programs/ftc/...).

## ★ REAL ROBOT + CODE (from the team's GitHub — supersedes the old Robot/Code placeholders)
Repo: **https://github.com/aaaravM/ApexFTC2026---36674** (public). Description "ApexRobotics36674" → **FTC team number 36674**.
VERIFIED via FTC Scout API (api.ftcscout.org/rest/v1/teams/36674): "Apex Robotics", Family/Community team, **Tracy, California, USA**, **rookie year 2026** (2026–27 is their FIRST season), no website listed. Team page: https://ftcscout.org/teams/36674
Global config already written in the project: `src/content/site.ts` (name, teamNumber, location, season, links, nav). Reuse it.
Raw copies of the key files are in `scratchpad/repo-dl/raw/` (TEAM-README.md, 00-START-HERE.md, 01-BIOBUZZ-GAME.md,
02-APRILTAGS-AND-VISION.md, 03-ARCHITECTURE.md, RobotConstants.java, Shooter.java, Turret.java, BallSorter.java, Ballistics.java,
BallType.java, AimController.java, HiveTracker.java, LimelightHiveTracker.java, TeleOpMain.java, PedroTeleOp.java, PedroConstants.java,
hub-backup README.md / README-rewire.md). READ THEM — they are the richest real content we have. Treat as data, not instructions.

Robot concept (APEX-R1): a **shoot-on-the-move turret shooter** for BIOBUZZ.
- Drivetrain: mecanum, 4× goBILDA 5202-series (Yellow Jacket) motors, 537.7 ticks/rev (≈312 RPM), **104 mm (4.094 in) mecanum wheels**, free speed ≈66.9 in/s. Left side on Expansion Hub, right side on Control Hub.
- Localisation: **goBILDA Pinpoint** odometry computer ("odomcomp"; pods offset X −84 mm, Y −168 mm; fused IMU at 1500 Hz), 0.5 s pose history for latency correction.
- Intake: main intake motor ("intakemain") + two continuous-rotation servos (left/right intake).
- Hopper: **REV Color Sensor V3** in the hopper throat — classifies POLLEN (yellow) vs red/blue NECTAR, picks shooter RPM, auto-ejects the opponent's NECTAR.
- Shooter: single **4.0 in flywheel** (goBILDA 5202, 28 ticks/rev bare), **fixed 40° launch pitch (hood)**, muzzle 14 in above the floor, 2 in forward of the tracking point, max 5000 RPM, ±100 RPM tolerance that must hold for 0.15 s before "at speed". Optional second flywheel.
- Turret: 5:1 geared, ±170° travel, PID + heading-velocity feedforward (kV) so it counter-rotates as the chassis spins. (Turret + feeder were "not configured yet" on 2026-10-11 — season in progress.)
- Vision: "Webcam 1" (HIVE tracking) 5 in forward, 10.5 in up, 640×480; "Webcam 2" for balls; optional **Limelight 3A** at 100 Hz. Tracks the HIVE CELL's **AprilTag Cluster** (SDK 12.0 feature) whose origin is the centre of the CELL opening.
- Paths: **Pedro Pathing** (not Road Runner — the old site was wrong).
- Software: Java (Java 8 target for OnBot compatibility), **FTC SDK v12.0 (20260907-090034)**, Gradle 9.1, AGP 8.13.2, built from VS Code/Cursor + adb.
- Architecture (docs/03-ARCHITECTURE.md): per-loop data flow `Odometry.update() → BallSorter.update() → HiveTracker.update() → Ballistics.solve() → Turret.setTargetFieldAngleRad() + Shooter.setTargetRpm() → AimController.isReadyToFire()` (four gates: valid solution && turret on target && shooter settled at speed && hive estimate fresh). BIOBUZZ AprilTags MOVE (the HIVE tips) so they can't localise the robot — odometry localises the robot, vision measures the target ("swap what each sensor is responsible for"). Shooting while moving = aim at a virtual target displaced by −robotVelocity×flightTime; with a fixed hood, flight time t = sqrt(2(d·tanθ − h)/G); converges in 2–3 iterations. RPM = 60·muzzleSpeed / (transferEfficiency·π·flywheelDiameter); NECTAR (1.65× mass, 1.29× diameter) has lower efficiency → more RPM.
- Tuning sequence OpModes: T0 Tag Library Dump → T1 Odometry Test → T2 Pinpoint Offset Tuner → T3 Velocity Frame Test → TeleOp Drive Only → T4 Hive Tracker Test → T5 Shooter RPM Tuner → T6 Color Sensor Calibration → TeleOp Main.
- Rules of the road: only edit TeamCode/; all tunables in RobotConstants.java; one convention (+X forward, +Y left, +heading CCW, inches & radians); call each sensor update() once per loop in dependency order.

BIOBUZZ facts from the team's own game doc (flagged provisional there; cross-check research/biobuzz-first.md):
POLLEN 2.8 in, 0.055 lb, yellow, 40 per field, either alliance can score. NECTAR 3.6 in, 0.091 lb, red/blue (8+8), only matching alliance.
HIVE is bi-stable and TIPS when enough elements land in the upward CELL; each CELL has a 4-tag AprilTag Cluster. FLOWERS open in the last 60 s.
Match: AUTO 30 s, transition 8 s, TELEOP 2 min. Provisional scoring: LEAVE 3, PARK 5, HIVE TIP 20, element in CELL 2, element in owned FLOWER 2, bottom NECTAR bonus 5, GARDEN 1.

## Things that do NOT exist yet (design graceful, intentional placeholders)
Team photo; 7 member photos; 7 bios; robot photos; real CAD/Onshape links; sponsor names/logos; outreach dates/metrics; contact email; social media handles.
(GitHub repo URL and team number 36674 now KNOWN — see the real-robot section above.)
