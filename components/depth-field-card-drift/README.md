# depth-field-card-drift

A scroll-driven field of photo and UI cards floating in 3D depth behind a hero.
As you scroll, every card slides away from the viewer. Cards are sharp only
near a focus plane and blur on both sides of it, so the field reads like a
camera with shallow depth of field pulling back through a cloud of photographs.
Cards enter large from in front of the lens, pass through focus, then shrink
toward the vanishing point, soften and fade into the background. The headline
lines dim one after the other while the field drifts.

React, no dependencies. Derived from a screen recording via the
`visual-to-prompt` skill. Only the depth, focus and timing mechanic comes from
the reference. The brand, copy, photography and UI card content do not.

## Usage

```jsx
import DepthFieldCardDrift from "./DepthFieldCardDrift";

<DepthFieldCardDrift
  items={[
    "/media/desk.jpg",
    "/media/walk.mp4",
    { src: "/media/sea.jpg", alt: "Breaking wave", aspect: 0.7 },
    { node: <NoteCard title="All notes" /> },
  ]}
>
  <Hero />
</DepthFieldCardDrift>
```

Next.js App Router: add `"use client"` as the first line.

The section is `height` tall (default `300vh`) and its stage is sticky for that
distance. Children render above the cards and receive the scroll progress as the
CSS variable `--p` (0 to 1), so overlay choreography is plain CSS:

```css
.hero h1 span:nth-child(1) { opacity: clamp(0, calc(1 - (var(--p) - 0.30) * 7), 1); }
.hero h1 span:nth-child(2) { opacity: clamp(0, calc(1 - (var(--p) - 0.38) * 6), 1); }
```

## Demo

```bash
python3 -m http.server 8781
```

Open `http://localhost:8781/components/depth-field-card-drift/demo.html`.
Append `#p=0.4` to open partway through the scroll.

## Props

Card sizes and x/y spread are design units at a 1440px wide stage and scale with the stage (floor 0.45). Depths are CSS pixels along z.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `(string \| {src, type?, poster?, alt?, aspect?} \| {node})[]` | `[]` | `.mp4/.webm/.mov/.m4v/.ogv` play muted and looped. `{node}` renders any element on a white card |
| `height` | CSS length | `"300vh"` | Total scroll length of the section |
| `perspective` | number | `1000` | Camera distance |
| `depth` | number | `3200` | Length of the z range cards cycle through |
| `near` | number | `420` | z where cards enter (in front of the focus plane) |
| `travel` | number | `1.1` | How many full depth cycles one pass of the section scrolls through |
| `focusZ` | number | `-60` | z of the focus plane |
| `focusDepth` | number | `120` | Half-thickness of the sharp band around `focusZ` |
| `blurPerPx` | number | `0.016` | Screen blur added per unit of z outside the sharp band |
| `maxBlur` | number | `14` | Screen blur cap, in px |
| `farFade` | number | `0.12` | Where the far fade begins, as a fraction of the far end |
| `cardWidth` | number | `210` | Base card width |
| `widthJitter` | number | `0.45` | Random width spread, as a fraction of `cardWidth` |
| `aspect` | number | `0.72` | Base width / height for media cards (portrait), jittered ±15% |
| `tilt` | number | `24` | rotateY in degrees, inner edge leaning away from the centre line |
| `clearCenter` | number | `0.4` | Fraction of half-width kept free of cards at the focus plane |
| `radius` | number | `14` | Corner radius in px |
| `seed` | number | `7` | Layout seed |
| `background` | string | `"#F1EFE9"` | |
| `children`, `className`, `style` | | | |

## How it works

- **A real CSS 3D scene.** The sticky stage holds a `preserve-3d` scene under
  `perspective`. Each card is `translate3d(x, y, z) rotateY(±tilt)` with a fixed
  seeded x/y. Scrolling only changes z, so perspective alone produces the drift
  toward the vanishing point and the shrink.
- **Depth wraps.** `z = near - ((z0 + p·travel·depth) mod depth)`. Cards fade in
  over the first 160 units after the wrap and fade out toward the far end, so the
  seam is never seen and the field never empties.
- **Depth of field.** Screen blur is `(|z - focusZ| - focusDepth) · blurPerPx`,
  capped. CSS blur is applied before projection, so it is multiplied by
  `(perspective - z) / perspective` to keep the on-screen softness true at any depth.
- **Layering.** The 3D view is its own isolated, contained layer, so the overlay
  always paints above it regardless of card z.
- One rAF per scroll event writes transform, filter, opacity and visibility
  straight to the DOM. The loop idles while the section is off screen. Videos
  play only while their card is visible.

## Reusable prompt

> A hero section on a warm off-white background (#F1EFE9). Behind a centred two
> line headline, a sparse field of rounded rectangular cards (photos plus a few
> small white UI cards) floats in 3D depth on both sides of the centre column.
> Each card is turned about 24° on Y so the edge nearest the centre leans away.
> The camera has shallow depth of field: cards are sharp only in a narrow band of
> depth, and blur progressively both nearer and farther. Scrolling pushes every
> card away from the viewer, so cards shrink toward the vanishing point, soften,
> and fade into the background, while new cards enter large and blurred from the
> frame edges and come into focus on their way back. Nothing rotates or slides
> sideways. The headline lines fade one after the other as the field recedes,
> then the page continues to the next section.

### Template

```
SUBJECT      A hero for [BRAND, default: Megamind Labs]: a two line headline
             [HEADLINE, default: "Quiet software. Close at hand. / Out of the way."],
             a two line supporting paragraph, one pill CTA. Behind it a field of
             [N, default: 18] cards: [MEDIA, default: soft natural-light lifestyle
             photos] plus [UI CARDS, default: 3 small white cards, a stat, a doc, a list].
TECHNIQUE    CSS 3D. Sticky full-viewport stage with perspective 1000px. Cards at fixed
             seeded x/y, kept out of the centre 40% at the focus plane, rotateY ±24°
             with the inner edge away. Scroll moves only z: cards recede and wrap.
             Blur = (|z - focus| - 120) * 0.016 px on screen, cap 14px, sharp band
             around the focus plane. Far cards fade to the background. Radius 14px.
PALETTE      [BG, default #F1EFE9] [INK, default #15292B] [CTA, default #163234]
MOTION       Section 300vh. 0 to 30%: field recedes, headline steady. 30 to 45%:
             headline line 1 fades, then line 2. 45 to 55%: paragraph and CTA fade.
             Field keeps receding to the end, then the stage scrolls away.
FRAMING      [RATIO, default full viewport], no chrome, no sound.
OUTPUT       A) Video: 6s, 60fps, slow forward scroll, camera pulls back through the cards.
             B) Code: React component with props items, height, perspective, depth,
                focusZ, focusDepth, blurPerPx, maxBlur, tilt, clearCenter, children.
```

Keep the sharp-band blur and the inner-edge tilt literal: they are what make it
read as a lens rather than parallax. Card count, media and copy are safe to change.
