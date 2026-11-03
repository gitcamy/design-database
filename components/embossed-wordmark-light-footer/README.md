# embossed-wordmark-light-footer

A footer whose only large element is a wordmark stacked on three lines
(mega / mind / labs by default). The letters are recessed into a pale grey,
grained plate: each face is slightly darker than the plate, with a soft inner
shadow on its top and left edges and a thin white lip around its outer edge.
Moving the pointer over the band lights the letter faces with a soft glow,
near white at the core, pale cyan in the middle, periwinkle at the rim. The
glow is masked to the letters, so it never touches the plate and stops cleanly
at each letter's edge. Nothing moves. Only the colour of the glyph faces changes.

React, inline SVG, no dependencies. Derived from a screen recording via the
`visual-to-prompt` skill. The recess, the glow and the palette come from that
reference. The brand, copy, button and badge do not, and the letterforms here
are authored fresh (a stroke-built geometric face, see below).

## Files

| File | Purpose |
|---|---|
| `EmbossedWordmarkLightFooter.jsx` | The component. Copy anywhere in a React project. |
| `demo.html` | No-build preview. Transpiles the component in the browser. |
| `README.md` | This file, including the reusable prompt template. |

## Usage

```jsx
import EmbossedWordmarkLightFooter from "./EmbossedWordmarkLightFooter";

<EmbossedWordmarkLightFooter />

<EmbossedWordmarkLightFooter
  lines={["mega", "mind", "labs"]}
  links={["X", "LinkedIn", "Support"]}
  legal="© Megamind Labs 2026"
  radius={0.85}
/>
```

Next.js App Router: add `"use client"` as the first line.

## Demo

```bash
python3 -m http.server 8790
```

Then open `demo.html`.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `lines` | string[] | `["mega","mind","labs"]` | One entry per row. Lowercase letters, see Glyphs |
| `links` | string[] | 4 utility labels | Top right, condensed uppercase |
| `legal` | string | `"© Megamind Labs 2026"` | Bottom right |
| `plate` | color | `#BCBEC1` | Band colour |
| `face` | color | `#A4A7A9` | Resting letter face |
| `core`, `mid`, `rim` | color | `#EFF1F1`, `#D4F2F3`, `#9FB0E8` | Glow stops, centre to edge |
| `text` | color | `#6C6F74` | Links and legal line |
| `radius` | number | `0.85` | Glow radius in x-heights |
| `fade` | number | `0.6` | Seconds to fade out when the pointer leaves |
| `wordmarkWidth` | number | `72` | % of band width taken by the widest line |
| `leading` | number | `205` | Baseline to baseline, in glyph units (x-height is 100) |
| `tracking` | number | `16` | Gap between letters, glyph units |
| `justify` | boolean | `false` | Spread each row to the widest row's width |
| `breakpoint` | number | `700` | px. Below this the wordmark fills the width and the utility text stacks |
| `glyphs` | object | none | Extra or replacement glyphs, merged over the built-ins |
| `label` | string | `"Megamind Labs"` | Accessible name for the wordmark |
| `className`, `style` | | | Passed to the `<footer>` |

## How it works

1. **The glow is clipped to a glyph mask.** The glyphs are stroked paths held
   in one `<defs>` group. The same group is used three times: once as the
   resting faces, once as an SVG `<mask>`, and (through the filter) as the
   source for the recess. A rect filled with a radial gradient is drawn
   through the mask, so the light can only appear on letter faces. The mask
   strokes are 4 units wider than the faces, which is what lets a lit edge
   pick up a slightly brighter lip.
2. **The recess is one SVG filter.** It builds a blurred white lip offset
   down and right behind the glyph, keeps the face, and lays a dark inner
   shadow (inverted alpha, offset, blurred, clipped to the glyph) on top.
3. **Pointer tracking is imperative.** `pointermove` rewrites the gradient's
   centre attributes directly, with no React re-render. Leaving sets the
   glow group's opacity to 0 over `fade` seconds.
4. **Grain sits over everything.** A tiled `feTurbulence` image multiplied
   over the plate, the letters and the glow, so the light is grainy too.
5. **Sizes use container query units**, so the utility text and padding
   scale with the band, not the viewport.

## Glyphs

The built-in face is a geometric monoline built from circles and straight
stems at stroke 24, x-height 100, ascender 50 above that. It covers
`a b c d e g h i l m n o p r s t u`. For other letters, pass `glyphs`:

```jsx
glyphs={{ k: { w: 100, d: 0, p: "M12 -50V100M88 0L12 60M40 40L88 100" } }}
```

`w` is the advance width, `d` the descender depth below the baseline, `p`
an SVG path of stroke centrelines (the stroke width is applied for you).
Characters with no glyph are skipped.

## Caveats

- The rows are ragged right by default: `i` and `l` are 24 wide and `m` is
  160, so the three words are not the same width. `justify` evens them by
  widening the gaps, which looks loose on the `i` and `l`.
- Stacked three high, the band is taller than it is wide at the default
  settings (about 1.2 times the viewport width in height at 72%). Lower
  `wordmarkWidth` for a shorter band.
- The glow radius, the periwinkle rim and the 0.6s fade were estimated from
  the frames, not measured.
- Pointer only. On touch the glow follows the finger while it is down.
- The links are `href="#"` placeholders.

## Reusable prompt template

```
Create a footer band using the technique and style below.

SUBJECT
A closing footer whose main element is the wordmark "[BRAND, default: megamind labs]"
stacked as [LINES, default: mega / mind / labs], in [TYPEFACE, default: a heavy geometric
monoline sans with perfectly circular bowls, flat-cut terminals and a single-storey g].
Lines are left-aligned, with the widest line at [WORDMARK WIDTH, default 72]% of the band
width and leading of [LEADING, default 12]% of cap height. Top right: [LINKS, default: X,
LinkedIn, Support, hello@megamindlabs.com]. Bottom right: "[LEGAL, default: © Megamind
Labs 2026]".

TECHNIQUE
The wordmark reads as pressed into the plate. Each glyph face is a recess about 12% darker
than the plate, with a soft inner shadow on its top and left edges and a thin white lip on
its outer edge. The plate carries fine monochrome film grain and very faint horizontal
brushed streaks, with a hard lighter lip along the top edge of the band.
Build the glyphs as a single mask. The cursor light is a radial gradient clipped to that
mask, so it can only ever appear on letter faces and stops cleanly at their edges.

PALETTE
Plate: [PLATE HEX, default #BCBEC1]
Letter face, resting: [FACE HEX, default #A4A7A9]
Glow core: [CORE HEX, default #EFF1F1]
Glow mid: [MID HEX, default #D4F2F3]
Glow rim: [RIM HEX, default #9FB0E8]
Utility text: [TEXT HEX, default #6C6F74]
No other colours. No coloured button, no badge, no photography.

INTERACTION
Trigger: pointer position over the band.
Radius: [RADIUS, default 0.85] x-heights, radial falloff core to mid to rim to nothing.
Fade-out when the pointer leaves: [FADE, default 0.6]s ease-out.
Moves: only the colour of the lit glyph faces, and the brightness of their outer lip.
Stays fixed: the layout, the plate, glyph size and position, the grain. No scaling, no
shifting, no glow on the plate, no text reflow.

FRAMING
Full bleed, height set by the wordmark, no browser chrome, no cursor drawn in the frame,
no sound. Mood: tactile, quiet, engineered.

OUTPUT
[Pick one and delete the other:]
A) Video: [DURATION, default 8]s screen recording at 60fps. A pointer sweeps slowly across
   the three lines, lighting each letter as it passes, then rests and the glow fades.
B) Code: a single React component, SVG paths as the glyph mask, an SVG filter for the
   recess, an SVG feTurbulence layer for the grain, and a pointer-driven radial gradient
   clipped to the glyph mask. Props: lines, links, legal, plate, face, core, mid, rim,
   text, radius, fade, wordmarkWidth, leading, tracking, justify, className, style.
```

Keep TECHNIQUE and the "glow clipped to the glyph mask" rule as written. If the
glow lands on the plate you get a generic spotlight instead of this effect.
Colours, radius, leading and the line split are safe to change.
