// Site-wide Open Graph / social card: wings + the APEX ROBOTICS wordmark + the real shot arc.
// Static (generated once at build). Fonts: Hubot Sans Expanded (SIL OFL, src/app/_og/), the
// static instances of the site's display face — satori can't read variable or woff2 fonts.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { WING_LEFT_PATH, WING_RIGHT_PATH } from "@/components/brand/wings-paths";
import { apexOf, ballPosition, solve } from "@/lib/ballistics";

export const alt = "Apex Robotics — FIRST Tech Challenge Team 36674, Tracy, California";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const dir = join(process.cwd(), "src", "app", "_og");
const [light, regular, italic] = await Promise.all([
  readFile(join(dir, "HubotSansExpanded-Light.ttf")),
  readFile(join(dir, "HubotSansExpanded-Regular.ttf")),
  readFile(join(dir, "HubotSansExpanded-Italic.ttf")),
]);

// The real shot (fixed 40° hood, 14 in muzzle) → hairline arc + apex label.
const input = { muzzle: { x: 0, y: 0, z: 14 }, target: { x: 96, y: 0, z: 40 } };
const sol = solve(input);
const apex = apexOf(input, sol);
const W = 1000;
const H = 110;
const sx = (x: number) => ((x + 6) / 112) * W;
const sz = (z: number) => H - (z / (apex.z + 4)) * H;
const pts = Array.from({ length: 49 }, (_, i) => ballPosition(input, sol, (sol.flightTimeSec * i) / 48));
const arc = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)} ${sz(p.z).toFixed(1)}`).join(" ");

const INK = "#ECECE7";
const MUTED = "#9C9C96";
const HAIR = "#2B2B29";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#0E0E0D",
          color: INK,
          fontFamily: "Hubot",
          padding: "56px 60px 40px",
        }}
      >
        <svg viewBox="0 0 803 578" width={172} height={124} fill="#7F7F7F" fillRule="evenodd">
          <path d={WING_LEFT_PATH} />
          <path d={WING_RIGHT_PATH} />
        </svg>
        <div style={{ display: "flex", marginTop: 34, fontSize: 98, fontWeight: 300, letterSpacing: 4, lineHeight: 1 }}>APEX ROBOTICS</div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 19, fontWeight: 400, letterSpacing: 3, color: MUTED }}>
          <span style={{ fontStyle: "italic" }}>FIRST</span>
          <span>® TECH CHALLENGE · TEAM 36674 · TRACY, CA · BIOBUZZ™ 2026–27</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "auto", width: W, position: "relative" }}>
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: sx(apex.x) - 80,
              top: sz(apex.z) - 30,
              width: 160,
              justifyContent: "center",
              fontSize: 14,
              letterSpacing: 2,
              color: INK,
            }}
          >
            {`APEX · ${apex.z.toFixed(1)} IN`}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} fill="none">
            <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke={HAIR} strokeWidth={1} />
            <path d={arc} stroke={MUTED} strokeWidth={1.5} />
            <line x1={sx(apex.x)} x2={sx(apex.x)} y1={sz(apex.z) - 8} y2={sz(apex.z) + 8} stroke={INK} strokeWidth={1.5} />
          </svg>
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", marginTop: 14, fontSize: 13, letterSpacing: 2, color: MUTED }}>
            <span>DWG-001 · REV A</span>
            <span>APEX-R1 · A TURRET SHOOTER THAT AIMS WHILE IT DRIVES</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Hubot", data: light, style: "normal", weight: 300 },
        { name: "Hubot", data: regular, style: "normal", weight: 400 },
        { name: "Hubot", data: italic, style: "italic", weight: 400 },
      ],
    },
  );
}
