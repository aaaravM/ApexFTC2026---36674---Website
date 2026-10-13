// Sequence index for Plot fx items (server-safe helper — plot-motion.tsx is a client module).
//   <li className="fx-slide" style={seq(2)}>  → plays at --fx-delay + 2 × --fx-step
import type { CSSProperties } from "react";

export const seq = (n: number, extra?: CSSProperties) => ({ "--i": n, ...extra }) as CSSProperties;
