# lens-part-cta-reveal

A closing call-to-action section that is revealed by two oversized soft lobes
parting like an opening lens as the section scrolls in. One lobe hangs from
above and one rises from below. At first their curved edges meet in the middle
and hide the content. As the section reaches the top of the viewport, they move
apart. The headline, paragraph and CTA are clipped by the lobe edges as they
emerge, and they brighten from 10% to full opacity. Everything stays in one hue
family. The lobes read as depth only through a bright rim along each curved
edge and a faint shade cast into the gap.

Scroll-scrubbed and reversible. React, no dependencies.

Derived from a screen recording via the `visual-to-prompt` skill. The
mechanic, timings and palette come from that reference. The brand and copy
do not.

## Files

| File | Purpose |
|---|---|
| `LensPartReveal.jsx` | The component. Copy anywhere in a React project. |
| `demo.html` | No-build preview with a stand-in section above it. Transpiles the component in the browser. |
| `README.md` | This file, including the reusable prompt template. |

## Usage

```jsx
import LensPartReveal from "./LensPartReveal";

<LensPartReveal />

<LensPartReveal
  headline={<>Build faster <em>systems</em>.<br />Ship sharper <em>ideas</em>.</>}
  body="Book a 15-minute call and see how Megamind Labs takes your product from first sketch to shipped."
  ctaLabel="Book a Call"
  ctaHref="/contact"
/>

// Other hue family: keep all five tones in the same family
<LensPartReveal bg="#8FB39A" deep="#7FA58B" side="#B3CDBA" lobe="#A9C6B1" rim="#C6DCCB"
  shade="rgba(40, 90, 60, 0.22)" />
```

Next.js App Router: add `"use client"` as the first line.

The headline font defaults to Newsreader with Georgia as a fallback. Load
Newsreader (regular and italic) yourself, or pass `serif`.

## Demo

Serve this folder and open `demo.html`:

```bash
python3 -m http.server 8773
```

Scroll down slowly into the violet block, then back up. The button cycles
three palettes.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `headline` | ReactNode | two lines, last word of each in `<em>` | Wrap words in `<em>` for the italic accent. Keep it at two lines |
| `body` | string or null | placeholder | Two lines at desktop width, 72% opacity |
| `ctaLabel` | string or null | `"Book a Call"` | Null hides the button |
| `ctaHref` | string | `"#"` | |
| `onCta` | function | | Click handler |
| `bg` | string | `"#9793FE"` | Gap colour |
| `deep` | string | `"#8984FE"` | Centre of the radial background |
| `side` | string | `"#B8B4FE"` | Far left and right of the background |
| `lobe` | string | `"#AFA9FF"` | Lobe fill |
| `rim` | string | `"#C2BFFF"` | Highlight along each lobe's curved edge |
| `shade` | string | `"rgba(72, 62, 214, 0.22)"` | Soft shadow each lobe casts into the gap |
| `ink` | string | `"#F6F4FF"` | Text colour |
| `ctaColor`, `ctaInk` | string | `"#1E1E1E"`, `"#FFFFFF"` | Button fill and label |
| `restGap` | number | `0.5` | Gap at rest as a fraction of section height. Never smaller than the content plus 48px |
| `lobeWidth` | number | `1.8` | Lobe width as a multiple of section width |
| `sag` | number | `0.11` | How far the curved edge dips across the viewport, as a fraction of width |
| `start` | number | `0.5` | Progress 0 when the section top is at this fraction of the viewport |
| `end` | number | `0` | Progress 1 when the section top reaches this fraction |
| `curve` | number | `1.5` | Gap = restGap × progress^curve. Above 1 opens slowly at first |
| `height`, `minHeight` | string, number | `"100vh"`, `560` | Section size |
| `serif`, `sans` | string | Newsreader / Inter stacks | Font families |
| `scrollContainer` | Element | `window` | For a section inside a scrolling element |
| `className`, `style` | | | Passed to the `<section>` |

## How it works

1. **Lobes are oversized ellipses in front of the content.** Each is a
   `border-radius: 50%` div, `lobeWidth` × the section width. Its height is
   solved from `sag`, so the visible edge dips by exactly `sag × width`
   between the viewport edges and the centre, whatever the screen size. The
   top lobe's bottom point and the bottom lobe's top point both sit on the
   section's centre line, so they meet when closed.
2. **Only transforms and opacity change.** Scroll progress
   `p = (start·vh − top) / ((start − end)·vh)`, clamped to 0 to 1, drives
   `translateY(∓gap/2)` on the lobes and the content's opacity. The value is
   written straight to the DOM in one rAF per scroll event, with no React
   re-render.
3. **The ease-in gap is fitted to the reference.** The measured gap was 7%,
   20%, 38% and 50% of viewport height across the scroll, which fits
   `restGap × p^1.5`. Text opacity runs from 0.1 to 1 across p 0.2 to 0.95.
4. **Rim and shade come from box-shadows.** An inset shadow on the visible
   side gives the edge highlight, and an outer blurred shadow gives the shade
   in the gap. Both follow the elliptical radius, so no SVG is needed.
5. **Narrow screens stay legible.** A ResizeObserver re-solves the geometry
   and measures the content. The rest gap is at least the content height plus
   48px, so wrapped copy on a phone is never covered.
6. `prefers-reduced-motion` renders the open state with no scrubbing.

## Caveats

- Progress 1 needs the section top to reach `end` × viewport height. If the
  section is last on the page and shorter than the viewport, the page may
  not scroll far enough. Keep `height` at 100vh, or raise `end`.
- The section clips with `overflow: hidden`, so content taller than the
  section is cut off.
- Verified at 800px and 375px wide, with no horizontal scroll.

## Reusable prompt template

Use this to generate a variant from scratch instead of importing the component.

```
Create a closing call-to-action section using the technique and style below.

SUBJECT
A centred block: a two-line serif headline "[HEADLINE, default: Build faster *systems*. / Ship
sharper *ideas*.]" in [TYPEFACE STYLE, default: high-contrast editorial serif, regular weight,
last word of each line italic], a two-line sans paragraph "[BODY, default: Book a 15-minute
call and see how Megamind Labs takes your product from first sketch to shipped.]" at 70%
opacity, and one pill button "[CTA, default: Book a Call]". Brand: [BRAND, default: Megamind Labs].
Keep the headline at two lines and the paragraph at two lines.

TECHNIQUE
Two ellipses about 180% of viewport width sit in front of the content (higher z-index). The
top one hangs from above and its bottom edge sags about 11% of viewport width at the centre.
The bottom one rises from below and its top edge arcs up by the same amount. Each is a flat
fill with a soft 2 to 3% highlight band along its curved edge and a faint darker shade cast
just past the edge, so it reads as a softly lit convex pillow. Build them as oversized
border-radius:50% divs (or SVG ellipses) with an inset box-shadow for the rim and a blurred
drop shadow for the shade. The content is clipped by the ellipse edges wherever they overlap it.

PALETTE
Background: [BG HEX, default #9793FE], deepening toward [DEEP HEX, default #8984FE] at the centre,
lightening toward #B8B4FE at the far left and right.
Lobes: [LOBE HEX, default #AFA9FF], rim highlight [RIM HEX, default #C2BFFF].
Text: [INK HEX, default #F6F4FF]. Button: [CTA HEX, default #1E1E1E] with a white label.
One hue family only. No hue shift, no noise, no glow beyond the rims, no hard outlines.

MOTION
Trigger: scroll, scrubbed (reversible, no autoplay).
Progress p = 0 when the section top is at 50% of the viewport, p = 1 when the section top
reaches the top of the viewport.
p 0.00  lobes meet at centre, content fully hidden
p 0.25  gap 7% of viewport height, text opacity ~0.1
p 0.60  gap 20%, text opacity ~0.5
p 0.85  gap 38%, text opacity ~0.85
p 1.00  gap [REST GAP, default 50%] of viewport height, text opacity 1
Gap = REST GAP x p^1.5 (ease-in: opens slowly, then quickly). The lobes separate
symmetrically: top lobe translates up, bottom lobe down.
CHANGES: lobe translateY, text opacity (0.1 to 1 across p 0.2 to 0.95).
FIXED: lobe size, curvature, colour and rim; text position, size and sharpness (no blur, no
slide, no scale); background.
Resting state: both lobes partly in view, framing the content above and below.

FRAMING
Full-viewport section, aspect [RATIO, default 1.84:1], content centred horizontally and
vertically, max text width about 40% of viewport. No UI chrome, no sound.
Mood: calm, soft-tech.

OUTPUT
[Pick one and delete the other:]
A) Video: [DURATION, default 2s], one continuous downward scroll from p 0 to p 1 at trackpad
   pace that decelerates into rest, holding for 1s at the end. No cursor.
B) Code: a single React component. Scroll progress from the section's bounding rect, applied
   in one rAF per scroll event as translateY on the lobes and opacity on the content. Solve
   the ellipse height from the sag so the curvature holds at any width. Respect
   prefers-reduced-motion by rendering the open state. Props: headline (ReactNode, supports
   italic spans), body, ctaLabel, ctaHref, bg, deep, lobe, rim, ink, ctaColor, restGap (0 to
   1), lobeWidth (default 1.8), sag (default 0.11).
```

Keep TECHNIQUE and MOTION as written. The effect depends on the lobes sitting
in front of the text, the rim lighting, and the ease-in gap. Delete whichever
OUTPUT option you are not using.
