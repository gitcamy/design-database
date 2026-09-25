import * as THREE from "three";
import { TessellateModifier } from "three/addons/modifiers/TessellateModifier.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Glossy opaque plastic under a clear coat with a thin-film iridescent layer.
// Facing surfaces read as the solid base color; grazing angles shift through
// cyan, violet, magenta and pale yellow. The film only shows on curvature, in
// the reflections of very bright white softboxes, so pair this with
// createStudioEnvironment and geometry that has rounded edges.

export const IRIDESCENT_COBALT_DEFAULTS = {
  color: "#243DFB",
  roughness: 0.06,
  metalness: 0.05,
  // A high base IOR raises the specular the film acts on. Clearcoat stays
  // light, because its reflections are white and would cover the film.
  ior: 2.2,
  clearcoat: 0.25,
  clearcoatRoughness: 0.03,
  iridescence: 1,
  iridescenceIOR: 1.8,
  // The film thickness varies across the surface through a soft banded map,
  // which is what splits the sheen into cyan, magenta and yellow bands. With
  // filmBands off, three.js uses the top of the range everywhere and you only
  // get a hue shift with angle.
  filmBands: true,
  iridescenceThicknessRange: [150, 650],
  envMapIntensity: 1,
  // Off by default: any transmission lightens the body toward lavender.
  // Raise transmission to ~0.1 with dispersion ~3 for extra edge fringing.
  transmission: 0,
  thickness: 0.6,
  dispersion: 0,
};

// Soft diagonal bands plus a slow wobble, in the green channel (the one
// three.js reads for thickness). Tiles seamlessly.
export function createFilmThicknessMap(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  const TAU = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const w = 0.12 * Math.sin(TAU * v) + 0.08 * Math.sin(TAU * 2 * u);
      const t = 0.5 + 0.5 * Math.sin(TAU * (u + v + w));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(t * 255);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export function createIridescentMaterial(options = {}) {
  const o = { ...IRIDESCENT_COBALT_DEFAULTS, ...options };
  return new THREE.MeshPhysicalMaterial({
    iridescenceThicknessMap: o.filmBands ? createFilmThicknessMap() : null,
    color: new THREE.Color(o.color),
    roughness: o.roughness,
    metalness: o.metalness,
    ior: o.ior,
    clearcoat: o.clearcoat,
    clearcoatRoughness: o.clearcoatRoughness,
    iridescence: o.iridescence,
    iridescenceIOR: o.iridescenceIOR,
    iridescenceThicknessRange: o.iridescenceThicknessRange,
    envMapIntensity: o.envMapIntensity,
    transmission: o.transmission,
    thickness: o.thickness,
    dispersion: o.dispersion,
  });
}

// The studio the material is lit by. A mid-dark surround keeps the body a
// deep, saturated blue (a light grey room washes it toward lavender), and a
// few very bright white softboxes give the sharp highlights the thin film
// colors. The rim strips behind the object are what light the grazing edges,
// which is where the rainbow shows. Returns the prefiltered texture; it is
// also set as scene.environment.
export function createStudioEnvironment(renderer, scene, { intensity = 1, surround = "#2b3152" } = {}) {
  const studio = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 16),
    new THREE.MeshBasicMaterial({ color: surround, side: THREE.BackSide })
  );
  studio.add(room);

  const box = (w, h, pos, strength, color = "#ffffff") => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength * intensity), side: THREE.DoubleSide })
    );
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    studio.add(m);
  };
  box(9, 6, new THREE.Vector3(-6, 8, 6), 6); // key, top-left front
  box(4, 16, new THREE.Vector3(9, 1, 2), 6); // tall strip, right
  box(22, 6, new THREE.Vector3(1, 4, -9), 8); // rim, behind
  box(6, 16, new THREE.Vector3(-9, -1, -5), 6); // rim, behind-left
  box(16, 4, new THREE.Vector3(2, -5, -8), 5); // low rim, behind
  box(24, 10, new THREE.Vector3(0, -9, 2), 1.4, "#CCD8FF"); // floor bounce, periwinkle

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(studio, 0.02).texture;
  pmrem.dispose();
  studio.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  scene.environment = env;
  return env;
}

// Four-pointed star with concave sides, extruded with a deep rounded bevel.
// The front face is tessellated and dished so reflections sweep across it;
// a perfectly flat face reads as one flat color.
export function starGeometry({ radius = 1, pinch = 0.22, depth = 0.32, bevel = 0.16, dish = 0.1 } = {}) {
  const shape = new THREE.Shape();
  const pts = [0, 1, 2, 3].map((i) => {
    const a = Math.PI / 2 - (i * Math.PI) / 2;
    return new THREE.Vector2(Math.cos(a) * radius, Math.sin(a) * radius);
  });
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 2 - (i * Math.PI) / 2 - Math.PI / 4;
    const c = new THREE.Vector2(Math.cos(a) * radius * pinch, Math.sin(a) * radius * pinch);
    const next = pts[(i + 1) % 4];
    shape.quadraticCurveTo(c.x, c.y, next.x, next.y);
  }
  let geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments: 64,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 12,
  });

  if (dish > 0) {
    geo.deleteAttribute("uv");
    geo = new TessellateModifier(radius * 0.025, 10).modify(geo);
    // The front cap is the original outline at z = depth + bevel. Sink each
    // cap vertex by its distance from that outline, easing to zero at the
    // edge so the cap still meets the bevel cleanly.
    const outline = shape.getSpacedPoints(400);
    const frontZ = depth + bevel;
    const falloff = radius * 0.45;
    // Soft distance to the outline (a log-sum-exp smooth minimum), so the
    // ridge where two sides meet is rounded instead of a sharp crease.
    const k = radius * 0.05;
    const sink = (x, y) => {
      let dMin = Infinity;
      const ds = outline.map((p) => {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < dMin) dMin = d;
        return d;
      });
      let sum = 0;
      for (const d of ds) sum += Math.exp(-(d - dMin) / k);
      const soft = Math.max(0, dMin - k * Math.log(sum));
      const t = Math.min(soft / falloff, 1);
      return dish * t * t * (3 - 2 * t);
    };
    let pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      if (Math.abs(pos.getZ(v) - frontZ) > 1e-5) continue;
      pos.setZ(v, frontZ - sink(pos.getX(v), pos.getY(v)));
    }
    geo.deleteAttribute("normal");
    geo = mergeVertices(geo, 1e-4);
    geo.computeVertexNormals();

    // The tessellation leaves T-junctions, so averaged normals zig-zag across
    // the face. The dish is a height field, so set its normals from the
    // gradient instead.
    pos = geo.attributes.position;
    const nrm = geo.attributes.normal;
    const e = radius * 0.004;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      if (nrm.getZ(v) < 0.3 || Math.abs(z - (frontZ - sink(x, y))) > 1e-5) continue;
      const dx = (sink(x + e, y) - sink(x - e, y)) / (2 * e);
      const dy = (sink(x, y + e) - sink(x, y - e)) / (2 * e);
      const n = new THREE.Vector3(dx, dy, 1).normalize();
      nrm.setXYZ(v, n.x, n.y, n.z);
    }
  }
  geo.center();
  if (!geo.attributes.normal) geo.computeVertexNormals();
  // Planar UVs across the face, so the film bands sweep diagonally over it.
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let v = 0; v < p.count; v++) {
    uv[v * 2] = p.getX(v) / (radius * 4) + 0.5;
    uv[v * 2 + 1] = p.getY(v) / (radius * 4) + 0.5 + p.getZ(v) * 0.2;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

// Helical spring as a round tube with rounded end caps. Returns a Group
// because the caps are separate meshes.
export function springMesh(material, { coils = 4.5, radius = 0.55, height = 2.2, tube = 0.14 } = {}) {
  class Helix extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * coils * Math.PI * 2;
      return target.set(Math.cos(a) * radius, t * height - height / 2, Math.sin(a) * radius);
    }
  }
  const curve = new Helix();
  const group = new THREE.Group();
  const body = new THREE.TubeGeometry(curve, 600, tube, 40, false);
  // One band cycle per coil rather than one over the whole length.
  const uv = body.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * coils);
  group.add(new THREE.Mesh(body, material));
  const capGeo = new THREE.SphereGeometry(tube, 40, 20);
  for (const t of [0, 1]) {
    const cap = new THREE.Mesh(capGeo, material);
    cap.position.copy(curve.getPoint(t));
    group.add(cap);
  }
  return group;
}
