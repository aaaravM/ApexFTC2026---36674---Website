/**
 * Material registry for APEX-R1, keyed by ROLE, in three swappable LOOKS × two TONES:
 *
 *   studio    realistic: satin aluminium, black Yellow Jacket cans with goBILDA-yellow bands,
 *             silicone rubber with a soft sheen, clear polycarbonate, printed parts in the accent.
 *             Metals carry a faint object-space roughness "smudge" so reflections aren't CG-perfect.
 *   clay      industrial-design render, MATTE monochrome with ONE accent on the functional
 *             parts (the ones that touch or move the ball).
 *               tone "dark"  → graphite (#2A2A28–#4A4A46), near-zero metalness, soft warm edge-light
 *               tone "light" → bone with graphite mechanisms (for the light theme)
 *   blueprint flat faces + crisp edge lines, for the CAD page; holes drawn as ink rings.
 *               tone "dark"  → ink-dark sheet, light lines
 *               tone "light" → drafting paper (#EFEDE6), ink lines, accent "highlighter" fills
 *
 * `MaterialLibrary` holds one set of materials for ONE subsystem so it can be ghosted (highlight)
 * without touching the others. Accent changes are applied in place (no shader recompiles); the
 * ghost / fade variants are compiled up front by ApexRobot's prewarm.
 */
import * as THREE from "three";
import type { RobotLook, RobotTone } from "./rig";
import { AO_FRAGMENT_BODY, AO_FRAGMENT_HEAD, AO_UNIFORMS, AO_VERTEX_BODY, AO_VERTEX_HEAD } from "./ao";
import { batteryLabel, hubLabel, numberPlate } from "./textures";

export type { RobotTone };

export const MATERIAL_ROLES = [
  "aluminium",
  "channel",
  "gridPlate",
  "aluminiumDark",
  "steel",
  "fastener",
  "motorCan",
  "motorAccent",
  "gearbox",
  "rubber",
  "rubberGrey",
  "plasticDark",
  "plasticGrey",
  "plasticAccent",
  "nylonWhite",
  "nylonYellow",
  "polycarb",
  "pcb",
  "led",
  "lens",
  "cableRed",
  "cableBlack",
  "cableSleeve",
  "belt",
  "urethane",
  "hubLabelControl",
  "hubLabelExpansion",
  "numberPlate",
  "batteryWrap",
  "ballPollen",
  "ballNectarRed",
  "ballNectarBlue",
] as const;
export type MaterialRole = (typeof MATERIAL_ROLES)[number];

/** Roles that get the accent colour in clay / blueprint (functional: they touch or move the ball). */
export const ACCENT_ROLES: ReadonlySet<MaterialRole> = new Set<MaterialRole>(["plasticAccent", "motorAccent", "urethane", "led"]);

/** Official BIOBUZZ yellow + the site's alliance data colours (DESIGN_SPEC §1). */
export const BALL_COLORS = {
  ballPollen: "#F7E326",
  ballNectarRed: "#FF5A4E",
  ballNectarBlue: "#4C8DFF",
} as const;

/** Default accent = the site's --wing grey (functional micro-accents, DESIGN_SPEC §4). */
export const DEFAULT_ACCENT = "#7F7F7F";

/** Stage background per look × tone (site --bg tokens). */
export function stageBackground(look: RobotLook, tone: RobotTone = "dark") {
  if (look === "blueprint") return tone === "light" ? "#EFEDE6" : "#0E0E0D";
  return tone === "light" ? "#F4F4F1" : "#0E0E0D";
}
/** @deprecated use stageBackground(look, tone) */
export const LOOK_BACKGROUNDS: Record<RobotLook, string> = {
  studio: stageBackground("studio"),
  clay: stageBackground("clay"),
  blueprint: stageBackground("blueprint"),
};

export interface MaterialOptions {
  look: RobotLook;
  tone: RobotTone;
  accent: string;
  alliance: "red" | "blue";
}

type AnyMat = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial | THREE.MeshLambertMaterial;

// ------------------------------------------------------------------------------------------------
// shader patches (composable onBeforeCompile)
// ------------------------------------------------------------------------------------------------
interface ShaderPatch {
  key: string;
  uniforms?: Record<string, THREE.IUniform>;
  /** GLSL placed before `void main() {` in the fragment shader. */
  head?: string;
  /** [search, replacement] pairs applied to the fragment shader. */
  replace?: [string, string][];
  /** GLSL placed before `void main() {` in the vertex shader. */
  vertexHead?: string;
  /** [search, replacement] pairs applied to the vertex shader. */
  vertexReplace?: [string, string][];
}

function addPatch<T extends THREE.Material>(m: T, patch: ShaderPatch): T {
  const list: ShaderPatch[] = (m.userData.patches ??= []);
  list.push(patch);
  m.onBeforeCompile = (shader) => {
    let fs = shader.fragmentShader;
    let vs = shader.vertexShader;
    for (const p of list) {
      if (p.uniforms) Object.assign(shader.uniforms, p.uniforms);
      if (p.head) fs = fs.replace("void main() {", `${p.head}\nvoid main() {`);
      for (const [a, b] of p.replace ?? []) fs = fs.replace(a, b);
      if (p.vertexHead) vs = vs.replace("void main() {", `${p.vertexHead}\nvoid main() {`);
      for (const [a, b] of p.vertexReplace ?? []) vs = vs.replace(a, b);
    }
    shader.fragmentShader = fs;
    shader.vertexShader = vs;
  };
  m.customProgramCacheKey = () => list.map((p) => p.key).join("|");
  return m;
}

/** Soft fresnel edge-light (graphite clay's "slightly lighter edges"). */
function withRim<T extends THREE.MeshStandardMaterial>(m: T, color: string, strength: number): T {
  if (strength <= 0) return m;
  return addPatch(m, {
    key: "rim",
    uniforms: { uApexRimColor: { value: new THREE.Color(color) }, uApexRimStrength: { value: strength } },
    head: "uniform vec3 uApexRimColor;\nuniform float uApexRimStrength;",
    replace: [
      [
        "#include <opaque_fragment>",
        "float apexRim = pow( 1.0 - saturate( dot( normal, geometryViewDir ) ), 2.6 );\n" +
          "outgoingLight += uApexRimColor * apexRim * uApexRimStrength;\n#include <opaque_fragment>",
      ],
    ],
  });
}

/**
 * Faint, large-scale roughness variation in OBJECT space (~5 cm blotches), so studio metals don't
 * reflect like perfect CG mirrors. Object space: it stays put on the part as the robot moves.
 */
function withSmudge<T extends THREE.MeshStandardMaterial>(m: T, amount: number): T {
  return addPatch(m, {
    key: "smudge",
    uniforms: { uApexSmudge: { value: amount } },
    vertexHead: "varying vec3 vApexObj;",
    vertexReplace: [["#include <begin_vertex>", "#include <begin_vertex>\nvApexObj = position;"]],
    head: /* glsl */ `uniform float uApexSmudge;
varying vec3 vApexObj;
float apexHash( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float apexNoise( vec3 x ) {
  vec3 i = floor( x ); vec3 f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( apexHash( i ), apexHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( apexHash( i + vec3( 0, 1, 0 ) ), apexHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( apexHash( i + vec3( 0, 0, 1 ) ), apexHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( apexHash( i + vec3( 0, 1, 1 ) ), apexHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}`,
    replace: [
      [
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = clamp( roughnessFactor * ( 1.0 + uApexSmudge * ( apexNoise( vApexObj * 18.0 ) * 0.7 + apexNoise( vApexObj * 61.0 ) * 0.3 - 0.5 ) ), 0.04, 1.0 );",
      ],
    ],
  });
}

/**
 * Fresnel silhouette that BLENDS toward an ink colour (blueprint): smooth parts (rollers, cans,
 * flywheel) have no crease edges for EdgesGeometry, so their outline comes from here instead.
 */
function withSilhouette<T extends THREE.Material>(m: T, color: string, strength: number, power = 3.5): T {
  return addPatch(m, {
    key: "silhouette",
    uniforms: {
      uApexInk: { value: new THREE.Color(color) },
      uApexInkStrength: { value: strength },
      uApexInkPower: { value: power },
    },
    head: "uniform vec3 uApexInk;\nuniform float uApexInkStrength;\nuniform float uApexInkPower;",
    replace: [
      [
        "#include <opaque_fragment>",
        "float apexSil = pow( 1.0 - saturate( abs( dot( normal, geometryViewDir ) ) ), uApexInkPower );\n" +
          "outgoingLight = mix( outgoingLight, uApexInk, saturate( apexSil * uApexInkStrength ) );\n#include <opaque_fragment>",
      ],
    ],
  });
}

/**
 * X-ray ghost, driven by a uniform (no shader variants): a ghosted fragment becomes one flat ink
 * colour whose alpha follows the fresnel rim — only silhouettes show, faces seen head-on all but
 * vanish. Every ghost fragment of a library has the same colour, so the blend is order-independent
 * (no sorting flicker while orbiting).
 */
function withGhost<T extends THREE.Material>(m: T, color: THREE.ColorRepresentation): T {
  return addPatch(m, {
    key: "ghost",
    uniforms: { uApexGhost: { value: 0 }, uApexGhostInk: { value: new THREE.Color(color) } },
    head: "uniform float uApexGhost;\nuniform vec3 uApexGhostInk;",
    replace: [
      [
        "#include <opaque_fragment>",
        /* glsl */ `if ( uApexGhost > 0.0 ) {
          float apexRimG = pow( 1.0 - saturate( abs( dot( normal, geometryViewDir ) ) ), 2.2 );
          outgoingLight = mix( outgoingLight, uApexGhostInk, uApexGhost );
          diffuseColor.a = mix( diffuseColor.a, 0.035 + 0.6 * apexRimG, uApexGhost );
        }
        #include <opaque_fragment>`,
      ],
    ],
  });
}

/** Baked volumetric AO (see ao.ts): shared uniforms, one 3D texture fetch per fragment. */
function withAo<T extends THREE.Material>(m: T): T {
  return addPatch(m, {
    key: "ao",
    uniforms: AO_UNIFORMS as unknown as Record<string, THREE.IUniform>,
    vertexHead: AO_VERTEX_HEAD,
    vertexReplace: [["#include <project_vertex>", `#include <project_vertex>
${AO_VERTEX_BODY}`]],
    head: AO_FRAGMENT_HEAD,
    replace: [["#include <lights_fragment_end>", `#include <lights_fragment_end>
${AO_FRAGMENT_BODY}`]],
  });
}

/** Ghost ink per look × tone: light lines on dark sheets, dark ink on light ones. */
function ghostInk(look: RobotLook, tone: RobotTone) {
  if (look === "blueprint") return tone === "light" ? "#55534C" : "#B9B9B2";
  if (look === "clay") return tone === "light" ? "#3a3a36" : "#a3a39c";
  return "#b4b8be";
}

const HOLES_GLSL = /* glsl */ `
uniform float uApexGrid;
varying vec4 vApexMask;
float apexCapsule( vec2 p, vec2 a, vec2 b, float r ) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp( dot( pa, ba ) / dot( ba, ba ), 0.0, 1.0 );
  return length( pa - ba * h ) - r;
}
// Signed distance (mm) to the nearest goBILDA hole; negative inside a hole.
float apexHolesSDF( vec2 uv ) {
  if ( uApexGrid > 0.5 ) {
    // pattern plate cell, 24 x 24 mm
    vec2 p = fract( uv ) * 24.0;
    float d = length( p - vec2( 12.0 ) ) - 7.0;
    d = min( d, length( p - vec2( 4.0, 4.0 ) ) - 2.0 );
    d = min( d, length( p - vec2( 20.0, 4.0 ) ) - 2.0 );
    d = min( d, length( p - vec2( 4.0, 20.0 ) ) - 2.0 );
    d = min( d, length( p - vec2( 20.0, 20.0 ) ) - 2.0 );
    d = min( d, length( p - vec2( 12.0, 0.0 ) ) - 2.0 );
    d = min( d, length( p - vec2( 12.0, 24.0 ) ) - 2.0 );
    d = min( d, length( p - vec2( 0.0, 12.0 ) ) - 2.0 );
    d = min( d, length( p - vec2( 24.0, 12.0 ) ) - 2.0 );
    // keep a solid border along the plate's outer edges (no half-holes)
    vec2 mm = uv * 24.0;
    float edge = min( min( mm.x - vApexMask.x, vApexMask.z - mm.x ), min( mm.y - vApexMask.y, vApexMask.w - mm.y ) );
    if ( vApexMask.z > vApexMask.x ) d = max( d, 4.0 - edge );
    return d;
  }
  // 1120 U-channel face: one 24 mm period (u) x 48 mm face (v), bore at (12, 0)
  vec2 p = vec2( fract( uv.x ) * 24.0, uv.y * 48.0 - 24.0 );
  if ( abs( p.y ) > 23.5 ) return 10.0; // keep the face edges solid
  float d = length( p - vec2( 12.0, 0.0 ) ) - 7.0;
  vec2 q = vec2( p.x, abs( p.y ) );
  d = min( d, length( q - vec2( 4.0, 8.0 ) ) - 2.0 );
  d = min( d, length( q - vec2( 20.0, 8.0 ) ) - 2.0 );
  d = min( d, length( q - vec2( 4.0, 16.0 ) ) - 2.0 );
  d = min( d, length( q - vec2( 20.0, 16.0 ) ) - 2.0 );
  d = min( d, apexCapsule( q, vec2( 12.0, 12.0 ), vec2( 12.0, 19.0 ), 2.0 ) );
  d = min( d, apexCapsule( p, vec2( -4.0, 0.0 ), vec2( 4.0, 0.0 ), 2.0 ) );
  d = min( d, apexCapsule( p, vec2( 20.0, 0.0 ), vec2( 28.0, 0.0 ), 2.0 ) );
  return d;
}`;

/**
 * Procedural goBILDA hole pattern. Channels and pattern plates share ONE program (the pattern is
 * picked by a uniform). Anti-aliased on the larger pixel footprint; holes are cut through only when
 * resolved along BOTH screen axes (≳ 4 px), so grazing angles fade to a slightly darker surface
 * instead of grey stains. Pattern plates keep a solid 4 mm border (`apexMask` attribute, uv-mm
 * rectangle). The alphaMap is a 1×1 texture, set only so three emits the UV varying.
 */
function withHoles<T extends THREE.Material>(m: T, kind: "channel" | "grid"): T {
  const mmScale = kind === "grid" ? "vec2( 24.0, 24.0 )" : "vec2( 24.0, 48.0 )";
  (m as unknown as { alphaMap: THREE.Texture | null }).alphaMap = whiteTexture();
  m.alphaTest = 0.5;
  m.alphaToCoverage = true;
  // closed solids: never draw the inside of the far wall through a hole (no lit crescents)
  m.side = THREE.FrontSide;
  // channels have no mask attribute: give the (unused) varying a defined value
  (m as unknown as { defaultAttributeValues: Record<string, number[]> }).defaultAttributeValues = { apexMask: [0, 0, 0, 0] };
  return addPatch(m, {
    key: "holes2",
    uniforms: { uApexGrid: { value: kind === "grid" ? 1 : 0 } },
    vertexHead: "attribute vec4 apexMask;\nvarying vec4 vApexMask;",
    vertexReplace: [["#include <begin_vertex>", "#include <begin_vertex>\nvApexMask = apexMask;"]],
    head: HOLES_GLSL,
    replace: [
      [
        "#include <alphamap_fragment>",
        /* glsl */ `#ifdef USE_ALPHAMAP
        {
          vec2 apexUv = vAlphaMapUv;
          vec2 apexMm = apexUv * ( uApexGrid > 0.5 ? vec2( 24.0 ) : ${mmScale} );
          float apexD = apexHolesSDF( apexUv );
          vec2 apexDx = dFdx( apexMm );
          vec2 apexDy = dFdy( apexMm );
          float apexMax = max( length( apexDx ), length( apexDy ) ); // mm per px, worst axis (AA width)
          float apexMin = min( length( apexDx ), length( apexDy ) ); // best axis (is it resolved?)
          float apexAA = smoothstep( -0.5 * apexMax, 0.5 * apexMax, apexD ); // 0 = hole, 1 = metal
          // far away / grazing, the pattern converges to its average coverage (~78 % metal)
          float apexCover = mix( apexAA, 0.78, smoothstep( 0.9, 2.4, apexMax ) );
          #ifdef APEX_EMISSIVE_FACE
          // blueprint: holes are drawn as thin ink rings, not dark discs
          float apexRing = 1.0 - smoothstep( 0.45 * apexMax, 1.1 * apexMax, abs( apexD ) );
          apexRing *= 1.0 - smoothstep( 0.6, 1.6, apexMax );
          totalEmissiveRadiance = mix( totalEmissiveRadiance, uApexInk, 0.85 * apexRing );
          #else
          diffuseColor.rgb *= mix( 0.6, 1.0, apexCover ) * mix( 0.35, 1.0, apexAA );
          #endif
          // …cut through only when big enough on screen along both axes to stay clean
          diffuseColor.a *= mix( apexAA, 1.0, smoothstep( 0.45, 0.95, apexMin ) );
        }
        #endif`,
      ],
    ],
  });
}

let _white: THREE.DataTexture | null = null;
function whiteTexture() {
  if (!_white) {
    _white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    _white.needsUpdate = true;
  }
  return _white;
}

// ------------------------------------------------------------------------------------------------
// studio
// ------------------------------------------------------------------------------------------------
function studio(role: MaterialRole, o: MaterialOptions): AnyMat {
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const metal = (p: THREE.MeshStandardMaterialParameters, smudge = 0.32) => withSmudge(std({ metalness: 1, ...p }), smudge);
  switch (role) {
    case "aluminium":
      return metal({ color: "#a6a7a8", roughness: 0.38 });
    case "channel":
      return metal({ color: "#a9abad", roughness: 0.34 });
    case "gridPlate":
      return metal({ color: "#a2a4a6", roughness: 0.4 });
    case "aluminiumDark":
      return metal({ color: "#2b2d31", metalness: 0.85, roughness: 0.38 }, 0.2);
    case "steel":
      return std({ color: "#9a9c9f", metalness: 1, roughness: 0.24 });
    case "fastener":
      return std({ color: "#26282b", metalness: 0.9, roughness: 0.34 });
    case "motorCan":
      return std({ color: "#121316", metalness: 0.4, roughness: 0.35 });
    case "motorAccent":
      return std({ color: "#f5c21b", metalness: 0.05, roughness: 0.42 });
    case "gearbox":
      return metal({ color: "#a7a9ab", roughness: 0.3 }, 0.24);
    case "rubber":
      return new THREE.MeshPhysicalMaterial({ color: "#34363a", metalness: 0, roughness: 0.6, sheen: 0.3, sheenRoughness: 0.7, sheenColor: "#ffffff" });
    case "rubberGrey":
      return std({ color: "#55595f", metalness: 0, roughness: 0.74 });
    case "plasticDark":
      return std({ color: "#1d1e21", metalness: 0, roughness: 0.52 });
    case "plasticGrey":
      return std({ color: "#303338", metalness: 0.05, roughness: 0.58 });
    case "plasticAccent":
      return std({ color: o.accent, metalness: 0, roughness: 0.52 });
    case "nylonWhite":
      return std({ color: "#e6e1d4", metalness: 0, roughness: 0.6 });
    case "nylonYellow":
      return std({ color: "#f0c419", metalness: 0, roughness: 0.55 });
    case "polycarb":
      return new THREE.MeshPhysicalMaterial({
        color: "#dbe6ef",
        metalness: 0,
        roughness: 0.06,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.1,
      });
    case "pcb":
      return std({ color: "#163a2b", metalness: 0.1, roughness: 0.55 });
    case "led":
      return std({ color: "#1a1a1a", emissive: "#39ff8a", emissiveIntensity: 3, roughness: 0.3 });
    case "lens":
      return new THREE.MeshPhysicalMaterial({ color: "#050608", metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 });
    case "cableRed":
      return std({ color: "#b3201d", metalness: 0, roughness: 0.48 });
    case "cableBlack":
      return std({ color: "#141517", metalness: 0, roughness: 0.5 });
    case "cableSleeve":
      return std({ color: "#1b1c1f", metalness: 0, roughness: 0.78 });
    case "belt":
      return std({ color: "#141517", metalness: 0, roughness: 0.72 });
    case "urethane":
      return std({ color: "#d4682a", metalness: 0, roughness: 0.42 });
    case "hubLabelControl":
      return std({ map: hubLabel("control"), metalness: 0.05, roughness: 0.55 });
    case "hubLabelExpansion":
      return std({ map: hubLabel("expansion"), metalness: 0.05, roughness: 0.55 });
    case "numberPlate":
      return std({ map: numberPlate("36674", o.alliance), metalness: 0, roughness: 0.4 });
    case "batteryWrap":
      return std({ map: batteryLabel(), metalness: 0, roughness: 0.38 });
    case "ballPollen":
    case "ballNectarRed":
    case "ballNectarBlue":
      return new THREE.MeshPhysicalMaterial({ color: BALL_COLORS[role], metalness: 0, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  }
}

// ------------------------------------------------------------------------------------------------
// clay
// ------------------------------------------------------------------------------------------------
interface ClayPalette {
  structure: string; // aluminium / channel / gearbox / steel
  structureShade: string; // plates, secondary structure
  mechanism: string; // motors, rubber, electronics, hardware
  mechanismSoft: string; // labels, white nylon, number plate
  clear: string;
  clearOpacity: number;
  metalness: number;
  roughness: number;
  mechRoughness: number;
  rim: string;
  rimStrength: number;
}
/** Graphite: matte, warm-neutral; tonal values follow DESIGN_SPEC (#2A2A28 → #4A4A46). */
const GRAPHITE: ClayPalette = {
  structure: "#4A4A46",
  structureShade: "#42423F",
  mechanism: "#2A2A28",
  mechanismSoft: "#353533",
  clear: "#77776f",
  clearOpacity: 0.3,
  metalness: 0.04,
  roughness: 0.75,
  mechRoughness: 0.8,
  rim: "#d8d6cf",
  rimStrength: 0.2,
};
const BONE: ClayPalette = {
  structure: "#E8E3D9",
  structureShade: "#D6D0C4",
  mechanism: "#3B3D41",
  mechanismSoft: "#4A4C51",
  clear: "#f4f1ea",
  clearOpacity: 0.38,
  metalness: 0,
  roughness: 0.86,
  mechRoughness: 0.8,
  rim: "#ffffff",
  rimStrength: 0.12,
};

function clay(role: MaterialRole, o: MaterialOptions): AnyMat {
  const P = o.tone === "light" ? BONE : GRAPHITE;
  const mat = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) =>
    withRim(new THREE.MeshStandardMaterial({ color, roughness: P.roughness, metalness: P.metalness, ...extra }), P.rim, P.rimStrength);
  const mech = (color: THREE.ColorRepresentation = P.mechanism, extra: THREE.MeshStandardMaterialParameters = {}) =>
    mat(color, { roughness: P.mechRoughness, metalness: Math.min(P.metalness, 0.05), ...extra });
  switch (role) {
    case "aluminium":
    case "gearbox":
    case "steel":
    case "channel":
      return mat(P.structure);
    case "gridPlate":
      return mat(P.structureShade);
    case "polycarb":
      return new THREE.MeshStandardMaterial({
        color: P.clear,
        roughness: 0.35,
        metalness: 0,
        transparent: true,
        opacity: P.clearOpacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    case "nylonWhite":
    case "hubLabelControl":
    case "hubLabelExpansion":
    case "batteryWrap":
    case "numberPlate":
      return mech(P.mechanismSoft);
    case "aluminiumDark":
    case "fastener":
    case "motorCan":
    case "rubber":
    case "rubberGrey":
    case "plasticDark":
    case "plasticGrey":
    case "pcb":
    case "lens":
    case "cableRed":
    case "cableBlack":
    case "cableSleeve":
    case "belt":
    case "nylonYellow":
      return mech();
    case "plasticAccent":
    case "motorAccent":
    case "urethane":
      return mat(o.accent, { roughness: 0.66, metalness: 0.02 });
    case "led":
      return mat(o.accent, { roughness: 0.5, emissive: o.accent, emissiveIntensity: 0.8 });
    case "ballPollen":
    case "ballNectarRed":
    case "ballNectarBlue":
      return new THREE.MeshStandardMaterial({ color: BALL_COLORS[role], roughness: 0.55, metalness: 0 });
  }
}

// ------------------------------------------------------------------------------------------------
// blueprint (faces only; lines come from MaterialLibrary.line())
// ------------------------------------------------------------------------------------------------
interface BlueprintPalette {
  face: string;
  faceOpacity: number;
  clearFace: string;
  clearOpacity: number;
  line: string;
  minorLine: string;
  clearLine: string;
  accentFaceMix: number; // how much accent tints functional faces ("highlighter")
}
const BP_DARK: BlueprintPalette = {
  face: "#141413",
  faceOpacity: 1,
  clearFace: "#3a3a36",
  clearOpacity: 0.12,
  line: "#B9B9B2",
  minorLine: "#6B6B66",
  clearLine: "#7d7d77",
  accentFaceMix: 0.18,
};
const BP_PAPER: BlueprintPalette = {
  face: "#EFEDE6",
  faceOpacity: 1,
  clearFace: "#d3d0c6",
  clearOpacity: 0.25,
  line: "#141413",
  minorLine: "#55534C",
  clearLine: "#55534C",
  accentFaceMix: 0.55,
};

function blueprint(role: MaterialRole, o: MaterialOptions): AnyMat {
  const P = o.tone === "light" ? BP_PAPER : BP_DARK;
  // Flat "unlit" faces: black diffuse + emissive face colour, so lights don't shade them; the
  // silhouette patch inks the outline of smooth parts.
  const face = (color: THREE.ColorRepresentation, opacity: number, extra: THREE.MeshLambertMaterialParameters = {}) => {
    const m = new THREE.MeshLambertMaterial({
      color: "#000000",
      emissive: color,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      toneMapped: false,
      ...extra,
    });
    m.userData.emissiveFace = true;
    m.defines = { ...(m.defines ?? {}), APEX_EMISSIVE_FACE: "" };
    return withSilhouette(m, P.line, opacity < 1 ? 0.6 : 0.95, opacity < 1 ? 2.5 : 4.4);
  };
  switch (role) {
    case "polycarb":
      return face(P.clearFace, P.clearOpacity);
    case "channel":
    case "gridPlate":
      return face(P.face, 1);
    case "ballPollen":
    case "ballNectarRed":
    case "ballNectarBlue":
      return face(new THREE.Color(P.face).lerp(new THREE.Color(BALL_COLORS[role]), 0.75), 1);
    case "plasticAccent":
    case "motorAccent":
    case "urethane":
    case "led":
      return face(new THREE.Color(P.face).lerp(new THREE.Color(o.accent), P.accentFaceMix), 1);
    default:
      return face(P.face, P.faceOpacity);
  }
}

export function createMaterial(role: MaterialRole, o: MaterialOptions): AnyMat {
  const m = o.look === "studio" ? studio(role, o) : o.look === "clay" ? clay(role, o) : blueprint(role, o);
  if (role === "channel") withHoles(m, "channel");
  else if (role === "gridPlate") withHoles(m, "grid");
  withGhost(m, ghostInk(o.look, o.tone));
  if (o.look !== "blueprint") withAo(m);
  // transparent + DoubleSide would otherwise render in two passes (back then front faces) — that
  // doubles the draw calls of every ghosted part when a subsystem is highlighted
  m.forceSinglePass = true;
  m.name = `${o.look}-${o.tone}:${role}`;
  return m;
}

/** Roles drawn with the thinner/softer "minor" line in blueprint (small hardware, cables). */
const MINOR_LINE_ROLES: ReadonlySet<MaterialRole> = new Set<MaterialRole>([
  "fastener",
  "nylonWhite",
  "nylonYellow",
  "cableRed",
  "cableBlack",
  "cableSleeve",
  "pcb",
  "lens",
]);

/** Edge-line colour for a role in the blueprint look. */
export function lineColorFor(role: MaterialRole, accent: string, tone: RobotTone = "dark") {
  const P = tone === "light" ? BP_PAPER : BP_DARK;
  if (ACCENT_ROLES.has(role)) return tone === "light" ? P.line : accent;
  if (role === "ballPollen" || role === "ballNectarRed" || role === "ballNectarBlue") return BALL_COLORS[role];
  if (role === "polycarb") return P.clearLine;
  if (MINOR_LINE_ROLES.has(role)) return P.minorLine;
  return P.line;
}

// ------------------------------------------------------------------------------------------------
// Per-subsystem library with ghosting
// ------------------------------------------------------------------------------------------------
const GHOST_OPACITY = 0.14;

interface Entry {
  role: MaterialRole;
  mat: AnyMat;
  baseOpacity: number;
  baseTransparent: boolean;
  baseDepthWrite: boolean;
  /** Original colour (to restore after ghost tint). For emissive-faced blueprint materials this is
   * the emissive colour, which is what you actually see. */
  baseColor: THREE.Color;
  emissiveFace: boolean;
}

/** The colour a viewer sees: `emissive` for blueprint faces, `color` otherwise. */
function visibleColor(m: AnyMat): THREE.Color {
  return m.userData.emissiveFace ? (m as THREE.MeshLambertMaterial).emissive : (m as THREE.MeshStandardMaterial).color;
}

interface LineEntry {
  mat: THREE.LineBasicMaterial;
  baseOpacity: number;
}

function ghostTint(look: RobotLook, tone: RobotTone) {
  if (look === "blueprint") return new THREE.Color(tone === "light" ? "#EFEDE6" : "#141413");
  if (look === "clay") return new THREE.Color(tone === "light" ? "#ffffff" : "#6b6b66");
  return new THREE.Color("#8d8f93");
}

export class MaterialLibrary {
  readonly look: RobotLook;
  readonly tone: RobotTone;
  private accent: string;
  private alliance: "red" | "blue";
  private mats = new Map<MaterialRole, Entry>();
  private lines = new Map<MaterialRole, LineEntry>();
  private dim = 0;
  private fade = 1;
  private tint: THREE.Color;

  constructor(look: RobotLook, accent: string, alliance: "red" | "blue", tone: RobotTone = "dark") {
    this.look = look;
    this.tone = tone;
    this.accent = accent;
    this.alliance = alliance;
    this.tint = ghostTint(look, tone);
  }

  get(role: MaterialRole): AnyMat {
    let e = this.mats.get(role);
    if (!e) {
      const mat = createMaterial(role, { look: this.look, tone: this.tone, accent: this.accent, alliance: this.alliance });
      e = {
        role,
        mat,
        baseOpacity: mat.opacity,
        baseTransparent: mat.transparent,
        baseDepthWrite: mat.depthWrite,
        baseColor: visibleColor(mat).clone(),
        emissiveFace: !!mat.userData.emissiveFace,
      };
      this.mats.set(role, e);
      this.applyDim(e);
    }
    return e.mat;
  }

  line(role: MaterialRole): THREE.LineBasicMaterial {
    let e = this.lines.get(role);
    if (!e) {
      const baseOpacity = role === "polycarb" ? 0.6 : MINOR_LINE_ROLES.has(role) ? 0.7 : 0.95;
      const mat = new THREE.LineBasicMaterial({
        color: lineColorFor(role, this.accent, this.tone),
        transparent: true,
        opacity: baseOpacity,
        depthWrite: false,
        toneMapped: false,
      });
      mat.name = `line:${role}`;
      e = { mat, baseOpacity };
      this.lines.set(role, e);
      this.applyLineDim(e);
    }
    return e.mat;
  }

  /** Update the accent in place (no shader recompiles). */
  setAccent(accent: string) {
    if (accent === this.accent) return;
    this.accent = accent;
    for (const e of this.mats.values()) {
      if (!ACCENT_ROLES.has(e.role)) continue;
      if (this.look === "studio" && e.role !== "plasticAccent") continue;
      const fresh = createMaterial(e.role, { look: this.look, tone: this.tone, accent, alliance: this.alliance });
      e.baseColor.copy(visibleColor(fresh));
      if (!e.emissiveFace && "emissive" in e.mat && "emissive" in fresh)
        (e.mat as THREE.MeshStandardMaterial).emissive.copy((fresh as THREE.MeshStandardMaterial).emissive);
      fresh.dispose();
      this.applyDim(e);
    }
    for (const [role, e] of this.lines) e.mat.color.set(lineColorFor(role, accent, this.tone));
  }

  /** 0 = normal, 1 = fully ghosted. */
  setDim(v: number) {
    const next = Math.round(v * 1000) / 1000;
    if (next === this.dim) return;
    this.dim = next;
    for (const e of this.mats.values()) this.applyDim(e);
    for (const e of this.lines.values()) this.applyLineDim(e);
  }

  getDim() {
    return this.dim;
  }

  /** 1 = normal, 0 = invisible (used to fade the wiring harness out as the robot explodes). */
  setFade(v: number) {
    const next = Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
    if (next === this.fade) return;
    this.fade = next;
    for (const e of this.mats.values()) this.applyDim(e);
    for (const e of this.lines.values()) this.applyLineDim(e);
  }

  /** Scale a role's emissive intensity (LED breathing / blinking). No recompiles. */
  setEmissiveScale(role: MaterialRole, k: number) {
    const e = this.mats.get(role);
    if (!e || e.emissiveFace) return;
    const m = e.mat as THREE.MeshStandardMaterial;
    if (!("emissiveIntensity" in m)) return;
    m.userData.baseEmissive ??= m.emissiveIntensity;
    m.emissiveIntensity = (m.userData.baseEmissive as number) * k;
  }

  /** Every material created so far (faces + lines). */
  materials(): THREE.Material[] {
    return [...[...this.mats.values()].map((e) => e.mat), ...[...this.lines.values()].map((e) => e.mat)];
  }

  private applyDim(e: Entry) {
    const d = this.dim;
    const f = this.fade;
    const m = e.mat;
    const ghost = d > 0.001;
    const transparent = ghost || f < 0.999 || e.baseTransparent;
    const opacity = (e.baseOpacity * (1 - d) + Math.min(e.baseOpacity, GHOST_OPACITY) * d) * f;
    if (m.transparent !== transparent) {
      m.transparent = transparent;
      m.needsUpdate = true;
    }
    m.opacity = opacity;
    m.depthWrite = ghost || f < 0.999 ? d < 0.5 && f > 0.5 && e.baseDepthWrite : e.baseDepthWrite;
    const tint = this.look === "clay" ? 0.3 : this.look === "blueprint" ? 0.5 : 0.35;
    visibleColor(m).copy(e.baseColor).lerp(this.tint, d * tint);
    const g = (m.userData.patches as ShaderPatch[] | undefined)?.find((p) => p.key === "ghost");
    if (g?.uniforms) g.uniforms.uApexGhost.value = d;
  }

  private applyLineDim(e: LineEntry) {
    e.mat.opacity = e.baseOpacity * (1 - 0.8 * this.dim) * this.fade;
  }

  dispose() {
    for (const e of this.mats.values()) e.mat.dispose();
    for (const e of this.lines.values()) e.mat.dispose();
    this.mats.clear();
    this.lines.clear();
  }
}
