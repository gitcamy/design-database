# Pixel Character

A 1-bit dithered pixel character drawn live on a `<canvas>`. No video, no sprite sheet: every frame is drawn with shapes and gradients, then dithered to pixels.

**The loop (about 15s):**
1. A wave of pixels rolls in from off-screen bottom-left, curls up like a crest, and crashes into her shape, with a small spray on impact.
2. She waves.
3. A quick row-glitch, then she takes a call (phone in the accent color).
4. Another glitch, then she types on a laptop (lid in the accent color, with a pixel logomark).
5. She washes out to the upper right, and the loop restarts.

Built for megamindlabs.ai (hero and the floating "ask me" orb). Brand: black stage, white pixels, Lime Cream `#E3F988` for one prop per pose.

## Files

| File | What it is |
|---|---|
| `PixelCharacter.tsx` | React component, no dependencies beyond React |
| `demo.html` | Standalone version with scene buttons. Open in any browser |

## Usage

```tsx
import PixelCharacter from "./PixelCharacter"

<PixelCharacter />                          // full loop
<PixelCharacter pose="type" />              // lock to one pose
<PixelCharacter accent="#88B2FD" cell={4} /> // different accent, smaller pixels
```

## Props

| Prop | Default | Notes |
|---|---|---|
| `pose` | `"auto"` | `"auto"` plays the loop, or `"wave"`, `"phone"`, `"type"`, `"idle"` |
| `cell` | `5` | Screen pixels per character pixel. Grid is 96 x 112 |
| `ink` | `#FFFFFF` | Pixel color |
| `background` | `#000000` | Stage color |
| `accent` | `#E3F988` | Color of the prop in her hands |
| `showLogo` | `true` | Pixel logomark on the laptop lid |
| `className`, `style`, `ariaLabel` | | Passed to the canvas |

Respects `prefers-reduced-motion`: holds a still wave pose, no entrance or glitch.

## How it works

1. **Draw** the character each frame to a hidden 96 x 112 canvas in grayscale, using simple shapes (curls are circles, limbs are thick round-capped lines, faces are radial gradients).
2. **Mark** the accent prop in pure green (`rgb(0,255,0)`) so it can be picked out later.
3. **Dither** each cell with a 4x4 Bayer matrix: luminance above the threshold becomes ink, below becomes background, and green becomes the accent.
4. **Animate** the cells, not the drawing. The entrance and exit move each cell along its own curved path with hashed delays, so the character forms from, and dissolves into, a flowing wave.

## Reusable prompt

Create a 1-bit dithered pixel character animation, drawn live in code, not video.

SUBJECT
A [CHARACTER, default "girl with voluminous curly hair, crew-neck top"] shown from the chest up, friendly cartoon proportions (large head, short neck, sloped shoulders).

STYLE
Draw with simple shapes into a small offscreen grid ([GRID, default 96x112]), shaded with gradients, then dither to 1-bit with a 4x4 Bayer matrix. Pixels are [INK, default #FFFFFF] on [BACKGROUND, default #000000]. Exactly one prop per pose uses [ACCENT, default #E3F988], flat, no dither.

SEQUENCE
1. Entrance: a wave of pixels rolls in from [ENTRY SIDE, default bottom-left], curls up like a crest, and crashes into the character with a small spray.
2. [POSE 1, default "waves hello, big smile"].
3. Quick horizontal row-glitch transition, then [POSE 2, default "on a phone call, head tilted, accent phone at her ear"].
4. Row-glitch, then [POSE 3, default "typing on a laptop at a desk, accent lid with a pixel logo"].
5. Exit: pixels wash out to [EXIT SIDE, default upper right]. Loop.
Idle life throughout: breathing, blinking every ~3.4s.

OUTPUT
Single React component with a `<canvas>`, props for pose, cell size, and colors. Honor prefers-reduced-motion with a still pose.
