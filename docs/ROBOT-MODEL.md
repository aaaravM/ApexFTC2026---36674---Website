# Putting our real robot on the website

Right now every 3D scene on the site (home page, Meet the Robot, CAD) shows **APEX-R1 as a
concept model**: a robot generated in code from the numbers in `RobotConstants.java`. A small
caption says so: *CONCEPT MODEL · GENERATED FROM RobotConstants.java · REAL CAD PENDING*.

When our CAD is finished, the site can show **the real robot** instead, everywhere, with no code
changes:

1. Export the robot assembly as a **GLB** file (steps below for Onshape, Fusion 360 and Blender).
2. Run `npm run model:check -- path/to/your-export.glb` and fix anything it flags.
3. Save it as **`public/models/apex-r1.glb`**, run `npm run model:check -- --compress`, then
   restart `npm run dev` (or push, so the site redeploys).

The site checks for that file when it starts (`next.config.ts`). If the file is there, it's used;
if it isn't, the concept model comes back. The "concept model" caption hides itself automatically.

---

## 1. Name the parts so they can move

The site spins the chassis, explodes subsystems, highlights the one you're reading about, aims the
turret and spins the flywheel. To do that on *your* model it looks for **groups with these names**
(not case-sensitive; `turret_ring` and `turret.001` also count as `turret`):

| Name          | Put inside it                                            | Used for                      |
| ------------- | -------------------------------------------------------- | ----------------------------- |
| `drivetrain`  | frame rails, motors, wheels, pods' mounts                | explode, highlight            |
| `odometry`    | Pinpoint computer + the two dead-wheel pods              | explode, highlight            |
| `intake`      | intake roller, motor, the two CR servos                  | explode, highlight            |
| `hopper`      | hopper walls, colour sensor                              | explode, highlight            |
| `turret`      | everything that rotates with the turret (ring and up)    | turret aim, explode           |
| `shooter`     | flywheel assembly + hood (put it **inside** `turret`)    | explode, highlight            |
| `vision`      | webcam(s), Limelight                                     | explode, highlight            |
| `electronics` | Control Hub, Expansion Hub, battery, switch              | explode, highlight            |

Optional, for extra motion:

| Name                                       | Used for                                    |
| ------------------------------------------ | ------------------------------------------- |
| `flywheel`                                 | spins with the shooter RPM                  |
| `wheel_fl`, `wheel_fr`, `wheel_bl`, `wheel_br` | spin when the robot "drives" (mecanum)  |

**Missing names are fine.** Those parts simply don't explode or highlight — the whole robot still
renders and still spins with the scroll. Add names as you go.

> The rotating part of the turret should have its **origin on the turret's rotation axis**
> (vertical), so the site can rotate it in place. Same for `flywheel` (its spin axis) and each
> wheel (its axle).

## 2. Units and orientation

- **Units: metres** (1 unit = 1 m). An 18 in robot is about 0.46 m wide. If `model:check` says it
  "looks like millimetres", change the export unit.
- **+Y is up.** The robot sits on the floor at Y = 0.
- **The robot's front faces +Z** (towards the viewer in the default camera). Our code's +X forward
  maps to the site's +Z.
- **Origin**: the centre of the robot's footprint on the floor (the odometry tracking point if you
  know it).

## 3. Exporting

### Onshape (native GLB)

Onshape has exported GLB for parts and assemblies since release 1.217 (June 2026).

1. Open the **Assembly** tab of the full robot.
2. Make the groups above: put each subsystem in its own **sub-assembly** and rename the
   sub-assembly instance to the name in the table (right-click → *Rename*). Sub-assembly and
   instance names become the group names in the GLB.
3. Right-click the Assembly tab → **Export…** → Format **GLB**.
4. In the export dialog:
   - tick **Export models oriented Y axis up** — glTF is Y-up but Onshape is Z-up, so without this
     the robot loads lying on its side;
   - leave **Export unique parts as individual files** *unchecked* (the site needs one file);
   - tick **Compress**, and export in **metres**.
5. Download the `.glb`, then run `npm run model:check -- path/to/your-export.glb` and read the
   "found / missing" names. Whether Onshape keeps sub-assembly *instance* names as glTF node names
   hasn't been verified yet, so always check — if a name is missing, rename the sub-assembly itself
   (not just the instance) and export again.

Docs: <https://cad.onshape.com/help/Content/File/exporting_files.htm>

### Fusion 360 (via Onshape — free, keeps part names)

Fusion 360 has **no built-in glTF/GLB export** (only paid add-ins), so go through Onshape:

1. In Fusion: make one **component** per subsystem and name it as in the table.
2. **File → Export → STEP** (`.step`). STEP keeps the component tree and names.
3. In Onshape: **Create → Import**, choose the STEP file, import as an assembly.
4. Check the names in the assembly list, then export GLB as in the Onshape steps above.

### Fusion 360 → Blender (fallback)

1. In Fusion: **File → Export → FBX** (or OBJ).
2. In Blender (free): **File → Import → FBX**.
3. In the Outliner, rename objects / parent them under **Empties** named as in the table
   (e.g. an Empty called `turret` with the turret parts as children). Put each Empty's origin on
   its rotation axis.
4. **File → Export → glTF 2.0** → Format **glTF Binary (.glb)**, *Include → Selected Objects* off,
   *Transform → +Y Up* on. Leave compression off here — the next step compresses it.

## 4. Check and compress

```bash
npm run model:check -- path/to/your-export.glb    # report: size, triangles, units, names found/missing
cp path/to/your-export.glb public/models/apex-r1.glb
npm run model:check -- --compress                 # Meshopt geometry + WebP textures, keeps a backup
```

Aim for **under 3 MB** and **under ~400k triangles**. If it's heavier, hide fasteners and tiny
fillets in CAD before exporting — nobody sees screw threads on a website. The `--compress` step
keeps every part name and the group structure (it does not merge or flatten anything), and saves
the untouched file as `public/models/apex-r1.original.glb` (don't commit that one).

Draco-compressed exports work too: the site serves its own Draco decoder from `public/draco/gltf/`
(nothing is loaded from Google's CDN), and Meshopt is built in.

## 5. Drop it in

1. File at `public/models/apex-r1.glb`.
2. Restart `npm run dev` (the check happens when the server starts) — or push to deploy.
3. Open `/robot` and the home page: the real robot appears, the concept-model caption is gone.

To go back to the concept model, delete (or rename) the file and restart.

## Troubleshooting

| Symptom                               | Fix                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------- |
| Robot is huge / tiny                  | Wrong units — export in metres.                                           |
| Robot lies on its back / side         | Up axis — export +Y up (Onshape: *Export models oriented Y axis up*; Blender: *+Y Up*). |
| Robot faces away                      | Rotate the assembly 180° so the front faces +Z, re-export.                |
| Turret swings around a weird point    | The `turret` group's origin isn't on the rotation axis.                   |
| Nothing explodes                      | No names matched — run `npm run model:check` and look at "missing".       |
| Page loads slowly                     | Run `--compress`; remove hidden/internal parts; keep textures ≤ 2048 px.  |
| Site still shows the concept model    | The file name/path must be exactly `public/models/apex-r1.glb`; restart.  |
