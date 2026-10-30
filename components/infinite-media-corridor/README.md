# infinite-media-corridor

An endless image and video carousel. Cards leave a dark strip at the vanishing
point, split left and right, and sweep outward past the edges. Each card is
about 1.5× taller than the one before it and turns further from the viewer, so
the two streams read as walls bending toward you. Videos play muted and looped,
and pause while their card is off screen.

React, no dependencies. Derived from a screen recording via the
`visual-to-prompt` skill. Only the carousel mechanic and timing (about 0.62s per
card) come from the reference. The hero copy, brand and imagery do not.

## Usage

```jsx
import InfiniteMediaCorridor from "./InfiniteMediaCorridor";

<InfiniteMediaCorridor
  items={[
    "/media/one.jpg",
    "/media/two.mp4",
    { src: "/media/three.webm", type: "video", poster: "/media/three.jpg" },
    { src: "/media/four.jpg", alt: "Product shot" },
  ]}
/>
```

Next.js App Router: add `"use client"` as the first line. Pass children to
render an overlay layer on top of the carousel (for example a headline).

## Demo

```bash
python3 -m http.server 8779
```

Open `http://localhost:8779/components/infinite-media-corridor/demo.html`.

## Props

Lengths are in design units: pixels at a 1200px wide stage. The scene scales with container width.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `(string \| {src, type?, poster?, alt?})[]` | `[]` | `.mp4/.webm/.mov/.m4v/.ogv` are detected as video. The list cycles forever, alternating sides |
| `secondsPerCard` | number | `0.62` | Time for the stream to advance one card |
| `direction` | `1 \| -1` | `1` | `-1` runs the stream back into the seam |
| `paused` | boolean | `false` | |
| `pauseOnHover` | boolean | `false` | |
| `stripCards` | number | `2` | Flat cards per side inside the dark strip |
| `cardHeight` | number | `62` | Card height inside the strip |
| `aspect` | number | `1` | Card width / height when facing the viewer |
| `growth` | number | `1.52` | Height multiplier per card past the strip |
| `turn` | number | `0.33` | How fast cards turn away (visible width decays by `exp(-turn·u)`) |
| `minFacing` | number | `0.22` | Floor on that visible-width factor |
| `gap` | number | `0.05` | Gap between cards, as a fraction of card height |
| `seam` | number | `6` | Gap at the centre seam |
| `radius` | number | `0.05` | Corner radius as a fraction of card height |
| `stripColor` | string or null | `"#0B0B0B"` | Null hides the strip |
| `stripPadding` | number | `8` | |
| `horizon` | number | `0.5` | Vertical centre line, fraction of section height |
| `minScaleWidth` | number | `720` | Below this width the scene stops shrinking and the edges crop instead |
| `aspectRatio` | string | `"12 / 5"` | Section aspect ratio |
| `minHeight` | number | `300` | |
| `background` | string | `"transparent"` | |
| `children`, `className`, `style` | | | |

## How it works

- **Not a 3D camera.** One perspective cannot make every step grow by the same
  ratio while cards stay edge to edge. Instead each card has a continuous slot
  position `u`. Height is `cardHeight · growth^u`, visible width is
  `height · aspect · exp(-turn·u)`, and screen x is the running integral of
  visible widths, precomputed into a table.
- Each card's inner and outer edges become a symmetric trapezoid. A
  `matrix3d` homography maps the card element onto it, so the media is
  perspective-correct, and neighbours share an edge by construction.
- Slots loop. A slot's cycle number decides which item it shows, so media
  swaps only when a card re-enters at the seam, where it fades in over 0.6
  slots. Positions are written straight to the DOM every animation frame. React
  re-renders only on a swap.
- Videos play and pause as their card enters and leaves the frame. The loop
  stops while the section is off screen, and when `prefers-reduced-motion` is set.

## Reusable prompt

> An endless media carousel. A dark rounded strip sits at the centre of a light
> section and holds a few small flat thumbnails. Cards leave the strip outward to
> both sides and sweep past the left and right edges. Each card is about 1.5×
> taller than the previous one and turns further away, so the stream forms two
> curved walls. The cards are edge to edge with small gaps, the media fills each
> card, and video plays muted. A card advances about every 0.6s, and the motion
> never stops.
