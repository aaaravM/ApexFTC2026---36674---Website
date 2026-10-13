"use client";

// ActivityPause — drop inside ANY R3F <Canvas> (e.g. the robot engine's <RobotCanvas>) to stop
// the render loop while Next's <Activity> keeps the route mounted but hidden.
//
//   <RobotCanvas>
//     <ActivityPause />
//     <Stage …><ApexRobot … /></Stage>
//   </RobotCanvas>
//
// Why: with cacheComponents, up to 3 visited routes stay mounted (display:none). R3F bridges
// Activity into its own reconciler, so effects inside the canvas clean up on hide — but the
// default render loop keeps calling gl.render (lab: ~540 frames/s while hidden). This saves the
// current frameloop on hide, sets "never", and restores it when the route is shown again.
// <SceneShell> already does this; use ActivityPause only with other canvas wrappers.

import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";

type Frameloop = "always" | "demand" | "never";

export function ActivityPause() {
  const get = useThree((s) => s.get);
  const saved = useRef<Frameloop | null>(null);

  useLayoutEffect(() => {
    const state = get();
    if (saved.current) {
      state.setFrameloop(saved.current);
      if (saved.current === "demand") state.invalidate();
      saved.current = null;
    }
    return () => {
      const s = get();
      saved.current = s.frameloop as Frameloop;
      s.setFrameloop("never");
    };
  }, [get]);

  return null;
}
