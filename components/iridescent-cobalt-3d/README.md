# iridescent-cobalt-3d

A material, not a UI component: glossy, opaque, saturated cobalt plastic
under a thin-film iridescent coat. Surfaces facing the camera read as deep,
solid blue. Bevels, rims and surfaces turning away shift through cyan,
violet, magenta and pale yellow in bands that follow the curvature, with
lavender-white highlights. The shape doesn't matter, so the material goes on
any object with rounded edges.

This folder holds the reusable prompt (for image models and Blender) and a
Three.js implementation with a demo that applies the material to a star, a
spring and a torus knot.

Derived from a screenshot via the `visual-to-prompt` skill. The look, the
palette and the lighting setup come from that reference. The objects are
rebuilt from scratch.

## Files

| File | Purpose |
|---|---|
| `iridescentCobalt.js` | ES module: the material, the studio environment, a film thickness map, and star and spring geometry helpers. |
| `demo.html` | No-build demo (Three.js 0.169 from jsDelivr via an import map). Switch shapes, pick a base color, toggle the film and the motion, drag to orbit. |
| `README.md` | This file, including the reusable prompt template. |

## Usage (Three.js)

Needs `three` 0.163 or later, for `NeutralToneMapping`.

```js
import * as THREE from "three";
import {
  createIridescentMaterial,
  createStudioEnvironment,
  starGeometry,
  springMesh,
} from "./iridescentCobalt.js";

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.toneMapping = THREE.NeutralToneMapping; // ACES desaturates the blue

const scene = new THREE.Scene();
createStudioEnvironment(renderer, scene); // sets scene.environment

const material = createIridescentMaterial({ color: "#243DFB" });
scene.add(new THREE.Mesh(starGeometry(), material));
scene.add(springMesh(material));
scene.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.9, 0.3, 300, 48), material));
```

Any geometry works as long as it has rounded edges and UVs (UVs drive the
film bands). For extruded shapes, use `ExtrudeGeometry` with
`bevelSegments >= 8`. For wires, use `TubeGeometry`. Sharp edges and big flat
faces pointing at the camera show no rainbow.

Render the canvas with `alpha: true` over a CSS background. The white to
periwinkle backdrop and the soft shadow bloom in the demo are plain CSS, not
part of the scene.

## Demo

```bash
python3 -m http.server 8772
```

Then open `demo.html`. `window.material` is exposed for tuning from the
console.

## API

### `createIridescentMaterial(options)`

Returns a `MeshPhysicalMaterial`. Every option defaults to
`IRIDESCENT_COBALT_DEFAULTS`:

| Option | Default | Notes |
|---|---|---|
| `color` | `"#243DFB"` | Base color. Any saturated hue works; the demo shows green |
| `roughness` | `0.06` | |
| `metalness` | `0.05` | |
| `ior` | `2.2` | High on purpose: it raises the specular the film acts on |
| `clearcoat` | `0.25` | Kept low, because clearcoat reflections are white and cover the film |
| `clearcoatRoughness` | `0.03` | |
| `iridescence` | `1` | 0 turns the film off |
| `iridescenceIOR` | `1.8` | |
| `filmBands` | `true` | Attaches the banded thickness map. Off gives a uniform film, so only a hue shift with angle |
| `iridescenceThicknessRange` | `[150, 650]` | nm. Past about 700 the colors go pastel |
| `envMapIntensity` | `1` | |
| `transmission` | `0` | Any transmission lightens the body toward lavender |
| `thickness` | `0.6` | Only used with transmission |
| `dispersion` | `0` | Try `transmission: 0.1, dispersion: 3` for extra edge fringing |

### `createStudioEnvironment(renderer, scene, { intensity, surround })`

Builds a studio scene and prefilters it with PMREM, then sets
`scene.environment`. The studio is a mid-dark surround (`surround`, default
`#2b3152`) with five very bright white softboxes: a key at top-left front, a
tall strip at the right, two rim panels behind, and a low rim behind. There is
also a pale periwinkle floor bounce. Returns the environment texture.

### `createFilmThicknessMap(size = 256)`

A tiling `CanvasTexture` of soft diagonal bands with a slow wobble. It varies
the film thickness across the surface, which is what splits the sheen into
separate color bands.

### `starGeometry({ radius, pinch, depth, bevel, dish })`

A four-pointed star with concave sides and a deep rounded bevel. `dish` sinks
the front face, using a smoothed distance to the outline, so reflections
sweep across it. A perfectly flat face reads as one flat color.

### `springMesh(material, { coils, radius, height, tube })`

A helical tube with rounded end caps, returned as a `Group`. Its UVs run one
band cycle per coil.

## How it works

1. **The surround is dark on purpose.** In a light grey room (three's
   `RoomEnvironment`), broad grey reflections wash the body toward lavender.
   A mid-dark surround keeps the blue deep. A few very bright softboxes make
   the sharp highlights, and the rim panels behind the object light the
   grazing edges, which is where the film shows.
2. **The film needs varying thickness.** At a single thickness the film only
   shifts hue with viewing angle. The banded thickness map is what produces
   separate cyan, magenta and yellow bands.
3. **The film needs curvature.** The star's face is dished and every edge is
   bevelled, so reflections sweep across the surface instead of sitting still.
4. **Tone mapping matters.** `NeutralToneMapping` keeps the cobalt
   saturated. ACES pushes it toward purple and grey.
5. **Geometry detail.** The star's dished face is tessellated, which leaves
   T-junctions, so its normals are set analytically from the dish rather than
   averaged. Averaged normals zig-zag along the diagonals.

## Caveats

- `starGeometry` computes its dish on the CPU. It takes a few hundred
  milliseconds at the defaults, so build it once, not per frame.
- WebGL shows the film more faintly than an offline renderer. For hero stills,
  render in Blender (settings below) and use the Three.js version for live,
  interactive use.
- The film bands are baked into the UVs. On a geometry without UVs, the film
  falls back to a flat hue shift.

## Reusable prompt template

```
Render [OBJECT, default: a four-pointed star with concave sides and a dished front face] as a
3D object using the material and lighting below.

SUBJECT
[OBJECT], floating at a three-quarter angle, tilted [TILT, default: 25] degrees toward the
viewer. Every edge and corner is heavily rounded: a bevel about [BEVEL, default: 15]% of the
object's thickness, or a round tube profile for wire-like forms (springs, knots, letters).
The iridescence only shows on curvature, so no sharp edges and no large flat areas facing
the camera head-on.

TECHNIQUE (the material, keep verbatim)
Glossy, fully opaque plastic in a saturated base color, under a clear lacquer coat carrying a
thin-film iridescent layer (soap-bubble or oil-slick interference) whose thickness varies
across the surface in soft bands. Facing surfaces show the deep, solid base color. At grazing
angles (bevels, rims, surfaces turning away) the film shifts through cyan, violet, magenta
and pale yellow in narrow bands that follow the curvature. Specular highlights are sharp and
tinted slightly toward the base hue (lavender-white for blue), with faint rainbow fringing
along their edges. Not glass, not transparent, not chrome, no glitter, no holographic
texture map, no noise.

PALETTE
Base: [BASE HEX, default #243DFB], shadow side [SHADOW HEX, default #0B2CAB]
Highlights: [HIGHLIGHT HEX, default #EFEFFF], a near-white tinted toward the base
Iridescent bands: cyan, violet, magenta, pale yellow (fixed, from the film, not a choice)
Background: [BG TOP HEX, default #FFFFFF] fading to [BG BOTTOM HEX, default #CCD8FF]
Soft shadow: [SHADOW BLOOM HEX, default #CAD3F0]

LIGHTING
A studio with a mid-dark surround and a few very bright white softboxes: a large key at the
top-left front, a tall strip at the right, and wide rim panels behind the object. The rim
panels light the grazing edges, which is where the film shows. No broad grey fill, which
washes the base color toward lavender. The visible backdrop behind the object is separate:
seamless and light, with no floor and no horizon. A very soft, diffuse shadow blooms beneath
the object, with no hard contact shadow.

FRAMING
[RATIO, default 1:1], object large and slightly cropped by one frame edge, no text, no depth
of field. Clean product-render quality.

OUTPUT
[Pick one and delete the others:]
A) Image model: paste SUBJECT through FRAMING as one prompt.
B) Blender (4.2+), Principled BSDF: Base Color = BASE HEX, Metallic 0.05, Roughness 0.06,
   IOR 2.2, Coat Weight 0.25, Coat Roughness 0.03, Thin Film Thickness driven by a Noise or
   Wave texture mapped to 150 to 650 nm, Thin Film IOR 1.8. World: dark studio (#2b3152)
   with emissive white panels as described in LIGHTING, or a studio HDRI with its
   background darkened. Cycles, AgX. Bevel modifier (width ~15%, 6+ segments, Shade Smooth).
   Render with a transparent background and composite over the light backdrop.
C) Three.js: import createIridescentMaterial and createStudioEnvironment from
   design-database/components/iridescent-cobalt-3d, use NeutralToneMapping, and give the
   geometry rounded edges and UVs.
```

Keep TECHNIQUE and LIGHTING as written. The rainbow comes from a banded film
reflecting bright white softboxes at grazing angles. Sharp edges, flat faces,
a grey fill or a uniform film thickness each remove it. The base color can
change, as long as the highlights are tinted toward the new hue.
