import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// A dark sandblasted cast-iron medallion: an open ring with an extruded mark
// floating inside it, tilted three-quarter, easing toward the pointer on a
// critically damped spring. Faces pointed at the camera stay near black; the
// grain only shows as sparkle where a raking key light grazes an edge. Lights
// stay fixed while the object turns, so highlights slide across the grain.

const DEG = Math.PI / 180;

export const CAST_IRON_DEFAULTS = {
  color: "#8C8C8C",
  metalness: 0.9,
  roughness: 0.45,
  grainScale: 16, // texture repeats per unit; higher is finer grain
  normalStrength: 1.4,
  // Glints: tiny facets fixed to the surface, each with its own random tilt.
  // A facet flashes when its tilt lines up with the key light and the eye.
  sparkle: true,
  sparkleDensity: 14, // facets per grain tile, per axis (~1.5px at 800px wide)
  sparkleCoverage: 0.45, // share of facets that can glint
  sparkleSpread: 0.9, // how far facet tilts wander from the surface normal
  sparkleSharpness: 110, // specular exponent; higher is smaller, harder glints
  sparkleIntensity: 7,
  sparkleFacing: 0.25, // glint strength on camera-facing faces vs grazing edges (1)
  sparkleColor: "#FFFFFF",
};

// Hash-based glints added after lighting, keyed to the first directional light
// in the scene (the key light from addMedallionLights).
const SPARKLE_HEAD = /* glsl */ `
uniform float spDensity, spCoverage, spSpread, spSharpness, spIntensity, spFacing;
uniform vec3 spColor;
float spHash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
`;
const SPARKLE_BODY = /* glsl */ `
#if NUM_DIR_LIGHTS > 0
{
  vec2 cell = floor(vNormalMapUv * spDensity);
  vec3 jitter = vec3(spHash(cell), spHash(cell + 17.1), spHash(cell + 41.7)) - 0.5;
  float on = step(1.0 - spCoverage, spHash(cell + 7.3));
  vec3 facet = normalize(normal + jitter * spSpread);
  vec3 L = directionalLights[0].direction;
  vec3 V = geometryViewDir;
  float glint = pow(max(dot(facet, normalize(L + V)), 0.0), spSharpness);
  float lit = smoothstep(0.0, 0.15, dot(nonPerturbedNormal, L));
  float edge = mix(spFacing, 1.0, pow(1.0 - clamp(dot(nonPerturbedNormal, V), 0.0, 1.0), 1.5));
  outgoingLight += spColor * glint * on * lit * edge * spIntensity;
}
#endif
`;

// Tileable value noise, several octaves, as a Float32 height field.
function heightField(size, seed = 7) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const h = new Float32Array(size * size);
  for (const [cell, amp] of [[4, 0.25], [16, 0.35], [64, 0.25], [size, 0.15]]) {
    const g = Array.from({ length: cell * cell }, rand);
    const at = (x, y) => g[((y % cell) + cell) % cell * cell + ((x % cell) + cell) % cell];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cell, fy = (y / size) * cell;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
        h[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
  }
  return h;
}

// Normal map and roughness map from the same grain, so bumps and sparkle agree.
export function createGrainMaps(size = 512, strength = CAST_IRON_DEFAULTS.normalStrength) {
  const h = heightField(size);
  const n = new Uint8Array(size * size * 4);
  const r = new Uint8Array(size * size * 4);
  const H = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength * 8;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength * 8;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      n[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      n[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      n[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      n[i + 3] = 255;
      const v = 150 + (H(x, y) - 0.5) * 160; // roughness wobbles around 0.55
      r[i] = r[i + 1] = r[i + 2] = Math.max(60, Math.min(230, v));
      r[i + 3] = 255;
    }
  }
  const mk = (data) => {
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.needsUpdate = true;
    return t;
  };
  return { normalMap: mk(n), roughnessMap: mk(r) };
}

export function createCastIronMaterial(opts = {}) {
  const o = { ...CAST_IRON_DEFAULTS, ...opts };
  const { normalMap, roughnessMap } = createGrainMaps(512, o.normalStrength);
  for (const t of [normalMap, roughnessMap]) t.repeat.set(o.grainScale, o.grainScale);
  const material = new THREE.MeshStandardMaterial({
    color: o.color,
    metalness: o.metalness,
    roughness: o.roughness,
    normalMap,
    roughnessMap,
    normalScale: new THREE.Vector2(1, 1),
  });
  if (!o.sparkle) return material;

  // Live uniforms: change material.userData.sparkle.<name>.value at runtime.
  const u = {
    spDensity: { value: o.sparkleDensity },
    spCoverage: { value: o.sparkleCoverage },
    spSpread: { value: o.sparkleSpread },
    spSharpness: { value: o.sparkleSharpness },
    spIntensity: { value: o.sparkleIntensity },
    spFacing: { value: o.sparkleFacing },
    spColor: { value: new THREE.Color(o.sparkleColor) },
  };
  material.userData.sparkle = u;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + SPARKLE_HEAD)
      .replace("#include <opaque_fragment>", SPARKLE_BODY + "\n#include <opaque_fragment>");
  };
  material.customProgramCacheKey = () => "cast-iron-sparkle";
  return material;
}

// Default mark: a geometric "ML" monogram from straight strokes, in a unit box
// centred on the origin. Any array of THREE.Shape works in its place.
export function createMonogramShapes(stroke = 0.24) {
  const poly = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const w = stroke;
  // M: two stems and a V, drawn as one outline. Spans x -1..0.12, y -0.5..0.5 before scaling.
  const M = poly([
    [-1, -0.5], [-1 + w, -0.5], [-1 + w, 0.18], [-0.44, -0.3], [0.12 - w, 0.18], [0.12 - w, -0.5],
    [0.12, -0.5], [0.12, 0.5], [0.12 - w * 0.9, 0.5], [-0.44, 0.02], [-1 + w * 0.9, 0.5], [-1, 0.5],
  ]);
  // L: a stem and a foot.
  const L = poly([
    [0.3, 0.5], [0.3 + w, 0.5], [0.3 + w, -0.5 + w], [0.9, -0.5 + w], [0.9, -0.5], [0.3, -0.5],
  ]);
  // The outline spans 1.9 units wide; scale brings it to a unit width.
  return { shapes: [M, L], scale: 1 / 1.9 };
}

// Ring (flat band, rectangular section) plus an extruded mark in its plane.
// Radius 1: band 2.5% of diameter wide, 4% deep; mark 50% of diameter.
export function createMedallion({
  material = createCastIronMaterial(),
  mark = createMonogramShapes(),
  markScale = 0.5,
  bandWidth = 0.05,
  bandDepth = 0.08,
  markDepth = 0.12,
  bevel = 0.012,
} = {}) {
  const group = new THREE.Group();

  const ring = new THREE.Shape().absarc(0, 0, 1, 0, Math.PI * 2);
  ring.holes.push(new THREE.Path().absarc(0, 0, 1 - bandWidth, 0, Math.PI * 2, true));
  const ringGeo = new THREE.ExtrudeGeometry(ring, {
    depth: bandDepth, curveSegments: 160, bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3,
  });
  ringGeo.translate(0, 0, -bandDepth / 2);
  group.add(new THREE.Mesh(ringGeo, material));

  const { shapes, offset = new THREE.Vector2(), scale = 1 } = Array.isArray(mark) ? { shapes: mark } : mark;
  const s = scale * markScale * 2;
  const markGeo = new THREE.ExtrudeGeometry(shapes, {
    depth: markDepth / s, bevelEnabled: true,
    bevelThickness: bevel / s, bevelSize: bevel / s, bevelSegments: 3,
  });
  markGeo.computeBoundingBox();
  const bb = markGeo.boundingBox;
  markGeo.translate(-(bb.min.x + bb.max.x) / 2 + offset.x, -(bb.min.y + bb.max.y) / 2 + offset.y, -(bb.min.z + bb.max.z) / 2);
  // Bake the scale into positions AND uvs. ExtrudeGeometry uvs are in shape
  // units, so scaling only the mesh would make the grain finer on the mark
  // than on the ring.
  markGeo.scale(s, s, s);
  const uv = markGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s);
  group.add(new THREE.Mesh(markGeo, material));

  return group;
}

// Fixed lights: hard key upper right and slightly behind, faint fill from the
// left, and a very dim neutral room so camera-facing metal reads just above the
// background instead of pure black. Pass the renderer to build the room.
export function addMedallionLights(scene, renderer, { key = 9, fill = 0.4, environment = 0.14 } = {}) {
  const k = new THREE.DirectionalLight("#ffffff", key);
  k.position.set(4, 3.5, 1.2);
  const f = new THREE.DirectionalLight("#ffffff", fill);
  f.position.set(-4, 0.5, 3);
  scene.add(k, f);
  if (renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = environment;
    pmrem.dispose();
  }
  return { key: k, fill: f };
}

// Critically damped spring toward a target (Unity-style SmoothDamp).
function smoothDamp(cur, target, vel, smoothTime, dt) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel.v + omega * change) * dt;
  vel.v = (vel.v - omega * temp) * exp;
  return target + (change + temp) * exp;
}

// Tilts the object toward the pointer around its rest pose. Yaw plus pitch
// (not roll) is what leans the ring's ellipse while the mark stays upright.
// The object is wrapped in a group (returned as `group`) for positioning and
// an optional screen-plane roll. Call update(dt) every frame.
export function createTiltController(object, {
  rest = { yaw: -45, pitch: -30, roll: 0 },
  maxTilt = 12,
  smoothTime = 0.25,
  idleAmplitude = 1.5,
  idlePeriod = 6,
  target = window,
} = {}) {
  const roll = new THREE.Group();
  roll.rotation.z = rest.roll * DEG;
  if (object.parent) object.parent.add(roll);
  roll.add(object);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointer = { x: 0, y: 0 };
  const vy = { v: 0 }, vx = { v: 0 };
  let yaw = rest.yaw * DEG, pitch = rest.pitch * DEG, t = 0;

  const onMove = (e) => {
    const r = target === window ? { left: 0, top: 0, width: innerWidth, height: innerHeight } : target.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  };
  const onLeave = () => { pointer.x = 0; pointer.y = 0; };
  target.addEventListener("pointermove", onMove, { passive: true });
  (target === window ? document : target).addEventListener("pointerleave", onLeave);

  function update(dt) {
    dt = Math.min(dt, 0.05);
    t += dt;
    const idle = reduce ? 0 : Math.sin((t / idlePeriod) * Math.PI * 2) * idleAmplitude;
    const k = reduce ? 0 : maxTilt;
    const ty = (rest.yaw + pointer.x * k + idle) * DEG;
    const tp = (rest.pitch + pointer.y * k * 0.5 + idle * 0.4) * DEG;
    yaw = smoothDamp(yaw, ty, vy, smoothTime, dt);
    pitch = smoothDamp(pitch, tp, vx, smoothTime, dt);
    object.rotation.set(pitch, yaw, 0, "YXZ");
  }
  update(0);

  function dispose() {
    target.removeEventListener("pointermove", onMove);
    (target === window ? document : target).removeEventListener("pointerleave", onLeave);
  }
  return { group: roll, update, dispose };
}
