# mosaic-hero-open

A hero that opens by expanding a small pill into a full bleed card, with the
background image rendered as a tile mosaic on a grid fixed in screen space,
so the picture appears to resolve as the card grows. The mosaic is permanent
and never becomes a clean photograph. Once the card lands, the wordmark,
headline, paragraph and CTA enter in a short stagger and the image runs a
slow continuous zoom.

React, canvas, no dependencies.

Derived from a screen recording via the `visual-to-prompt` skill. The
mechanic, the measured timings and the palette come from that reference;
the brand, copy and imagery do not.

## Files

| File | Purpose |
|---|---|
| `MosaicHeroOpen.jsx` | The component. Copy anywhere in a React project. |
| `demo.html` | No-build preview. Transpiles the component in the browser. |
| `README.md` | This file, including the reusable prompt template. |

## Usage

```jsx
import MosaicHeroOpen from "./MosaicHeroOpen";

<MosaicHeroOpen />

<MosaicHeroOpen
  brand="Megamind Labs"
  headline={["Design that opens", "on arrival."]}
  paragraph="A short supporting line that runs to about three lines at desktop width."
  cta="Start a project"
  image="/hero.jpg"
  cell={19}
  openDuration={1.3}
/>
```

With no `image`, the component paints a procedural stand-in (a dark field, a
curved limb, one warm glow) so it runs with no asset. Pass a real photograph
for production. A same-origin image, or one served with CORS, is required
because the mosaic reads pixels back off a canvas.

## Demo

Serve this folder and open `demo.html`:

```bash
python3 -m http.server 8768
```

Buttons replay the open and cycle the cell size. `?cell=` sets the starting
cell size.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `brand` | string | `"Megamind Labs"` | Wordmark, top left |
| `mark` | string | `"•"` | Glyph before the wordmark |
| `headline` | string[] | `["Design that opens", "on arrival."]` | One clipped reveal per entry. Two lines suits the layout |
| `paragraph` | string | placeholder | Bottom left, about three lines at desktop width |
| `cta` | string | `"Start a project"` | Pill button, bottom right |
| `image` | string or null | `null` | Image URL. Null paints the procedural stand-in |
| `cell` | number | `19` | px. Tile size, fixed in screen space. This is the effect |
| `seedWidth` | number | `170` | px. Starting pill width |
| `seedHeight` | number | `90` | px. Starting pill height |
| `openDuration` | number | `1.3` | seconds |
| `radius` | number | `20` | px. Final corner radius |
| `inset` | number | `8` | px. Final gap between card and frame |
| `bg` | string | `"#FFFFFF"` | Page behind the card |
| `card` | string | `"#0A0B0A"` | Card fill before the image resolves |
| `ink` | string | `"#FDFDFC"` | Type and CTA fill |
| `warm` | string | `"#836659"` | Warm accent, procedural stand-in only |
| `cool` | string | `"#5D6B7A"` | Cool accent, procedural stand-in only |
| `zoomRate` | number | `0.027` | Scale added per second after the open |
| `zoomMax` | number | `1.3` | Zoom ceiling |
| `height` | string | `"100vh"` | Height of the wrapper |
| `autoPlay` | boolean | `true` | False renders the settled state with no animation |
| `className`, `style` | | | Passed to the wrapper |

## How it works

1. **The grid is sized in screen space, not image space.** Each frame,
   `cols = ceil(cardWidth / cell)` and `rows = ceil(cardHeight / cell)`. The
   source is drawn into an offscreen canvas of exactly `cols x rows` so the
   browser averages each cell for free, then `getImageData` gives one color
   per cell, painted as a square of `cell - 1` px to leave a seam. Because
   the cell size never changes, growing the card adds cells rather than
   enlarging them, and the image appears to resolve as it opens. Making the
   grid a fixed number of cells instead would simply scale a pixelated image
   up, which looks nothing like this.
2. **The open curve is `progress ^ 0.6`**, fitted to the reference: fast off
   the mark, long settle. Measured against the source at 0.077, 0.31, 0.62
   and 0.92 of the open, where the card had covered 20%, 51%, 79% and 97% of
   its distance. Width, height and corner radius all interpolate on it, the
   radius from a full pill to `radius`.
3. **The headline reveals line by line.** Each line sits in an
   `overflow: hidden` box and translates from `105%` to `0`, so mid reveal
   the letters are cut cleanly along a horizontal edge. This is the sharpest
   moment in the sequence. A fade in its place loses it.
4. **The zoom continues after the layout settles**, adding `zoomRate` per
   second up to `zoomMax`, applied to the source rectangle rather than to
   the canvas, so the mosaic grid stays locked while the picture moves
   underneath it.

## Caveats

- The mosaic redraws every frame, which is fine at a cell size of 19px (about
  2000 cells at 1024x768) but gets expensive below roughly 8px on a large
  viewport. The per-frame offscreen canvas could be hoisted if you need it.
- `getImageData` taints on a cross-origin image without CORS headers and will
  throw. Serve the image same-origin or set `Access-Control-Allow-Origin`.
- `autoPlay` reads the settled state immediately, which is what you want for
  a page that has already been visited. There is no `prefers-reduced-motion`
  handling built in; wire `autoPlay={!prefersReducedMotion}` if you need it.
- The headline is sized with `clamp(40px, 6.6vw, 96px)`. Three or more lines
  will crowd the paragraph at short viewport heights.
- The bottom row wraps below roughly 600px, putting the CTA under the
  paragraph and right aligned. Verified at 375px and 1024px.

## Reusable prompt template

For generating a variant from scratch rather than importing the component.

```
Create a hero section opening animation using the technique and style below.

SUBJECT
A full bleed hero card containing [IMAGE SUBJECT, default: a dark aerial or orbital scene
with one warm light source near a curved horizon], overlaid with the wordmark "[BRAND,
default: Megamind Labs]" top left preceded by [MARK, default: a small filled dot], a two
line headline "[HEADLINE, default: "Design that opens" / "on arrival."]" set in [TYPEFACE
STYLE, default: a tight neo-grotesque, medium weight, about -2% tracking], a three line
supporting paragraph bottom left, and a pill CTA reading "[CTA, default: Start a project]"
bottom right.
The image must be rendered as a tile mosaic, not placed as a clean photograph.

TECHNIQUE
Render the image as flat square tiles on a grid that is fixed in SCREEN space at [CELL,
default 19]px, not fixed in image space. Sample one average color per cell. Leave a 1px
seam between cells so the result reads as tiling rather than as low resolution. Because
the cell size is constant while the container grows, the expansion reveals more cells and
the picture resolves as it opens. The mosaic is permanent: it must never dissolve into a
smooth photograph at any point, including the final resting state.

PALETTE
Page background: [BG HEX, default #FFFFFF]
Card and sky: [CARD HEX, default #0A0B0A]
Warm accent: [WARM HEX, default #836659]
Cool accent: [COOL HEX, default #5D6B7A]
Type and CTA fill: [INK HEX, default #FDFDFC]
No glow, no drop shadow, no blur, no gradient overlay, no color shift over time. All
contrast comes from the image itself.

MOTION
Trigger: page load, plays once, no scroll and no cursor input.
0.0s   A single solid pill of CARD HEX, about [SEED, default 170 x 90]px, centered in the
       viewport, fully rounded, no image content visible.
0.0 to [OPEN, default 1.3]s   The pill scales outward from its own center on both axes
       following progress^0.6: fast off the mark, long settle, having covered about 20% of
       its distance at 8% of the duration, 51% at 31%, 79% at 62% and 97% at 92%. Corner
       radius interpolates from fully rounded to [RADIUS, default 20]px. It ends inset
       [INSET, default 8]px from the viewport edges.
+0.0 to 0.2s   Wordmark fades in top left.
+0.2 to 0.6s   Headline reveals ONE LINE AT A TIME, 200ms apart. Each line sits in its own
       clipping box and slides up from below, so mid reveal the letters are cut cleanly
       along a horizontal edge with only their tops showing. Do not fade the lines in; the
       cut edge is the point.
+0.3 to 0.8s   Paragraph and CTA fade in and rise 8px, staggered.
After settling   The image runs a slow continuous zoom, about 0.027 of scale per second up
       to 1.3, applied to the image beneath the grid so the tiles stay locked. Nothing else
       moves.
FIXED: the tile grid never changes size, the layout never shifts after settling, the mosaic
never resolves.

FRAMING
Aspect ratio [RATIO, default 1.84:1], card centered, content padded about 35px inside the
card, no browser chrome, no sound.
Editorial, technical, restrained.

OUTPUT
[Pick one and delete the other:]
A) Video: [DURATION, default 4]s, no loop, no camera move other than the slow zoom
   described above, no cursor visible.
B) Code: a single React component on a <canvas>. Size the cell grid in device pixels and
   recompute it on every resize so cell size stays constant on screen while the container
   animates. Animate width, height and border radius on one curve. Split the headline into
   lines, wrap each in an overflow-hidden span, translate each inner span from 105% to 0 on
   a stagger. Expose brand, headline, paragraph, CTA, image, cell, open duration, inset,
   radius and the palette hexes as props.
```

Keep the TECHNIQUE block and the line reveal wording in MOTION exactly as
written. The fixed screen-space cell size is what makes the image appear to
resolve as the card grows, and describing the headline as a fade instead of
a clipped slide loses the sharpest moment. Delete whichever OUTPUT option you
are not using.
