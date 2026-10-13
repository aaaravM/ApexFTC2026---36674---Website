"use client";

/**
 * Reusable studio stage for the robot.
 *
 *   <RobotCanvas>                       Canvas: dpr clamped to [1, maxDpr] and stepped by
 *     <Stage look="clay" tone="dark">   PerformanceMonitor, Neutral tone mapping, paused offscreen
 *       <ApexRobot look="clay" … />     lights (no HDRI downloads), contact shadows, floor, post
 *     </Stage>
 *   </RobotCanvas>
 *
 * Stage also works inside any other Canvas (e.g. the site's SceneShell): it then runs its own
 * PerformanceMonitor for its quality level (shadow resolution / extra shadow layer).
 *
 * Lighting uses drei <Environment> with <Lightformer> children only — drei's `preset` option
 * fetches HDRIs from raw.githack.com, so it is never used here. The environment children are
 * memoised: drei re-captures the cube (and its PMREM) whenever `children` changes identity.
 *
 * Contact shadows are re-rendered only when something in the scene moved (a cheap transform
 * signature, skipping parts that just spin in place), not every frame.
 */
import { createContext, memo, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type CanvasProps } from "@react-three/fiber";
import { Environment, Grid, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";
import { stageBackground } from "./materials";
import type { RobotLook, RobotTone } from "./rig";

export type StageQuality = "high" | "low";
const QualityContext = createContext<StageQuality | null>(null);
/** Quality chosen by the enclosing RobotCanvas (or "high" outside one). */
export const useStageQuality = () => useContext(QualityContext) ?? "high";

export interface RenderStats {
  calls: number;
  triangles: number;
  lines: number;
  geometries: number;
  textures: number;
  programs: number;
}

declare global {
  interface Window {
    __apexRenderInfo?: RenderStats;
  }
}

export type RobotCanvasProps = Omit<CanvasProps, "dpr" | "children"> & {
  children?: ReactNode;
  /** Force a quality level instead of letting PerformanceMonitor decide. */
  quality?: StageQuality;
  /** Called when PerformanceMonitor changes the quality. */
  onQualityChange?: (q: StageQuality) => void;
  /** Upper DPR clamp (lower clamp is 1). Default 2. */
  maxDpr?: number;
  /** Stop rendering while the canvas is scrolled out of view (default true). */
  pauseOffscreen?: boolean;
  /**
   * The scene will use <Stage effects>: the composer does its own MSAA, so the context is created
   * without antialias (no paying for MSAA twice). Changing it requires a remount (key the canvas).
   */
  postEffects?: boolean;
};

/** Client-only canvas with sensible defaults for the robot (import it with next/dynamic, ssr:false). */
export function RobotCanvas({
  children,
  quality: forced,
  onQualityChange,
  maxDpr = 2,
  pauseOffscreen = true,
  postEffects = false,
  frameloop,
  gl,
  camera,
  style,
  className,
  ...props
}: RobotCanvasProps) {
  const deviceDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const top = Math.min(maxDpr, Math.max(1, deviceDpr));
  // PerformanceMonitor's factor (0–1) steps the DPR smoothly instead of jumping from top to 1
  const [factor, setFactor] = useState(1);
  const [auto, setAuto] = useState<StageQuality>("high");
  const quality = forced ?? auto;
  const dpr = forced === "low" ? 1 : forced === "high" ? top : Math.round((1 + factor * (top - 1)) * 20) / 20;
  const setQuality = (q: StageQuality) => {
    if (q === auto) return;
    setAuto(q);
    onQualityChange?.(q);
  };

  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!pauseOffscreen || !wrap.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [pauseOffscreen]);
  // high-DPR screens hide aliasing; MSAA there mostly costs bandwidth
  const [antialias] = useState(() => !postEffects && deviceDpr < 1.5);

  return (
    <div ref={wrap} className={className} style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      <Canvas
        dpr={dpr}
        shadows={false}
        frameloop={visible ? (frameloop ?? "always") : "never"}
        gl={{
          antialias,
          powerPreference: "high-performance",
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1.05,
          ...(gl && typeof gl === "object" && !(gl instanceof THREE.WebGLRenderer) ? gl : {}),
        }}
        camera={camera ?? { fov: 30, near: 0.02, far: 80, position: [0.95, 0.62, 1.15] }}
        {...props}
      >
        <PerformanceMonitor
          bounds={(refresh) => (refresh > 90 ? [55, 90] : [40, 58])}
          flipflops={4}
          factor={1}
          step={0.2}
          onChange={({ factor: f }) => setFactor(f)}
          onDecline={({ factor: f }) => f < 0.5 && setQuality("low")}
          onIncline={({ factor: f }) => f > 0.7 && setQuality("high")}
          onFallback={() => {
            setFactor(0);
            setQuality("low");
          }}
        >
          <QualityContext.Provider value={quality}>{children}</QualityContext.Provider>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// floor
// ------------------------------------------------------------------------------------------------

/**
 * A soft pool of light (or shade, on light tones) that fades to fully transparent: a seamless
 * "infinite" studio floor that also works on a transparent canvas.
 */
function StudioFloor({ glow, radius = 3 }: { glow: number; radius?: number }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const rgb = glow >= 0 ? "255,255,255" : "0,0,0";
    const a = Math.abs(glow);
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.45, `rgba(${rgb},${a * 0.35})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [glow]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.0005, 0]} renderOrder={-1} raycast={() => null}>
      <circleGeometry args={[radius, 64]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

// ------------------------------------------------------------------------------------------------
// lighting
// ------------------------------------------------------------------------------------------------

/**
 * Big gradient sphere inside the environment scene: a photo-studio "cyc". Without it a
 * Lightformer-only environment is black between the lights and flat metal faces reflect black.
 */
function EnvBackdrop({ top, horizon, bottom }: { top: string; horizon: string; bottom: string }) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(40, 48, 24);
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const cTop = new THREE.Color(top);
    const cMid = new THREE.Color(horizon);
    const cBot = new THREE.Color(bottom);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 40; // -1..1
      if (y >= 0.08) c.copy(cMid).lerp(cTop, Math.pow((y - 0.08) / 0.92, 0.8));
      else if (y >= -0.35) c.copy(cMid);
      else c.copy(cMid).lerp(cBot, Math.pow((-y - 0.35) / 0.65, 0.6));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [top, horizon, bottom]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

interface LightRecipe {
  ambient: number;
  hemi: [string, string, number];
  key: [number, string];
  fill: [number, string] | null;
  rim: [number, string];
  env: number;
  cyc: { top: string; horizon: string; bottom: string };
}

/** Per look × tone. Neutral (not blue) everywhere: the graphite/bone palettes are warm-neutral greys. */
function recipe(look: RobotLook, tone: RobotTone): LightRecipe {
  if (look === "clay" && tone === "light")
    return {
      ambient: 0.2,
      hemi: ["#ffffff", "#b8b0a2", 0.45],
      key: [1.9, "#fff4e6"],
      fill: [0.35, "#f4f2ee"],
      rim: [0.55, "#f2f1ee"],
      env: 0.7,
      cyc: { top: "#ffffff", horizon: "#d9d4ca", bottom: "#8f897d" },
    };
  if (look === "clay")
    return {
      ambient: 0.12,
      hemi: ["#f2f1ee", "#1a1a19", 0.45],
      key: [2.0, "#fff6ea"],
      fill: [0.65, "#efeeea"],
      rim: [1.0, "#e9e7e1"],
      env: 0.8,
      cyc: { top: "#616163", horizon: "#333335", bottom: "#141415" },
    };
  return {
    ambient: 0.05,
    hemi: ["#ececea", "#18181a", 0.3],
    key: [1.25, "#fff4e6"],
    fill: null,
    rim: [1.35, "#f4f4f2"],
    env: 1,
    cyc: { top: "#5c5d60", horizon: "#37383b", bottom: "#18181a" },
  };
}

function EnvironmentRig({ look, tone, intensity }: { look: RobotLook; tone: RobotTone; intensity: number }) {
  const r = recipe(look, tone);
  const studio = look === "studio";
  const bone = look === "clay" && tone === "light";
  // memoised so drei's EnvironmentPortal (keyed on `children`) captures the cube + PMREM once
  const children = useMemo(
    () => (
      <>
        <EnvBackdrop {...r.cyc} />
        {/* overhead: three strips with dark gaps (a single big panel flattens top faces to white) */}
        {[-1.3, 0, 1.3].map((x) => (
          <Lightformer key={x} form="rect" intensity={bone ? 1.1 : studio ? 1.0 : 1.1} position={[x, 4.2, 0.5]} rotation={[Math.PI / 2, 0, 0]} scale={[0.5, 4.6, 1]} />
        ))}
        {/* key softbox, front-left (the side the default camera sees) */}
        <Lightformer form="rect" intensity={bone ? 1.3 : studio ? 2.0 : 1.5} position={[2.6, 1.8, 2.6]} scale={[2.2, 2.2, 1]} target={[0, 0.25, 0]} />
        {/* crisp vertical strip, front-right: specular lines on cans, rollers, edges */}
        <Lightformer form="rect" intensity={bone ? 1.6 : 3.2} position={[-1.8, 1.3, 2.8]} scale={[0.3, 3.4, 1]} target={[0, 0.2, 0]} />
        {/* tall side softboxes at ±90° so vertical faces get gradients instead of going flat */}
        <Lightformer form="rect" intensity={bone ? 0.9 : studio ? 1.25 : 0.9} position={[3.4, 1.1, 0.1]} scale={[1.3, 3.6, 1]} target={[0, 0.25, 0]} />
        <Lightformer form="rect" intensity={bone ? 0.6 : studio ? 0.8 : 0.6} position={[-3.4, 1.1, -0.2]} scale={[1.3, 3.6, 1]} target={[0, 0.25, 0]} />
        {/* black flag, front-right low: a dark band in the reflections for contrast */}
        <Lightformer form="rect" color="#000000" intensity={1} position={[-2.4, 0.5, 2.2]} scale={[2.2, 1.4, 1]} target={[0, 0.25, 0]} />
        {/* bounce cards behind and below the horizon: vertical metal seen from above reflects these
            (a dark studio floor would otherwise turn every side face black) */}
        <Lightformer form="rect" intensity={bone ? 0.7 : 1.2} position={[3.0, -0.4, -2.2]} scale={[4.5, 2.6, 1]} target={[0, 0.3, 0]} />
        <Lightformer form="rect" intensity={bone ? 0.5 : 0.85} position={[-3.0, -0.4, -2.4]} scale={[4.5, 2.6, 1]} target={[0, 0.3, 0]} />
        <Lightformer form="rect" intensity={bone ? 0.4 : 0.6} position={[0, -0.8, 2.6]} scale={[4, 2, 1]} target={[0, 0.3, 0]} />
        {/* neutral rim strip, back and low: rims edges without flooding top faces */}
        <Lightformer form="rect" intensity={bone ? 0.8 : 1.3} color="#f2f2f0" position={[0.3, 0.9, -3.4]} scale={[5, 0.45, 1]} target={[0, 0.3, 0]} />
      </>
    ),
    // r/studio/bone derive from look + tone
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [look, tone],
  );
  return (
    <Environment frames={1} resolution={256} environmentIntensity={r.env * intensity}>
      {children}
    </Environment>
  );
}

const StageLights = memo(function StageLights({ look, tone, intensity = 1 }: { look: RobotLook; tone: RobotTone; intensity?: number }) {
  if (look === "blueprint") return <ambientLight intensity={0.6} />;
  const r = recipe(look, tone);
  const k = intensity;
  return (
    <>
      <ambientLight intensity={r.ambient} />
      <hemisphereLight args={[r.hemi[0], r.hemi[1], r.hemi[2]]} />
      {/* key: front-left, high */}
      <directionalLight position={[2.6, 4.2, 3.0]} intensity={r.key[0] * k} color={r.key[1]} />
      {/* soft fill from the right */}
      {r.fill ? <directionalLight position={[-3, 1.6, 1.8]} intensity={r.fill[0] * k} color={r.fill[1]} /> : null}
      {/* rim from behind: black parts keep a silhouette on the dark background */}
      <directionalLight position={[-2.8, 2.4, -3]} intensity={r.rim[0] * k} color={r.rim[1]} />
      <EnvironmentRig look={look} tone={tone} intensity={k} />
    </>
  );
});

// ------------------------------------------------------------------------------------------------
// contact shadows (event-driven)
// ------------------------------------------------------------------------------------------------

/**
 * Signature of every shadow-relevant transform (and instanced-mesh update). Parts flagged
 * `userData.spinner` (wheels, rollers, flywheel, pulleys…) are skipped: spinning in place doesn't
 * change their shadow.
 */
function sceneSignature(scene: THREE.Scene, skip: THREE.Object3D) {
  let h = 0;
  let i = 0;
  const stack: THREE.Object3D[] = [scene];
  while (stack.length) {
    const o = stack.pop()!;
    // the shadow cameras only see layer 0: anything else (DETAIL_LAYER parts, flying balls) can't
    // change the shadow, so it can't trigger a re-render either
    if (!o.visible || o === skip || o.userData?.spinner || !o.layers.isEnabled(0)) continue;
    if ((o as THREE.Mesh).isMesh) {
      const e = o.matrixWorld.elements;
      i++;
      h += (e[12] * 13.1 + e[13] * 17.3 + e[14] * 19.7 + e[0] * 3.1 + e[2] * 5.3 + e[8] * 7.7 + e[5] * 2.9) * ((i % 97) + 1);
      const inst = o as THREE.InstancedMesh;
      if (inst.isInstancedMesh) h += inst.instanceMatrix.version * 0.37 + inst.count * 0.11;
    }
    for (const c of o.children) stack.push(c);
  }
  return h + i * 0.001;
}

interface ShadowLayer {
  rt: THREE.WebGLRenderTarget;
  blurRt: THREE.WebGLRenderTarget;
  camera: THREE.OrthographicCamera;
  material: THREE.MeshBasicMaterial;
  blur: number;
  y: number;
}

type ShadowKit = {
  depth: THREE.MeshDepthMaterial;
  hBlur: THREE.ShaderMaterial;
  vBlur: THREE.ShaderMaterial;
  blurPlane: THREE.Mesh;
  layers: ShadowLayer[];
};

/** Depth pass from below + two blur passes per layer — only when the scene's transforms changed. */
function renderSoftShadows(scene: THREE.Scene, gl: THREE.WebGLRenderer, kit: ShadowKit, g: THREE.Object3D, s: { sig: number; settle: number }) {
  scene.updateMatrixWorld();
  const sig = sceneSignature(scene, g);
  if (sig !== s.sig) {
    s.sig = sig;
    s.settle = 2; // render this frame and the next (catches transforms applied after us)
  }
  if (s.settle <= 0) return;
  s.settle--;
  const { depth, hBlur, vBlur, blurPlane } = kit;
  const bg = scene.background;
  const override = scene.overrideMaterial;
  g.visible = false;
  scene.background = null;
  for (const l of kit.layers) {
    // the blur quad sits just in front of the upward-looking shadow camera
    blurPlane.position.set(0, l.y + 0.002, 0);
    blurPlane.updateMatrixWorld();
    scene.overrideMaterial = depth;
    gl.setRenderTarget(l.rt);
    gl.clear();
    gl.render(scene, l.camera);
    // two blur passes (the second softer), as drei's ContactShadows does
    for (const b of [l.blur, l.blur * 0.4]) {
      scene.overrideMaterial = override;
      blurPlane.visible = true;
      blurPlane.material = hBlur;
      hBlur.uniforms.tDiffuse.value = l.rt.texture;
      hBlur.uniforms.h.value = b / 256;
      gl.setRenderTarget(l.blurRt);
      gl.render(blurPlane, l.camera);
      blurPlane.material = vBlur;
      vBlur.uniforms.tDiffuse.value = l.blurRt.texture;
      vBlur.uniforms.v.value = b / 256;
      gl.setRenderTarget(l.rt);
      gl.render(blurPlane, l.camera);
      blurPlane.visible = false;
    }
  }
  gl.setRenderTarget(null);
  scene.overrideMaterial = override;
  scene.background = bg;
  g.visible = true;
}

/** The per-program error check (getProgramInfoLog etc.) costs ~150 ms on load: development only. */
function configureRenderer(gl: THREE.WebGLRenderer) {
  gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
}

/**
 * Contact shadows (drei's ContactShadows technique: a depth pass from below + two blur passes),
 * rendered only when the scene's transforms change. Two layers at high quality: a wide soft one
 * and a tight dark one that grounds the wheels.
 */
function SoftShadows({ scale, light, quality }: { scale: number; light: boolean; quality: StageQuality }) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const root = useRef<THREE.Group>(null);
  const res = quality === "high" ? 1024 : 512;
  // the tight contact layer only pays off when the robot is large on screen (not on field-scale stages)
  const tight = quality === "high" && scale <= 2.2;

  const kit = useMemo(() => {
    const depth = new THREE.MeshDepthMaterial();
    depth.depthTest = depth.depthWrite = false;
    const color = new THREE.Color(light ? "#4a4237" : "#000000");
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.ucolor = { value: color };
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "uniform vec3 ucolor;\nvoid main() {")
        .replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );", "vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );");
    };
    const hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
    const vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
    hBlur.depthTest = vBlur.depthTest = false;
    const planeGeo = new THREE.PlaneGeometry(scale, scale).rotateX(Math.PI / 2);
    const blurPlane = new THREE.Mesh(planeGeo);
    const make = (resolution: number, far: number, blur: number, opacity: number, y: number): ShadowLayer => {
      const rt = new THREE.WebGLRenderTarget(resolution, resolution);
      const blurRt = new THREE.WebGLRenderTarget(resolution, resolution);
      rt.texture.generateMipmaps = blurRt.texture.generateMipmaps = false;
      const camera = new THREE.OrthographicCamera(-scale / 2, scale / 2, scale / 2, -scale / 2, 0, far);
      const material = new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, opacity, depthWrite: false, toneMapped: false });
      return { rt, blurRt, camera, material, blur, y };
    };
    const layers = [make(res, 0.6, 2.4, light ? 0.5 : 0.8, 0.0004)];
    if (tight) layers.push(make(res, 0.045, 0.6, light ? 0.5 : 0.7, 0.0006));
    return { depth, hBlur, vBlur, planeGeo, blurPlane, layers };
  }, [scale, light, res, tight]);

  useEffect(
    () => () => {
      kit.depth.dispose();
      kit.hBlur.dispose();
      kit.vBlur.dispose();
      kit.planeGeo.dispose();
      for (const l of kit.layers) {
        l.rt.dispose();
        l.blurRt.dispose();
        l.material.dispose();
      }
    },
    [kit],
  );

  const state = useRef({ sig: NaN, settle: 3 });
  useEffect(() => {
    state.current.settle = 3; // a new kit always renders
  }, [kit]);

  useFrame(() => {
    const g = root.current;
    if (g) renderSoftShadows(scene, gl, kit, g, state.current);
  });

  // same orientation as drei's ContactShadows: group turned +90° about X, camera looking up
  return (
    <group ref={root}>
      {kit.layers.map((l, i) => (
        <group key={i} rotation-x={Math.PI / 2} position={[0, l.y, 0]}>
          <mesh geometry={kit.planeGeo} material={l.material} scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={i} raycast={() => null} />
          <primitive object={l.camera} />
        </group>
      ))}
    </group>
  );
}

// ------------------------------------------------------------------------------------------------
// post + stats
// ------------------------------------------------------------------------------------------------

function StageEffects({ quality, vignette = true }: { quality: StageQuality; vignette?: boolean }) {
  return (
    <EffectComposer multisampling={quality === "high" ? 4 : 0} enableNormalPass={false}>
      {/* threshold well above any lit surface: only the emissive LEDs bloom */}
      <Bloom mipmapBlur luminanceThreshold={4} luminanceSmoothing={0.2} intensity={0.5} radius={0.5} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      {vignette ? <Vignette offset={0.28} darkness={0.5} /> : <></>}
    </EffectComposer>
  );
}

/** Logs draw calls etc. every few seconds in dev, and exposes them on window.__apexRenderInfo. */
export function RendererStats({ log = process.env.NODE_ENV !== "production", every = 5000 }: { log?: boolean; every?: number }) {
  const get = useThree((s) => s.get);
  const last = useRef(0);
  useEffect(() => {
    const { gl, scene } = get();
    // count every pass of a frame (contact shadows, env, composer), reset once per frame below
    gl.info.autoReset = false;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __apexDebug?: unknown }).__apexDebug = { gl, scene, THREE };
    return () => {
      gl.info.autoReset = true;
    };
  }, [get]);
  useFrame(({ gl }) => {
    const info = gl.info;
    const snap: RenderStats = {
      calls: info.render.calls,
      triangles: info.render.triangles,
      lines: info.render.lines,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
    };
    window.__apexRenderInfo = snap;
    info.reset();
    const now = performance.now();
    if (log && now - last.current > every && snap.calls > 0) {
      last.current = now;
      console.info(
        `[robot] draw calls ${snap.calls} · triangles ${snap.triangles.toLocaleString()} · lines ${snap.lines} · geometries ${snap.geometries} · textures ${snap.textures} · programs ${snap.programs}`,
      );
    }
  }, -1000);
  return null;
}

/** Stage's own quality when it is not inside a RobotCanvas (e.g. under the site's SceneShell). */
function AutoQuality({ children }: { children: (q: StageQuality) => ReactNode }) {
  const [q, setQ] = useState<StageQuality>("high");
  return (
    <>
      <PerformanceMonitor flipflops={3} onDecline={() => setQ("low")} onIncline={() => setQ("high")} onFallback={() => setQ("low")} />
      {children(q)}
    </>
  );
}

export type StageProps = {
  look?: RobotLook;
  tone?: RobotTone;
  /** Background colour (defaults per look × tone). Pass null for a transparent canvas background. */
  background?: string | null;
  shadows?: boolean;
  /** Subtle post: bloom on LEDs + vignette + MSAA (adds a few full-screen passes). */
  effects?: boolean;
  floor?: boolean;
  /** Grid on the floor (on by default in the blueprint look; 24 mm cells = goBILDA pitch). */
  grid?: boolean;
  /** Contact-shadow footprint in metres. */
  shadowScale?: number;
  lightIntensity?: number;
  /** Log/expose renderer stats (default: development builds only). */
  stats?: boolean;
  /** [near, far] metres for background-coloured fog (hides the floor's horizon); null = off. */
  fog?: [number, number] | null;
  /**
   * Shadow quality. Default: the enclosing RobotCanvas's level, else "auto" (Stage runs its own
   * PerformanceMonitor). "low" = 512 px shadows and no tight contact layer.
   */
  quality?: StageQuality | "auto";
  children?: ReactNode;
};

export function Stage({ quality: qualityProp, ...props }: StageProps) {
  const fromCanvas = useContext(QualityContext);
  const gl = useThree((s) => s.gl);
  useEffect(() => configureRenderer(gl), [gl]);
  if (qualityProp === "high" || qualityProp === "low") return <StageInner {...props} quality={qualityProp} />;
  if (fromCanvas) return <StageInner {...props} quality={fromCanvas} />;
  return <AutoQuality>{(q) => <StageInner {...props} quality={q} />}</AutoQuality>;
}

function StageInner({
  look = "studio",
  tone = "dark",
  background,
  shadows = true,
  effects = false,
  floor = true,
  grid,
  shadowScale = 1.5,
  lightIntensity = 1,
  stats = process.env.NODE_ENV !== "production",
  fog = [2.6, 7.5],
  quality,
  children,
}: Omit<StageProps, "quality"> & { quality: StageQuality }) {
  const bg = background === undefined ? stageBackground(look, tone) : background;
  const showGrid = grid ?? look === "blueprint";
  const light = tone === "light";
  const fogNear = fog?.[0];
  const fogFar = fog?.[1];
  return (
    <>
      {bg ? <color attach="background" args={[bg]} /> : null}
      {/* distance fog in the background colour: far geometry melts into the backdrop */}
      {bg && fogNear !== undefined && fogFar !== undefined ? <fog attach="fog" args={[bg, fogNear, fogFar]} /> : null}
      <StageLights look={look} tone={tone} intensity={lightIntensity} />
      {floor && look !== "blueprint" ? <StudioFloor glow={light ? -0.045 : 0.055} /> : null}
      {shadows && look !== "blueprint" ? <SoftShadows scale={shadowScale} light={light} quality={quality} /> : null}
      {showGrid ? (
        <Grid
          position={[0, 0.0003, 0]}
          args={[8, 8]}
          cellSize={0.024}
          cellThickness={0.55}
          cellColor={light ? "#D3D0C6" : "#1f1f1d"}
          sectionSize={0.24}
          sectionThickness={1}
          sectionColor={light ? "#b6b2a6" : "#34342f"}
          fadeDistance={5}
          fadeStrength={1.6}
          infiniteGrid
        />
      ) : null}
      {effects ? <StageEffects quality={quality} /> : null}
      {stats ? <RendererStats /> : null}
      {children}
    </>
  );
}
