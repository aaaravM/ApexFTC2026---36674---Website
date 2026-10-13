import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Real CAD model swap (USER-REQUIREMENTS #1): if the team has exported their robot to
// public/models/apex-r1.glb, every 3D scene uses it; otherwise the procedural concept model.
// Checked once when the dev server / build starts (restart `npm run dev` after adding the file),
// so the browser never 404-probes for a file that isn't there.
const ROBOT_MODEL_FILE = path.join(process.cwd(), "public", "models", "apex-r1.glb");
const robotModel = fs.existsSync(ROBOT_MODEL_FILE) ? "/models/apex-r1.glb" : "";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  env: {
    NEXT_PUBLIC_ROBOT_MODEL: robotModel,
  },
  images: {
    // Next 16 only allows quality 75 unless listed here.
    qualities: [60, 75, 90],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
