// Check (and optionally compress) the real robot model — `npm run model:check`.
//
//   npm run model:check                          inspect public/models/apex-r1.glb
//   npm run model:check -- path/to/export.glb    inspect another file
//   npm run model:check -- --compress            write a compressed copy over apex-r1.glb
//                                                (Meshopt geometry + WebP textures ≤ 2048 px;
//                                                 the original is kept as apex-r1.original.glb)
//
// It reports: file size, triangles, meshes/materials/textures, the model's size (it should be
// about 18 in / 0.46 m wide — export in metres, +Y up), and which of the part names the site
// looks for were FOUND or MISSING (explode, highlight, turret aim and flywheel spin use them;
// missing ones just don't animate — the whole model still renders and spins).
// See docs/ROBOT-MODEL.md for how to export from Onshape / Fusion 360 / Blender.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const compress = args.includes("--compress");
const file = path.resolve(ROOT, args.find((a) => !a.startsWith("--")) ?? "public/models/apex-r1.glb");

// Single source of truth for the names: MODEL_NODE_NAMES in src/content/robot.ts
const robotTs = fs.readFileSync(path.join(ROOT, "src/content/robot.ts"), "utf8");
const list = (key) =>
  (robotTs.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`))?.[1] ?? "")
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
const REQUIRED = list("required");
const OPTIONAL = list("optional");

const c = { bold: (s) => `\x1b[1m${s}\x1b[0m`, ok: (s) => `\x1b[32m${s}\x1b[0m`, warn: (s) => `\x1b[33m${s}\x1b[0m`, bad: (s) => `\x1b[31m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m` };
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

if (!fs.existsSync(file)) {
  console.log(c.warn(`No model at ${path.relative(ROOT, file)}.`));
  console.log("The site is using the procedural concept model (that's fine).");
  console.log("To use your CAD: export a GLB as described in docs/ROBOT-MODEL.md and save it to public/models/apex-r1.glb.");
  process.exit(0);
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });

async function inspect(target) {
  const doc = await io.read(target);
  const root = doc.getRoot();
  const nodes = root.listNodes();
  const names = nodes.map((n) => n.getName()).filter(Boolean);
  const lower = names.map((n) => n.toLowerCase());
  let triangles = 0;
  for (const mesh of root.listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      const pos = prim.getAttribute("POSITION");
      triangles += Math.round((idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3);
    }
  // world-space bounds of the scene
  const { getBounds } = await import("@gltf-transform/core");
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const b = scene ? getBounds(scene) : { min: [0, 0, 0], max: [0, 0, 0] };
  const sizeM = b.max.map((v, i) => v - b.min[i]);
  const has = (name) => lower.some((n) => n === name || n.startsWith(`${name}_`) || n.startsWith(`${name}.`) || n.startsWith(`${name}-`));
  const extensions = root.listExtensionsUsed().map((e) => e.extensionName);
  return {
    bytes: fs.statSync(target).size,
    nodes: nodes.length,
    meshes: root.listMeshes().length,
    materials: root.listMaterials().length,
    textures: root.listTextures().length,
    triangles,
    sizeM,
    found: REQUIRED.filter(has),
    missing: REQUIRED.filter((n) => !has(n)),
    optionalFound: OPTIONAL.filter(has),
    extensions,
    sampleNames: names.slice(0, 24),
  };
}

function report(r, label) {
  console.log(c.bold(`\n${label}`));
  console.log(`  size         ${r.bytes > 8 * 1024 * 1024 ? c.bad(mb(r.bytes)) : r.bytes > 3 * 1024 * 1024 ? c.warn(mb(r.bytes)) : c.ok(mb(r.bytes))}   (aim for < 3 MB)`);
  console.log(`  triangles    ${r.triangles.toLocaleString("en-US")}${r.triangles > 400_000 ? c.warn("   (heavy — simplify small fasteners/fillets in CAD)") : ""}`);
  console.log(`  nodes        ${r.nodes}   meshes ${r.meshes}   materials ${r.materials}   textures ${r.textures}`);
  const [x, y, z] = r.sizeM;
  const inches = r.sizeM.map((v) => (v / 0.0254).toFixed(1));
  console.log(`  bounds       ${x.toFixed(3)} × ${y.toFixed(3)} × ${z.toFixed(3)} m  (${inches.join(" × ")} in)`);
  const maxDim = Math.max(x, y, z);
  if (maxDim > 5) console.log(c.warn("               looks like millimetres — export in METRES (the site expects 1 unit = 1 m)."));
  else if (maxDim < 0.05) console.log(c.warn("               looks tiny — check the export units (metres expected)."));
  if (y < Math.max(x, z) * 0.25) console.log(c.warn("               very flat in Y — the site expects +Y up; check the up-axis in the exporter."));
  if (r.extensions.length) console.log(`  extensions   ${r.extensions.join(", ")}`);
  console.log(`  part names   ${c.ok(`found ${r.found.length}/${REQUIRED.length}`)}: ${r.found.join(", ") || "—"}`);
  if (r.missing.length) console.log(`               ${c.warn("missing")}: ${r.missing.join(", ")}  ${c.dim("(those parts won't explode/highlight; the model still renders)")}`);
  console.log(`  optional     ${r.optionalFound.length ? r.optionalFound.join(", ") : c.dim("none (flywheel spin / wheel spin need: " + OPTIONAL.join(", ") + ")")}`);
  if (r.missing.length && r.sampleNames.length) console.log(c.dim(`  first names in the file: ${r.sampleNames.join(", ")}`));
}

const before = await inspect(file);
report(before, `Model: ${path.relative(ROOT, file)}`);

if (compress) {
  const backup = file.replace(/\.glb$/i, ".original.glb");
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  const tmp = file.replace(/\.glb$/i, ".tmp.glb");
  const bin = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "gltf-transform.cmd" : "gltf-transform");
  console.log(c.bold("\nCompressing (Meshopt geometry, WebP textures ≤ 2048 px)…"));
  // Keep the scene graph and part names intact: no flatten / join / instancing / palette /
  // simplify (those merge or rename the nodes the site animates).
  const res = spawnSync(
    bin,
    [
      "optimize", backup, tmp,
      "--compress", "meshopt",
      "--texture-compress", "webp",
      "--texture-size", "2048",
      "--flatten", "false",
      "--join", "false",
      "--instance", "false",
      "--palette", "false",
      "--simplify", "false",
    ],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );
  if (res.status !== 0) {
    console.log(c.bad("Compression failed — the original file is unchanged."));
    process.exit(1);
  }
  fs.renameSync(tmp, file);
  const after = await inspect(file);
  report(after, `Compressed: ${path.relative(ROOT, file)}  (original kept as ${path.basename(backup)})`);
  console.log(c.ok(`\nSaved ${mb(before.bytes - after.bytes)}. Restart \`npm run dev\` (or redeploy) so the site picks the model up.`));
} else if (before.bytes > 3 * 1024 * 1024) {
  console.log(c.warn("\nTip: run `npm run model:check -- --compress` to shrink it (keeps a backup)."));
}
console.log(c.dim("\nThe site detects public/models/apex-r1.glb when `npm run dev` / `npm run build` starts (next.config.ts)."));
