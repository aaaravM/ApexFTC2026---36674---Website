// Motion kit — shared animation primitives for every page (added at the team's request for "more
// animations" while keeping the minimal look). Monochrome, mechanical, reduced-motion safe, and
// every effect renders its final state on the server.
//
//   import { TextReveal, StretchIn, CountUp, Scramble, LineDraw, ImageWipe, RollText,
//            Parallax, ScrollProgress, Stagger, StaggerItem, Magnetic } from "@/components/motion";

export { TextReveal, StretchIn } from "./text-reveal";
export { CountUp } from "./count-up";
export { Scramble } from "./scramble";
export { LineDraw, ImageWipe, RollText } from "./reveals";
export { Parallax, ScrollProgress, Stagger, StaggerItem, Magnetic } from "./scroll";
export { useArm } from "./use-arm";
