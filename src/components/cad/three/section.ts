// SectionRig — SECTION A–A: a clipping plane through the robot plus a hatched cap on the cut faces,
// the way a drawing shows a section (ASME Y14.2 section lining: thin 45° lines).
//
// Clipping: every robot material (faces + edge lines) gets `clippingPlanes = [plane]` while the
// section is on (renderer.localClippingEnabled must be true).
// Cap: the classic stencil trick. For each closed mesh, its back faces increment and its front faces
// decrement the stencil (colour/depth writes off, depth test off). Where the plane cuts through a
// solid, a back face is left without its front face, so the count is non-zero there; the cap plane
// is drawn only where stencil ≠ 0. Needs a stencil buffer: <Canvas gl={{ stencil: true }}>.
// The helper meshes are added as CHILDREN of the robot's meshes, so they follow explode and turret
// motion for free; they share the robot's geometry (no copies) and are skipped by the Ghoster.

import * as THREE from "three";

const CAP_VERT = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Screen-space hatch so the line spacing stays constant on the "paper" at any zoom, like a drawing.
const CAP_FRAG = /* glsl */ `
uniform vec3 uFill;
uniform vec3 uInk;
uniform float uSpacing;
uniform float uWidth;
void main() {
  float t = (gl_FragCoord.x + gl_FragCoord.y) / uSpacing;
  float f = fract(t);
  float d = min(f, 1.0 - f) * uSpacing * 0.70710678;
  float line = 1.0 - smoothstep(uWidth * 0.5 - 0.55, uWidth * 0.5 + 0.55, d);
  gl_FragColor = vec4(mix(uFill, uInk, line * 0.86), 1.0);
}`;

/** sRGB hex → raw 0–1 triplet (the cap shader writes display values directly). */
function srgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export class SectionRig {
  /** World-space plane. Normal −X: everything with x > constant is removed (the robot's LEFT side,
   *  which faces the default isometric camera). */
  readonly plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10);
  readonly cap: THREE.Mesh;
  private readonly planes = [this.plane];
  private readonly back: THREE.MeshBasicMaterial;
  private readonly front: THREE.MeshBasicMaterial;
  private readonly capMat: THREE.ShaderMaterial;
  private helpers: THREE.Mesh[] = [];
  private mats = new Set<THREE.Material>();
  private on = false;

  constructor(pixelRatio = 1) {
    const stencilBase: THREE.MeshBasicMaterialParameters = {
      colorWrite: false,
      depthWrite: false,
      depthTest: false,
      stencilWrite: true,
      stencilFunc: THREE.AlwaysStencilFunc,
      clippingPlanes: this.planes,
    };
    this.back = new THREE.MeshBasicMaterial({
      ...stencilBase,
      side: THREE.BackSide,
      stencilFail: THREE.IncrementWrapStencilOp,
      stencilZFail: THREE.IncrementWrapStencilOp,
      stencilZPass: THREE.IncrementWrapStencilOp,
    });
    this.front = new THREE.MeshBasicMaterial({
      ...stencilBase,
      side: THREE.FrontSide,
      stencilFail: THREE.DecrementWrapStencilOp,
      stencilZFail: THREE.DecrementWrapStencilOp,
      stencilZPass: THREE.DecrementWrapStencilOp,
    });
    this.capMat = new THREE.ShaderMaterial({
      vertexShader: CAP_VERT,
      fragmentShader: CAP_FRAG,
      uniforms: {
        uFill: { value: srgb("#E3DFD4") },
        uInk: { value: srgb("#141413") },
        uSpacing: { value: 6 * Math.SQRT2 * pixelRatio },
        uWidth: { value: Math.max(1, pixelRatio) },
      },
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.ReplaceStencilOp,
      stencilZFail: THREE.ReplaceStencilOp,
      stencilZPass: THREE.ReplaceStencilOp,
      toneMapped: false,
    });
    this.cap = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), this.capMat);
    this.cap.rotation.y = -Math.PI / 2; // face along −X, like the plane
    this.cap.position.set(10, 0.3, 0);
    this.cap.renderOrder = 2;
    this.cap.visible = false;
    this.cap.userData.cadHelper = true;
    this.cap.raycast = () => {};
  }

  setPixelRatio(pr: number) {
    this.capMat.uniforms.uSpacing.value = 6 * Math.SQRT2 * pr;
    this.capMat.uniforms.uWidth.value = Math.max(1, pr);
  }

  /** Build the stencil helpers for every closed, opaque mesh under `root`. */
  attach(root: THREE.Object3D) {
    this.detach();
    const meshes: THREE.Mesh[] = [];
    root.traverse((o) => {
      if (o.userData?.cadHelper) return;
      const mesh = o as THREE.Mesh;
      const line = o as THREE.LineSegments;
      if (!mesh.isMesh && !line.isLineSegments) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) if (m) this.mats.add(m);
      // instanced parts are tiny hardware; transparent ones are clear polycarbonate shells
      if (mesh.isMesh && !(mesh as THREE.InstancedMesh).isInstancedMesh && !mats.some((m) => m?.transparent)) meshes.push(mesh);
    });
    for (const mesh of meshes) {
      for (const mat of [this.back, this.front]) {
        const h = new THREE.Mesh(mesh.geometry, mat);
        h.userData.cadHelper = true;
        h.renderOrder = 1;
        h.visible = this.on;
        h.frustumCulled = mesh.frustumCulled;
        h.raycast = () => {};
        h.layers.mask = mesh.layers.mask;
        mesh.add(h);
        this.helpers.push(h);
      }
    }
    this.applyClipping();
  }

  detach() {
    for (const h of this.helpers) h.removeFromParent();
    this.helpers = [];
    for (const m of this.mats) m.clippingPlanes = null;
    this.mats.clear();
  }

  private applyClipping() {
    for (const m of this.mats) m.clippingPlanes = this.on ? this.planes : null;
  }

  /** Re-collect materials (e.g. after the robot swapped some) without rebuilding helpers. */
  refreshMaterials(root: THREE.Object3D) {
    root.traverse((o) => {
      if (o.userData?.cadHelper) return;
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh && !(o as THREE.LineSegments).isLineSegments) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) if (m) this.mats.add(m);
    });
    this.applyClipping();
  }

  setEnabled(on: boolean) {
    if (on === this.on) return;
    this.on = on;
    for (const h of this.helpers) h.visible = on;
    this.cap.visible = on;
    this.applyClipping();
  }

  get enabled() {
    return this.on;
  }

  /** Plane position along world X (metres). */
  setX(x: number) {
    this.plane.constant = x;
    this.cap.position.x = x;
  }

  dispose() {
    this.detach();
    this.back.dispose();
    this.front.dispose();
    this.capMat.dispose();
    this.cap.geometry.dispose();
  }
}
