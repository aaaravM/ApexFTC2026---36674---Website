import type { Metadata } from "next";
import { RobotLab } from "./robot-lab";

// Robot Lab — the APEX-R1 model on an open bench (src/components/robot). Public and linked from
// /robot, the home index and ⌘K (USER-REQUIREMENTS #8); kept as it is for now.
// Query params drive deterministic states for screenshots, e.g.
//   /lab/robot?look=clay&explode=1&yaw=0.8&angle=front|side|top|threequarter|back|low|aim
//   /lab/robot?aim=1&shot=0.5        (fires a POLLEN ball and freezes it mid-flight)
//   /lab/robot?angle=side&ortho=1&guides=1   (14 in muzzle line, 40° ray, 18 in envelope)
export const metadata: Metadata = {
  title: "Robot Lab",
  description:
    "APEX-R1 on the bench: orbit the concept model of our FTC 36674 turret shooter, change the look, explode it and fire a POLLEN shot.",
  alternates: { canonical: "/lab/robot" },
};

export default function RobotLabPage() {
  return <RobotLab />;
}
