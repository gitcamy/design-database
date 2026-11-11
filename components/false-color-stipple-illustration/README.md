# false-color-stipple-illustration

An illustration style, not a UI component: a photograph cut into about five
flat tones, each swapped for a fixed unnatural color (near-black shadows,
neon green foliage, cyan water, an ochre accent, warm paper highlights), with
all shading done by single-pixel colored grain. Where two tones meet they
don't blend through an in-between color. Specks of both tones mix over a
20 to 40px band, so every edge looks frayed. The result sits somewhere
between a thermal camera and a risograph print.

This folder holds a reusable prompt for image models and a WebGL React
component that applies the treatment to any photo.

Derived from a screenshot via the `visual-to-prompt` skill. The treatment and
palette come from that reference. The source's photograph, brand and page
were not carried over. The demo scene is drawn procedurally.

## Files

| File | Purpose |
|---|---|
| `FalseColorStipple.jsx` | React component: one `<canvas>`, one WebGL fragment shader, no dependencies. |
| `demo.html` | No-build demo on a procedural lake scene. Sliders for dither, grain size, hue jitter and shimmer, plus "Use your own photo". Add `#clean` to the URL to hide the panel. |
| `README.md` | This file, including the prompt template. |

## Usage

```jsx
import FalseColorStipple from "./FalseColorStipple";

<div style={{ height: "80vh" }}>
  <FalseColorStipple src="/images/valley.jpg" alt="Lake valley at dusk" />
</div>
```

The canvas fills its parent, so give the parent a size. The image is
cover-fitted. Cross-origin images need CORS headers, because WebGL can't
read tainted pixels. Next.js App Router needs `"use client"`.

Which photos work best: strong areas of shadow, a sunlit green or vegetated
area, one bright focal shape, and ideally some blue water or sky. A photo
with no greens comes out as paper and black with an ochre fringe.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `src` | string | | Image URL (or object URL / data URL). |
| `palette` | object | see below | Any subset of `paper`, `shadow`, `deep`, `bright`, `accent`, `water`. Missing keys fall back to the defaults. |
| `thresholds` | `[number, number, number]` | `[0.2, 0.4, 0.76]` | Brightness cuts: below the first is shadow, between first and second is deep green, then bright green, and above the third is paper. |
| `dither` | number | `0.12` | Noise added to brightness before the cut. Higher values mean more specks of neighbouring tones inside each area. |
| `feather` | number | `16` | Radius in CSS px for the random neighbour sample. Sets how wide the frayed band at each edge is. |
| `grain` | number | `1` | Speck size in CSS px. |
| `hueJitter` | number | `8` | Random hue rotation per speck, ± degrees. |
| `streak` | number | `6` | Over water, noise is held across this many specks horizontally, which reads as ripples. |
| `speckle` | number | `0.04` | Fraction of shadow pixels lifted to grey specks. |
| `waterBias` | number | `0.04` | How much bluer than red and green a pixel must be to count as water. |
| `warmBias` | number | `0.06` | How close red must come to green (and how far above blue) for a midtone to count as warm and take the accent. |
| `grainFps` | number | `0` | Rerolls the grain this many times per second for a live shimmer. `0` freezes it. |
| `seed` | number | `1` | Grain seed. |
| `alt` | string | `""` | Used as `aria-label`; the canvas has `role="img"`. |
| `className`, `style` | | | Applied to the canvas. |

Default palette, measured from the reference:

| Key | Hex | Role |
|---|---|---|
| `paper` | `#EEEAE7` | Highlights and sky |
| `shadow` | `#24261E` | Everything dark |
| `deep` | `#12AD49` | Darker midtones (dense foliage) |
| `bright` | `#19D57B` | Lighter midtones (meadow) |
| `accent` | `#D9B03A` | Warm midtones (estimated, it's mixed into the green in the reference) |
| `water` | `#32ADC4` | Blue midtones |

## How it works

All of it happens in one fragment shader, drawn once per prop change.

- **Jittered sampling instead of blur.** Each pixel samples the image at a
  random offset within `feather` px, with offsets clustered near the centre.
  On either side of an edge, pixels pick from both regions, so the boundary
  becomes a band of mixed specks of the two real tones. Blurring the
  brightness instead would create in-between tones and give every edge a
  green halo.
- **Tones come from brightness plus a little color.** Triangular noise of
  ± `dither` is added to brightness, which is then cut at `thresholds`. In
  the midtones, a blue pixel takes `water`, a warm one takes `accent`, and the
  rest take `deep` or `bright`. Because only these six colors are possible,
  the result is flat with no gradients.
- **Per-speck variation.** Each speck gets its own random hue rotation (a
  rotation around the grey axis) and a ±6% brightness offset, and
  some shadow specks are lifted to grey. That gives each flat area the
  shimmering, slightly multi-colored grain the reference has.
- **Water streaks.** For water pixels the noise cell is stretched
  horizontally by `streak`, so reflections break into short ripple lines.

## Reusable prompt

> An editorial landscape illustration: a quiet lake in a mountain valley,
> with dense conifer trees on a sunlit slope on the left, steep forested hills
> in deep shadow on the right, and one small white sailboat on the water, with
> its reflection broken up by small horizontal ripples. Pale, overcast sky in
> the V between the hills.
>
> Render it as a false-color stippled photograph, not a painting. Cut the
> image down to about five flat tones. Shadows become one flat near-black
> (#24261E). Sunlit plants become saturated neon greens (#12AD49 in the tree
> crowns, #19D57B in the meadow). A thin yellow-orange band (#D9B03A) runs
> where the light meets the shadow. Water becomes cyan (#32ADC4). Highlights
> and sky become warm off-white (#EEEAE7). No smooth gradients. Each area of
> tone is flat, and all the shading comes from grain density.
>
> Cover the whole image in grain the size of one pixel. Inside an area of
> tone, each speck varies slightly in hue (green specks drift toward cyan and
> yellow, black specks pick up about 4% grey). Where two tones meet, the specks
> mix together over a band about 20 to 40px wide, so edges look feathered and
> slightly frayed, never sharp. Tree silhouettes and ridge lines stay readable
> through those frayed edges. On the water, the grain gets stretched into
> short horizontal streaks.
>
> Full-bleed 16:10 frame. No vignette, no blur, no glow, no outlines, no paper
> texture, no text. The mood is calm, synthetic and slightly uncanny.

### Template

```
Create a full-bleed [WHAT, default: hero illustration] in the false-color stipple style below.

SUBJECT
Render [IMAGE SUBJECT, default: a quiet lake valley with conifers on a sunlit slope, shadowed
forested hills, one small white sailboat and its broken reflection] as if it were a real
photograph run through the treatment below. Composition must contain one strong bright
focal shape, large areas of deep shadow, and a sunlit vegetated area. No text in the image.

TECHNIQUE
Cut the image down to about five flat tones and map each one to a fixed false color:
shadow -> SHADOW, lit vegetation -> two neon greens (darker in dense masses, brighter in open
areas), a thin warm band where light meets shadow -> ACCENT, water or reflective surfaces ->
WATER, highlights and sky -> PAPER. Each area of tone is flat. All the shading comes from
grain density, never from smooth gradients.
Cover the whole image in grain the size of one pixel. Inside an area of tone, each speck
varies slightly in hue: greens drift toward cyan and yellow, the shadow tone picks up about
4% lighter grey specks. Where two tones meet, specks mix together over a 20 to 40px band,
so every edge is feathered and slightly frayed, never crisp. Silhouettes (tree crowns,
ridge lines, the focal object) stay readable through those frayed edges. On water, stretch
the grain into short horizontal streaks.

PALETTE
Paper / highlights: [PAPER HEX, default #EEEAE7]
Shadow: [SHADOW HEX, default #24261E]
Neon green deep: [GREEN DEEP HEX, default #12AD49]
Neon green bright: [GREEN BRIGHT HEX, default #19D57B]
Light/shadow band: [ACCENT HEX, default #D9B03A]
Water: [WATER HEX, default #32ADC4]
No other colors. No natural color, no smooth gradients, no glow, no bloom, no vignette, no
blur, no outlines, no paper texture.

INTERACTION
Trigger: none. Static image.
Resting state: [RESTING, default "fully rendered, grain frozen"].
(Optional, code only: reroll the grain seed at [GRAIN FPS, default 0, meaning frozen] for a
subtle live shimmer. Tones, positions and composition never change.)

FRAMING
Aspect ratio [RATIO, default 16:10], full bleed with no border, horizon low enough that
shadowed hills fill most of the frame. Flat, no UI chrome.
Calm, synthetic, slightly uncanny.

OUTPUT
[Pick one and delete the other:]
A) Image: [SIZE, default 2560x1600], one still. Grain must be visible at 100% zoom.
B) Code: use FalseColorStipple.jsx from this folder, or rebuild it as a WebGL fragment
   shader: sample each pixel at a random offset within [FEATHER, default 16px], add
   ±[DITHER, default 0.12] triangular noise to brightness, cut into bands, pick
   water/accent/green by a blue or warm mask, then add per-speck hue jitter of ±8°.
```

Keep TECHNIQUE word for word: the five flat tones, the single-pixel colored
grain and the frayed 20 to 40px edges are the whole look. Subject and colors
are safe to change, as long as the hierarchy stays the same (dark shadow,
neon midtones, pale paper). Otherwise it stops reading as false color.
