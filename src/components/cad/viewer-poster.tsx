// ViewerPoster — what VIEW 1 shows before WebGL is ready (server HTML, the 3D chunk loading, or
// WebGL off): an isometric line drawing of the 18 in start cube with the concept model's main
// blocks inside it, in the same paper/ink as the sheet. Painter's-order filled faces give hidden-line
// removal for free. Server-safe (pure SVG). Units: inches, robot frame (+X forward, +Y left, +Z up).

type Box = { x: [number, number]; y: [number, number]; z: [number, number]; weight?: number };

const C30 = Math.cos(Math.PI / 6);
const p = (x: number, y: number, z: number) => `${((x - y) * C30).toFixed(2)},${((x + y) * 0.5 - z).toFixed(2)}`;

/** Rough masses of the concept model, from the same numbers the 3D engine uses (inches). */
const BOXES: Box[] = [
  // drivetrain rails + plate
  { x: [-8.5, 8.5], y: [-7.6, 7.6], z: [1.1, 3.0] },
  // wheels (104 mm ≈ 4.1 in), drawn as their bounding blocks
  { x: [2.7, 6.8], y: [7.6, 9], z: [0, 4.1] },
  { x: [-6.8, -2.7], y: [7.6, 9], z: [0, 4.1] },
  { x: [2.7, 6.8], y: [-9, -7.6], z: [0, 4.1] },
  { x: [-6.8, -2.7], y: [-9, -7.6], z: [0, 4.1] },
  // hopper
  { x: [-6, 0.5], y: [-3.6, 3.6], z: [3, 8.4] },
  // intake roller across the front
  { x: [6.8, 8.8], y: [-6.5, 6.5], z: [1.8, 3.8] },
  // turret ring
  { x: [-3.4, 3.4], y: [-3.4, 3.4], z: [8.4, 9.4] },
  // shooter tower + hood
  { x: [-1.5, 5.2], y: [-2.4, 2.4], z: [9.4, 15.6], weight: 1.25 },
];

function faces(b: Box) {
  const [x0, x1] = b.x;
  const [y0, y1] = b.y;
  const [z0, z1] = b.z;
  return [
    // +X face, +Y face, top — the three a viewer at (+X, +Y, +Z) sees
    [p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1)],
    [p(x0, y1, z0), p(x1, y1, z0), p(x1, y1, z1), p(x0, y1, z1)],
    [p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)],
  ];
}

const depth = (b: Box) => (b.x[0] + b.x[1]) / 2 + (b.y[0] + b.y[1]) / 2 + (b.z[0] + b.z[1]) / 2;
const SORTED = [...BOXES].sort((a, b) => depth(a) - depth(b));
const E = 9; // half the 18 in cube

export function ViewerPoster() {
  return (
    <div aria-hidden="true" className="absolute inset-0 grid place-items-center p-[10%] text-fg">
      <svg viewBox="-17 -28 34 38" className="h-full max-h-[440px] w-full max-w-[520px]" fill="none" stroke="currentColor">
        {/* R102 start cube, phantom lines */}
        <g strokeWidth={0.8} strokeDasharray="6 2 1.5 2" opacity={0.55} vectorEffect="non-scaling-stroke">
          {[
            [p(-E, -E, 0), p(E, -E, 0), p(E, E, 0), p(-E, E, 0)],
            [p(-E, -E, 18), p(E, -E, 18), p(E, E, 18), p(-E, E, 18)],
          ].map((pts, i) => (
            <polygon key={i} points={pts.join(" ")} vectorEffect="non-scaling-stroke" />
          ))}
          {[
            [-E, -E],
            [E, -E],
            [E, E],
            [-E, E],
          ].map(([x, y]) => (
            <line key={`${x}${y}`} vectorEffect="non-scaling-stroke" {...seg(p(x, y, 0), p(x, y, 18))} />
          ))}
        </g>
        {/* the model's main blocks */}
        <g strokeLinejoin="round">
          {SORTED.map((b, i) =>
            faces(b).map((f, k) => (
              <polygon
                key={`${i}-${k}`}
                points={f.join(" ")}
                fill="var(--bg)"
                strokeWidth={b.weight ?? 1}
                vectorEffect="non-scaling-stroke"
              />
            )),
          )}
        </g>
      </svg>
      <p className="absolute inset-x-0 bottom-16 text-center font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase sm:bottom-14">
        View 1 · loading the 3D model
      </p>
    </div>
  );
}

function seg(a: string, b: string) {
  const [x1, y1] = a.split(",");
  const [x2, y2] = b.split(",");
  return { x1, y1, x2, y2 };
}
