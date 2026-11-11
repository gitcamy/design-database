# ascii-model-hover-cards

A row of square cards on a near-black page. Behind each card's text, a 3D
object is rendered live as monospace ASCII in one flat tint, oversized and
cropped by the card edges. Hovering a card lightens its surface, starts the
object turning (with a slow bob and tilt), and turns the bracketed CTA into a
solid accent button. On leave, the object eases back to its rest pose and the
render loop stops. The text, card size and glyph tint never change.

React + three.js. Derived from a screen recording via the `visual-to-prompt`
skill. Only the ASCII rendering and hover mechanic come from the reference.
The brand, the question copy and the 3D models do not.

## Usage

```jsx
import AsciiModelHoverCards from "./AsciiModelHoverCards";

const cards = [
  { tag: "Lab ✦ Awards", kicker: "Who takes the", headline: "Top Prize?", subline: "Megamind Labs 2027",
    cta: "Make your call", href: "/awards", model: "trophy", tint: "#C9C02E" },
  { tag: "Markets ✦ Signals", kicker: "Will the index hit", headline: "10K", subline: "Before summer?",
    cta: "Get the app", href: "/app", model: "coins", tint: "#4CC94A" },
  { tag: "Research ✦ Models", kicker: "What ships in", headline: "2027", subline: "Q3 roadmap?",
    cta: "Test your read", href: "/roadmap", model: "knot", tint: "#8A3DBE" },
];

<AsciiModelHoverCards title="Open questions" cards={cards} />
```

Next.js App Router: add `"use client"` as the first line.

**Keep `cards` stable.** Define it at module scope or wrap it in `useMemo`. Each
card's three.js scene is rebuilt whenever its card object changes identity.

Fonts are not bundled. The defaults expect **Archivo** (variable, with the
`wdth` axis, for the extra-wide display face) and **JetBrains Mono**. Load
them, or pass your own stacks via `displayFont` and `monoFont`.

## Demo

```bash
python3 -m http.server 8783
```

Open `http://localhost:8783/components/ascii-model-hover-cards/demo.html`.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | node | none | Section heading above the row |
| `cards` | `Card[]` | `[]` | See below |
| `columns` | number | `3` | Collapses to 1 column under 760px |
| `gap` | number | `14` | px between cards |
| `cellSize` | number | `6` | Glyph cell width in px; height is 1.65× this. Smaller is finer and more expensive |
| `ramp` | string | `" .,:;-_+*=!\|0123456789$#@"` | Dark to bright. First character is the empty cell |
| `spin` | number | `1.6` | Hover rotation speed, radians per second |
| `bg` | color | `#0B0B0B` | Resting card surface |
| `hoverBg` | color | `#252029` | Hovered card surface |
| `border` | color | `#2A2A2A` | 1px card border |
| `accent` | color | `#A12CF2` | Filled CTA on hover, and the focus ring |
| `displayFont` | CSS font stack | Archivo | Kicker, headline, section title (rendered at `font-stretch: 125%`) |
| `monoFont` | CSS font stack | JetBrains Mono | Tag, subline, CTA and the ASCII glyphs |
| `className`, `style` | | | On the outer `<section>` |

### Card

| Field | Type | Notes |
|---|---|---|
| `tag` | string | Outlined pill at the top |
| `kicker` | string | Small bold line above the headline |
| `headline` | node | Huge extra-wide display line, 1 to 2 lines |
| `subline` | string | Thin mono line under the headline |
| `cta` | string | Bracketed at rest, filled on hover |
| `href` | string | Makes the card an `<a>`. Without it the card is a focusable `<div>` |
| `tint` | color | Glyph color for this card's object. **Required** |
| `model` | `"trophy" \| "coins" \| "knot" \| (THREE) => Object3D \| Promise<Object3D>` | Built-in preset or your own builder. Defaults to `knot` |
| `scale` | number | Model scale. Default `1.25`. Oversize it so it crops at the edges |
| `offset` | `[x, y]` | Model offset in scene units |
| `restRotation` | number | Y rotation at rest, radians. Default `-0.5` |
| `restTilt` | number | X rotation at rest, radians. Default `0.12` |
| `animate` | `(pivot, t, h) => void` | Optional extra per-frame motion. `h` is hover progress, 0 to 1 |
| `key` | string | React key, if indexes are not stable |

Use any model by returning it from `model`. Materials only need to be lit:
luminance is all that is read. To load a GLB:

```js
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const model = () => new GLTFLoader().loadAsync("/models/athlete.glb").then((g) => g.scene);
```

Normalize the model to about 2 units tall and centred on the origin, or tune
`scale` and `offset`.

## How it works

- **One shared WebGL renderer.** All cards render their scenes, in turn, into
  a render target exactly the size of their glyph grid (for example, 66 × 40
  pixels for a 400px card). One pixel equals one cell.
- **Readback to glyphs.** `readRenderTargetPixels` returns the grid's RGBA.
  Luminance (`0.2126 R + 0.7152 G + 0.0722 B`, gamma 0.75) indexes the ramp, and
  each glyph is drawn with `fillText` in the card's tint on a 2D canvas behind
  the text. Cells under 3.5% luminance stay empty, so the silhouette is made
  only of characters.
- **The camera aspect matches the grid's pixel aspect** (`cols·cellW / rows·cellH`),
  so tall cells do not stretch the object.
- **Hover is an eased scalar `h`** (time constant ~170ms). While hovered, Y rotation
  advances at `spin · h` and X tilt and Y bob oscillate with amplitude scaled by `h`.
  On leave, rotation eases back along the shortest angle to `restRotation`.
- **Render on demand.** Each card runs its own rAF only while animating, and
  stops once it is settled at rest. Resting cards cost nothing.
- **The surface and CTA are CSS**: a 250ms `background-color` transition, plus
  bracket pseudo-elements that fade as the accent fill appears. The hand
  glyph swaps from ☞ to ☝.
- **Focus counts as hover**, so keyboard and touch users get the same state.
  With `prefers-reduced-motion`, the object stays still while the surface and CTA still change.

## Caveats

- A WebGL context is required. Without one, the cards render text only.
- The reference may have turned the object toward the cursor rather than
  playing a fixed motion; that could not be told from the frames. This build
  plays a fixed motion. Add cursor tracking via `animate` if you want it.
- Cost scales with `cols × rows × cards` per animating frame. At the default
  cell size, three 400px cards are about 8k `fillText` calls per frame at most,
  and only the hovered card animates.
