// Static poster for the 3D stage: a side elevation of APEX-R1 drawn from the same numbers the 3D
// model uses (RobotConstants.java + goBILDA parts), in the engraved-hairline style. It is what the
// server sends, what shows while the 3D chunk loads, and what stays if WebGL is unavailable.
// Server-safe (pure SVG). Robot forward = right. Units: inches (1 viewBox unit = 1 in).

const R = 2.047; // 104 mm mecanum wheel radius
const WX = 4.72; // wheel centres ±120 mm from the tracking point
const FLY = { x: 4.06, z: 11.54, r: 2 }; // 4 in flywheel axis (DERIVED.flywheelAxis, turret axis at 2 in)
const HOOD_R = 4.41; // hood inner radius around the flywheel axis
const MUZZLE = { x: 2, z: 14 }; // Shoot.MUZZLE_X_IN / MUZZLE_Z_IN
const DEG = Math.PI / 180;

const p = (x: number, z: number) => `${x.toFixed(2)} ${(-z).toFixed(2)}`;
const arc = (cx: number, cz: number, r: number, a0: number, a1: number) => {
  const s = { x: cx + r * Math.cos(a0 * DEG), z: cz + r * Math.sin(a0 * DEG) };
  const e = { x: cx + r * Math.cos(a1 * DEG), z: cz + r * Math.sin(a1 * DEG) };
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  // SVG y is flipped, so a CCW arc in z-up space is a clockwise sweep (flag 0)
  return `M ${p(s.x, s.z)} A ${r} ${r} 0 ${large} ${a1 > a0 ? 0 : 1} ${p(e.x, e.z)}`;
};

export function RobotPoster({ className }: { className?: string }) {
  const ray = { x: MUZZLE.x + 7 * Math.cos(40 * DEG), z: MUZZLE.z + 7 * Math.sin(40 * DEG) };
  return (
    <div className={className} aria-hidden="true">
      <div className="absolute inset-0 grid place-items-center p-[12%]">
        <svg viewBox="-12 -21 26 23" className="h-full max-h-[440px] w-full max-w-[520px] text-fg-muted" fill="none" stroke="currentColor">
          <g strokeWidth={1}>
            {/* floor + 18 in sizing cube (R102) */}
            <line x1={-11.5} y1={0} x2={13.5} y2={0} strokeDasharray="2 4" opacity={0.5} vectorEffect="non-scaling-stroke" />
            <rect x={-9} y={-18} width={18} height={18} strokeDasharray="3 4" opacity={0.35} vectorEffect="non-scaling-stroke" />
            {/* wheels */}
            {[-WX, WX].map((x) => (
              <g key={x}>
                <circle cx={x} cy={-R} r={R} vectorEffect="non-scaling-stroke" />
                <circle cx={x} cy={-R} r={0.55} opacity={0.6} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
            {/* U-channel rail (28–76 mm) + standoffs to the turret plate (180 mm) */}
            <rect x={-8.03} y={-3} width={16.06} height={1.9} vectorEffect="non-scaling-stroke" />
            <line x1={-3} y1={-3} x2={-3} y2={-7.09} opacity={0.7} vectorEffect="non-scaling-stroke" />
            <line x1={6.6} y1={-3} x2={6.6} y2={-7.09} opacity={0.7} vectorEffect="non-scaling-stroke" />
            <rect x={-3.6} y={-7.25} width={11} height={0.16} vectorEffect="non-scaling-stroke" />
            {/* hub stack (back) + battery */}
            <rect x={-6.9} y={-4.6} width={5.6} height={1.26} opacity={0.75} vectorEffect="non-scaling-stroke" />
            <rect x={-6.9} y={-6.1} width={5.6} height={1.26} opacity={0.75} vectorEffect="non-scaling-stroke" />
            {/* intake roller + side plate (front) */}
            <path d={`M ${p(5.6, 1.1)} L ${p(9.2, 2.2)} L ${p(9.2, 6.1)} L ${p(6.3, 6.6)} Z`} opacity={0.75} vectorEffect="non-scaling-stroke" />
            <circle cx={7.32} cy={-4.25} r={1.57} vectorEffect="non-scaling-stroke" />
            {/* turret ring (5:1, ±170°) */}
            <rect x={-0.76} y={-8.05} width={5.52} height={0.8} vectorEffect="non-scaling-stroke" />
            {/* shooter side plate, flywheel, hood */}
            <path
              d={`M ${p(-1.2, 8.05)} L ${p(-1.2, 13.4)} Q ${p(-1.2, 16.4)} ${p(2.2, 16.4)} L ${p(6.4, 16.4)} Q ${p(8.6, 16.2)} ${p(8.6, 13.6)} L ${p(8.6, 8.05)} Z`}
              opacity={0.85}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={FLY.x} cy={-FLY.z} r={FLY.r} vectorEffect="non-scaling-stroke" />
            <circle cx={FLY.x} cy={-FLY.z} r={0.35} vectorEffect="non-scaling-stroke" />
            <path d={arc(FLY.x, FLY.z, HOOD_R, 130, 200)} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            {/* webcam */}
            <rect x={7.9} y={-10.75} width={1.1} height={0.6} vectorEffect="non-scaling-stroke" />
            <line x1={8.2} y1={-10.15} x2={8.2} y2={-7.25} opacity={0.6} vectorEffect="non-scaling-stroke" />
          </g>
          {/* launch: 40° fixed hood from the muzzle, 14 in up */}
          <g className="text-fg" strokeWidth={1}>
            <line x1={MUZZLE.x} y1={-MUZZLE.z} x2={ray.x} y2={-ray.z} strokeDasharray="1.5 2.5" vectorEffect="non-scaling-stroke" />
            <line x1={MUZZLE.x} y1={-MUZZLE.z} x2={MUZZLE.x + 3.4} y2={-MUZZLE.z} opacity={0.45} vectorEffect="non-scaling-stroke" />
            <path d={arc(MUZZLE.x, MUZZLE.z, 2.6, 0, 40)} opacity={0.7} vectorEffect="non-scaling-stroke" />
            <circle cx={MUZZLE.x} cy={-MUZZLE.z} r={0.22} fill="currentColor" stroke="none" />
          </g>
          {/* 14 in muzzle-height dimension */}
          <g strokeWidth={1} opacity={0.7}>
            <line x1={11.6} y1={0} x2={11.6} y2={-14} vectorEffect="non-scaling-stroke" />
            <line x1={11.1} y1={0} x2={12.1} y2={0} vectorEffect="non-scaling-stroke" />
            <line x1={11.1} y1={-14} x2={12.1} y2={-14} vectorEffect="non-scaling-stroke" />
            <line x1={MUZZLE.x + 0.4} y1={-14} x2={11.1} y2={-14} strokeDasharray="0.6 1.4" opacity={0.6} vectorEffect="non-scaling-stroke" />
          </g>
          <g className="fill-current font-mono" stroke="none" fontSize={0.78} letterSpacing={0.06}>
            <text x={12.1} y={-7} transform="rotate(-90 12.4 -7)" textAnchor="middle">
              14 IN MUZZLE
            </text>
            <text x={MUZZLE.x + 3} y={-MUZZLE.z - 0.55}>40°</text>
            <text x={-9} y={-18.5}>18 IN SIZING CUBE · R102</text>
          </g>
        </svg>
      </div>
      <dl className="absolute bottom-4 left-4 hidden font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase sm:block lg:left-auto lg:right-5 lg:bottom-5 lg:text-right">
        <dt className="text-fg">System check</dt>
        <dd>T1 odometry · pods X −84 · Y −168 mm</dd>
        <dd>T4 HIVE tracker · cluster IDs 30–45</dd>
        <dd>T5 flywheel · 5000 RPM max</dd>
      </dl>
    </div>
  );
}
