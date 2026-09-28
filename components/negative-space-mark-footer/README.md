# negative-space-mark-footer

A full-bleed footer band in exactly two flat colours, closing a page with an
oversized monogram built from separate tiles. The gutters between the tiles
are the subject: where they cross, the tiles turn large radii inward and the
space they leave opens into a four pointed star. Nothing draws that star. The
mark reads as a hole cut in the band rather than a shape placed on it.

Wordmark, mark and tagline share one optical centreline, spaced symmetrically
about the middle of the frame, with a utility row along the bottom.

React, inline SVG, no dependencies.

Derived from a screenshot via the `visual-to-prompt` skill. The construction
method, the proportions and the palette come from that reference; the
monogram geometry here is authored fresh, and the brand and copy are not from
the source.

## Files

| File | Purpose |
|---|---|
| `NegativeSpaceMarkFooter.jsx` | The component. Copy anywhere in a React project. |
| `demo.html` | No-build preview. Transpiles the component in the browser. |
| `README.md` | This file, including the reusable prompt template. |

## Usage

```jsx
import NegativeSpaceMarkFooter from "./NegativeSpaceMarkFooter";

<NegativeSpaceMarkFooter />

<NegativeSpaceMarkFooter
  brand="Megamind Labs"
  tagline="Make it obvious."
  ground="#1B3A2F"
  ink="#EFE7D2"
  links={["Privacy", "Terms", "Contact"]}
/>
```

To swap in your own monogram, pass `markPaths` (an array of SVG path strings)
and a matching `markViewBox`. The exported `tile()` and `dome()` helpers are
not exported by default; copy them out of the file if you want to author new
geometry with the same vocabulary.

## Demo

Serve this folder and open `demo.html`:

```bash
python3 -m http.server 8768
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `brand` | string | `"Megamind Labs"` | Wordmark, left of the mark |
| `tagline` | string | `"Make it obvious."` | Right of the mark. Short, with a closing period |
| `links` | string[] | 4 utility labels | Bottom left |
| `socials` | string[] | `["in", "X", "ig"]` | Rendered as ink discs with the label knocked out |
| `ground` | string | `"#A44604"` | Band colour. Also the colour of the gutters, which is the point |
| `ink` | string | `"#FDFBD2"` | Tiles and type |
| `markPaths` | string[] | 5 tiles | SVG path `d` strings |
| `markViewBox` | string | `"0 0 116 100"` | Must match `markPaths` |
| `markWidth` | number | `34` | % of band width, wide mode |
| `bandAspect` | number | `2.03` | Width / height, wide mode only |
| `axis` | number | `39` | % down the band where the lockup centreline sits |
| `flank` | number | `31` | % either side of centre for wordmark and tagline |
| `margin` | number | `5.5` | % inset for the utility row |
| `disc` | number | `3` | % of band width per social disc |
| `breakpoint` | number | `700` | px. Below this the band stacks |
| `wordmarkFont`, `bodyFont` | string | Georgia / Helvetica stacks | |
| `className`, `style` | | | Passed to the `<footer>` |

## How it works

1. **The negative shape is never drawn.** Five ink tiles sit on the ground
   with narrow gutters between them. Each of the four quadrant tiles turns a
   half-round radius toward the middle, and a dome closes the gap from below,
   so the leftover ground reads as a four pointed star with concave sides.
   Drawing that star as a path instead would produce the same silhouette but
   would break the moment you change the tile count or the gutter width.
2. **The gutters carry the design.** They are roughly a tenth of the mark's
   width. Narrower and the tiles fuse into a blob; wider and the tiles read
   as five unrelated shapes floating on a background, which is what the first
   two drafts of this component looked like.
3. **One optical centreline.** The wordmark, the mark and the tagline are all
   centred on `axis`, at `±flank` about the middle. That single shared axis is
   what makes three separate elements read as one lockup.
4. **Every size derives from the container width**, measured with a
   ResizeObserver and seeded from `getBoundingClientRect` so it also works in
   a hidden or backgrounded document. The band therefore holds its
   proportions at any width, with floors so the type stays readable.
5. **Below `breakpoint` it stacks.** A 2.03 band at phone width would be
   185px tall with 4px links, so the layout becomes a centred column. The
   mark, the two colours and the mechanic are unchanged.

## Caveats

- Two colours is a constraint, not a default. Adding a third for a hover or
  an accent breaks the look faster than any other change here.
- The lower two tiles are set wider apart than the upper pair, which makes
  the star slightly asymmetric top to bottom. That asymmetry is in the
  reference and is deliberate. Equalise them if you want a symmetric mark.
- `socials` renders text labels, not icons. Swap the span contents for SVG
  icons in a real build.
- The links are `href="#"` placeholders.
- No motion. The reference was a static screenshot, so nothing here animates.

## Reusable prompt template

For generating a variant from scratch rather than importing the component.

```
Create a full-bleed footer band using the technique and style below.

SUBJECT
A closing footer band containing an oversized centred monogram, the wordmark "[BRAND,
default: Megamind Labs]" at left in [WORDMARK TYPEFACE, default: a high-contrast display
serif, lowercase], the tagline "[TAGLINE, default: Make it obvious.]" at right in [TAGLINE
TYPEFACE, default: a bold grotesque, sentence case with a closing period], and a utility
row of [LINKS, default: Privacy Policy, Terms of Service, Cookie choices, Contact] with
[SOCIAL COUNT, default 3] circular icon buttons.

TECHNIQUE
Build the monogram as [TILES, default 5] flat tiles of the ink colour separated by wide
gutters of the GROUND colour. Every tile turns at least one large radius toward the middle.
Position the tiles so their gutters converge at the centre and read as a [NEGATIVE SHAPE,
default: four pointed star with concave sides] in negative space. Never draw that shape: it
exists only as the gaps. Gutters are roughly a tenth of the mark's width, wide enough that
the negative shape carries equal visual weight to the positive tiles. The mark must read as
a hole cut in the band, not as an object placed on it.
Set the wordmark, the mark and the tagline on ONE shared optical centreline, spaced
symmetrically at [FLANK, default 31]% of the frame width either side of centre. The shared
axis is what makes the three read as a single lockup rather than three placed items.

PALETTE
Ground: [GROUND HEX, default #A44604]
Ink: [INK HEX, default #FDFBD2]
Two colours only, everywhere in the band, including the icon buttons (ink disc, ground
glyph). No gradients, no drop shadows, no outlines, no third accent colour, no photography.

LAYOUT
Band height about [BAND, default 49]% of the frame width, hard horizontal top edge, no
rounding, full bleed to both sides.
Mark [MARK WIDTH, default 34]% of frame width, aspect [MARK ASPECT, default 1.16], centred
horizontally, its centre [AXIS, default 39]% down the band.
Side margins [MARGIN, default 5.5]% of frame width, matched left and right.
Utility links at the left margin along the bottom, icon buttons flush to the right margin
on the same baseline, each disc [DISC, default 3]% of frame width.
The lower third of the band stays open. Do not fill it.

INTERACTION
Not observed: the reference is a single static screenshot. Default to no motion and no
hover state. If a hover is wanted, change the ink and ground of a single element only, so
the two colour rule holds.

FRAMING
Aspect ratio [RATIO, default 2.03:1] for the band alone, no browser chrome, no sound.
Confident, editorial, graphic.

OUTPUT
[Pick one and delete the other:]
A) Static: a single flat image of the band at [WIDTH, default 2000]px wide.
B) Code: a single React component. Render the monogram as inline SVG on a viewBox matching
   MARK ASPECT, each tile a path built from line and arc segments, filled ink, on a parent
   filled ground, with no stroke anywhere. Position the three lockup elements on one axis
   at ±FLANK, then a bottom row for the utility links and icon buttons. Derive every size
   from the measured container width so the band holds its proportions, and stack to a
   centred column below 700px. Expose brand, tagline, links, ground, ink, mark paths, mark
   width, band aspect, axis, flank and margin as props.
```

Keep the TECHNIQUE block exactly as written. The two rules doing the work are
that the negative shape is never drawn and that the three lockup elements
share one axis. Bracket either and you get a generic logo-in-a-coloured-box
footer. Delete whichever OUTPUT option you are not using.
