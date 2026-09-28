# cast-iron-medallion-tilt

A 3D medallion in dark sandblasted cast iron: an open ring with a thick
extruded mark floating inside it, held in a three-quarter pose on a
near-black background. It tilts toward the pointer on a critically damped
spring, so it eases in and settles without overshoot, and drifts slightly
when idle. The lights stay fixed while the object turns, so highlights slide
across the grain. Faces pointed at the camera stay near black. The texture
reads only where light rakes across an edge or a side wall.

A Three.js module (material, geometry, lights, tilt controller) plus a
no-build demo and a prompt template for image, video and code models.

Derived from a screen recording via the `visual-to-prompt` skill. The
material, pose, lighting and motion come from that reference. The mark
(an "ML" monogram) and everything else do not.

## Files

| File | Purpose |
|---|---|
| `castIronMedallion.js` | ES module: `createCastIronMaterial`, `createGrainMaps`, `createMonogramShapes`, `createMedallion`, `addMedallionLights`, `createTiltController`. |
| `demo.html` | No-build preview. Three.js from jsDelivr via an import map. |
| `README.md` | This file, including the reusable prompt template. |

## Usage

```js
import * as THREE from "three";
import {
  createCastIronMaterial, createMedallion, addMedallionLights, createTiltController,
} from "./castIronMedallion.js";

renderer.toneMapping = THREE.NeutralToneMapping;
scene.background = new THREE.Color("#272727");

addMedallionLights(scene, renderer);
const medallion = createMedallion({ material: createCastIronMaterial() });
scene.add(medallion);
const tilt = createTiltController(medallion);   // wraps it in tilt.group

renderer.setAnimationLoop(() => {
  tilt.update(clock.getDelta());
  renderer.render(scene, camera);
});
```

Your own mark: pass any array of `THREE.Shape`, for example from
`SVGLoader.createShapes`. The shapes are centred and scaled to `markScale`
of the ring's diameter.

```js
const shapes = new SVGLoader().parse(svgText).paths.flatMap(SVGLoader.createShapes);
createMedallion({ mark: { shapes, scale: 1 / svgWidth } });
```

SVG y points down; flip with `geometry.scale(1, -1, 1)` or negate y in the
shapes if the mark comes out upside down.

## Demo

Serve this folder and open `demo.html`:

```bash
python3 -m http.server 8774
```

Move the pointer across the window. To try another rest pose, add it to the
URL as `demo.html#yaw,pitch,roll`, in degrees (default `#-45,-30,0`).

## API

### `createCastIronMaterial(opts)`

`MeshStandardMaterial` with a procedural tiled normal map and roughness map
made from the same grain.

| Option | Default | Notes |
|---|---|---|
| `color` | `"#8C8C8C"` | For a metal this is its reflectance, not the face colour. Faces read near black because of the dim environment |
| `metalness` | `0.9` | |
| `roughness` | `0.45` | Multiplied by the roughness map, which varies around it |
| `grainScale` | `16` | Texture repeats per unit. Higher is finer grain |
| `normalStrength` | `1.4` | Depth of the grain |
| `sparkle` | `true` | Glint layer on top of the lighting. False gives a plain `MeshStandardMaterial` |
| `sparkleDensity` | `14` | Facets per grain tile, per axis. About 1.5px each at 800px wide |
| `sparkleCoverage` | `0.45` | Share of facets that can glint at all |
| `sparkleSpread` | `0.9` | How far each facet's tilt wanders from the surface normal. Higher spreads glints over more of the surface |
| `sparkleSharpness` | `110` | Specular exponent. Higher is smaller, harder glints |
| `sparkleIntensity` | `7` | |
| `sparkleFacing` | `0.25` | Glint strength on camera-facing faces, relative to grazing edges (1) |
| `sparkleColor` | `"#FFFFFF"` | |

Sparkle values are live uniforms: `material.userData.sparkle.spIntensity.value = 4`.

### `createMedallion(opts)`

Returns a `THREE.Group`. Ring radius is 1.

| Option | Default | Notes |
|---|---|---|
| `material` | `createCastIronMaterial()` | Shared by ring and mark |
| `mark` | `createMonogramShapes()` | `{ shapes, scale }` or a bare `Shape[]` |
| `markScale` | `0.5` | Mark width as a share of the ring diameter |
| `bandWidth` | `0.05` | Radial width (2.5% of diameter) |
| `bandDepth` | `0.08` | Ring depth (4% of diameter) |
| `markDepth` | `0.12` | Extrusion depth of the mark, about its stroke width |
| `bevel` | `0.012` | Small rounded bevel so every edge catches a line of light |

### `addMedallionLights(scene, renderer, opts)`

A hard key from the upper right, a faint fill from the left, and a dim
`RoomEnvironment` so metal facing the camera sits just above the background.
Options: `key` (9), `fill` (0.4), `environment` (0.14, which sets
`scene.environmentIntensity`). Passing no renderer skips the environment.

### `createTiltController(object, opts)`

Returns `{ group, update(dt), dispose() }`. Position the medallion by moving
`group`.

| Option | Default | Notes |
|---|---|---|
| `rest` | `{ yaw: -45, pitch: -30, roll: 0 }` | Degrees. Yaw and pitch together lean the ellipse; roll also tilts the mark |
| `maxTilt` | `12` | Degrees of yaw at the pointer's horizontal edge; pitch gets half |
| `smoothTime` | `0.25` | Seconds. Spring settle time is about 3× this |
| `idleAmplitude` | `1.5` | Degrees |
| `idlePeriod` | `6` | Seconds |
| `target` | `window` | Element whose pointer area drives the tilt |

## How it works

1. **The grain lives in one height field.** Four octaves of tileable value
   noise are turned into a normal map and a roughness map, so every bump and
   every rough spot line up. That is what makes the grain sparkle rather
   than look like a flat overlay.
2. **The faces are dark because of the environment, not the albedo.** Rough
   metal reflects its surroundings, and the surroundings here are a very dim
   room. Faces toward the camera therefore show little, while a hard key
   light raking from the upper right lights the side walls, the top-right
   arc, and the grain's upward bumps.
3. **Glints are facets, not texture.** Standard rough-metal shading
   averages the grain into a soft sheen, so the sparkle is added on top. The
   surface is divided into tiny cells in texture space. Each cell gets a
   hashed random tilt, and a hashed on/off so only some can glint. It flashes
   with a very tight specular lobe when its tilted normal lines up with the
   key light and the eye. It is weighted toward grazing angles, and only on
   the side of the object facing the key. Facets are fixed to the surface,
   so they twinkle on and off as the object turns. It is injected into
   `MeshStandardMaterial` with `onBeforeCompile` and uses the first
   directional light in the scene.
4. **One grain size everywhere.** The mark is extruded at its own size and
   then scaled, so its UVs are scaled by the same factor. Otherwise the grain
   and glints on the mark come out finer than on the ring.
5. **Yaw plus pitch, not roll.** A disc turned about a diagonal axis gives
   the leaning ellipse from the reference with the mark still upright.
   Rolling in the screen plane tilts the mark too.
6. **A critically damped spring.** Each axis uses a SmoothDamp-style
   integrator toward `rest + pointer × maxTilt + idle`. It never overshoots,
   matching the reference's 0.8s swing and 0.4 to 0.6s return.
7. **Lights never rotate.** Only the object turns, so highlights travel
   across the surface, which is most of what makes the motion read as
   heavy metal.
8. `prefers-reduced-motion` holds the rest pose with no drift or tilt.

## Caveats

- Glints are about 1.5px and can shimmer on low-DPI screens while moving.
  Lower `sparkleDensity` for bigger, steadier glints. A path-traced render
  (the Cycles route in the template below) is still smoother for stills and
  video.
- The glints follow the first `DirectionalLight` added to the scene. Add the
  key light first if you build your own lights.
- Rest-pose angles and the cursor trigger are inferred from the recording.
  The cursor was out of frame during the swings, so the source may have been
  driven by scroll.
- The default monogram is a placeholder built from straight strokes.

## Reusable prompt template

```
Create a hero 3D object using the technique and style below.

SUBJECT
An open ring with [MARK, default: the Megamind Labs "ML" monogram in bold geometric strokes]
floating inside it, extruded as a solid slab. Brand: [BRAND, default: Megamind Labs]. No disc
face: the background shows through the ring.

TECHNIQUE
Ring: flat band, rectangular cross-section, radial width 2.5% of diameter, depth 4% of
diameter, so the inner wall reads as a thin strip when tilted.
Mark: spans [MARK SCALE, default 50%] of ring diameter, centred in the ring's plane and not
touching it. Stroke width about 6% of diameter, extrusion depth equal to stroke width, square
ends, small rounded bevel (0.6% of diameter) so every edge catches a line of light. Ring and mark
carry the same grain size.
Material: dark sandblasted cast iron. Metalness 1, roughness 0.55, fine granular normal map
(grain about 0.15% of frame width) plus matching roughness noise. The grain must appear as
sparkle only on grazing-lit edges; faces pointed at the camera stay near black.
Sparkle: pinpoint white glints about 1.5px across, from microscopic facets tilted at random,
fixed to the surface so they twinkle as it turns. Dense along lit edges, bevels and side
walls, sparse on camera-facing faces, none on the side away from the key light.
Lighting: one hard key light upper right, raking the top-right arc and the upper faces of the
extrusions; a very faint fill from the left; a very dim neutral environment. No visible
reflections of a scene.

PALETTE
Background: [BG HEX, default #272727], flat.
Metal faces: #242424 to #3E3E3E; grain #1D1E1D to #646464; edge sparkle up to
[SPARKLE HEX, default #D0D0D0].
Monochrome. No colour tint, no polish, no rust, no glow, no floor, no cast shadow, no vignette.

INTERACTION
Trigger: [TRIGGER, default: cursor position over the viewport].
Rest pose: turned about a diagonal axis (about 45° yaw and 30° pitch) so the ring reads as an
ellipse whose long axis leans toward the upper right, with the mark upright and its right and
bottom side walls visible.
The object tilts toward the pointer by up to [MAX TILT, default 12°] yaw and half that in pitch.
Spring lag: reaches the target in about 0.8s, returns in about 0.4 to 0.6s, no visible overshoot
(critically damped).
Idle: slow drift of ±1.5° over about 6s when there is no input.
CHANGES: rotation only.
FIXED: position, scale, geometry, material, light direction (lights do not rotate with the
object, so highlights slide across the grain as it turns).
Resting state: the three-quarter pose above, drifting.

FRAMING
Aspect [RATIO, default 1.14:1], ring centre slightly right of frame centre, camera close so the
ring overflows the frame top and bottom, 35mm-equivalent perspective. No UI chrome, no sound.
Mood: heavy, industrial, quiet.

OUTPUT
[Pick one and delete the other:]
A) Render or video: [DURATION, default 8s] seamless loop at 60fps. Hold the rest pose, one
   12° yaw swing and return around 3.5s, a smaller 6° swing around 6s. Path-traced (Cycles or
   similar), no motion blur, no depth of field.
B) Code: Three.js. Ring as an ExtrudeGeometry of an annulus, mark as an extruded SVG path.
   MeshStandardMaterial with a procedural normal map and roughness map from one shared noise
   height field, plus an onBeforeCompile glint pass: hashed per-cell facet normals with a
   tight specular lobe against the key light, weighted toward grazing angles. One DirectionalLight key, a faint fill, and a dim RoomEnvironment at low
   environmentIntensity. Pointer position feeds target yaw and pitch, damped each frame with a
   critically damped spring (smoothTime about 0.25). Props: mark, markScale, bg, metal colour,
   roughness, grainScale, maxTilt, restRotation, idleAmplitude.
```

Keep TECHNIQUE and the FIXED line as written. The effect relies on near-black
faces with grain showing only in raking light, and on lights that stay put as
the object turns. Delete whichever OUTPUT option you are not using.
