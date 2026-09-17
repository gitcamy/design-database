# ascii-footer

A React footer that renders a phrase (default: the Megamind Labs wordmark)
as a fixed grid of monospaced glyphs on a `<canvas>`. Letterforms are
readable only through character density. The cursor acts as a soft point
light: cells inside `radius` snap to the darkest glyph, cells beyond fade
toward the faint end of the ramp. Nothing moves; only the character in
each cell changes.

## Usage

```jsx
import AsciiFooter from "./AsciiFooter";

<AsciiFooter />

<AsciiFooter
  phrase="Megamind Labs"
  ramp=" .:;i/|+*#"
  radius={120}
  bg="#F2F1EC"
  ink="#6B7A6E"
  cellWidth={5}
  cellHeight={8}
/>
```

## Demo

`demo.html` inlines the component and loads React and Babel from a CDN.
Serve the folder with any static server and open the page:

```bash
python3 -m http.server 8766
```

Query params `?cw=` and `?ch=` override the cell size for quick comparison.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `phrase` | string | `"Megamind Labs"` | Text to render |
| `ramp` | string | `" .:;i/|+*#"` | Glyphs, lightest to darkest |
| `radius` | number | `120` | px. Cells inside snap to the darkest glyph |
| `falloff` | number | `radius * 1.5` | px. Distance over which light decays beyond the radius |
| `bg` | string | `"#F2F1EC"` | Background colour |
| `ink` | string | `"#6B7A6E"` | Glyph colour, single colour only |
| `cellWidth` | number | `5` | px |
| `cellHeight` | number | `8` | px |
| `aspect` | number | `3` | Width / height of the footer |
| `margin` | number | `0.08` | Fraction of width kept clear on each side |
| `restLevel` | number | `0.38` | Light level with no pointer (0..1) |
| `minLevel` | number | `0.12` | Light level infinitely far from the pointer (0..1) |
| `fontFamily` | string | Helvetica Neue stack | Font used for the source drawing |
| `fontWeight` | number | `700` | Weight used for the source drawing |
| `accents` | function or null | `megamindAccents` | Draws pixel-step accents on the source canvas. Pass `null` to disable |
| `className`, `style` | | | Passed to the wrapper `<div>` |

## How it works

1. The phrase is drawn black on white to an offscreen canvas at 2x and the
   luminance is averaged per cell into a density array. Cached until resize
   or a prop change.
2. Each frame, `index = round(density * (n - 1) + shift)` picks a glyph from
   a pre-rendered atlas. `shift` is the radial light term: positive inside
   the radius (gated by density so halos stay faint and counters do not fill
   in), negative far away so extremities dissolve.
3. Redraws are coalesced to one `requestAnimationFrame` per pointer event,
   with no easing.

## Notes

- Legibility scales with footer width: the font size is bounded by width in
  a 3:1 frame. Below roughly 900px the wordmark reads as texture.
- The source font is Helvetica Neue bold. The pixel-step accents are an
  approximation of the wordmark's glitches, not a trace of the artwork.
