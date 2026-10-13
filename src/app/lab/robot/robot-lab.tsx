"use client";

import dynamic from "next/dynamic";

// The canvas is client-only: WebGL has no server render, and the scene reads window.location.
const RobotLabScene = dynamic(() => import("./robot-lab-scene"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0E0E0D] font-mono text-[11px] tracking-[0.12em] text-[#9C9C96] uppercase">
      Loading robot lab…
    </div>
  ),
});

export function RobotLab() {
  return <RobotLabScene />;
}
