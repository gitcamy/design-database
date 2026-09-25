# before-after-drag-reveal

A before/after comparison section. One mockup is rendered twice in identical
layout and stacked. A vertical divider with a round "drag me" handle splits
them. Left of the line is the AFTER state and right of it is the BEFORE state.
Dragging moves only a clip boundary, so a card, a bar chart or a number
changes state exactly where the line crosses it, including partway through.
Nothing fades, eases or counts up.

React, no dependencies. Ships with a default dashboard mockup (flow diagram,
bar chart, two stat tiles) so it runs with no content. Pass your own `before`
and `after` nodes for real use.

Derived from a screen recording via the `visual-to-prompt` skill. The
mechanic, measurements and palette come from that reference. The brand, copy
and icons do not.

## Files

| File | Purpose |
|---|---|
| `BeforeAfterReveal.jsx` | The component (default export) and `DashboardMockup` (named export). |
| `demo.html` | No-build preview. Transpiles the component in the browser. |
| `README.md` | This file, including the reusable prompt template. |

## Usage

```jsx
import BeforeAfterReveal from "./BeforeAfterReveal";

// Default dashboard mockup, Megamind Labs labels
<BeforeAfterReveal />

// Your own states. They must share one layout, pixel for pixel.
<BeforeAfterReveal
  before={<Pricing plan="old" />}
  after={<Pricing plan="new" />}
  initial={30}
  lineColor="#5B6BDC"
  onChange={(x) => console.log(x)}
/>
```

Next.js App Router: add `"use client"` as the first line.

## Demo

Serve this folder and open `demo.html`:

```bash
python3 -m http.server 8769
```

`?x=` sets the starting position (0 to 100).

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `before` | ReactNode | default mockup | BEFORE layer. Sits in normal flow and sets the height |
| `after` | ReactNode | default mockup | AFTER layer. Stacked on top and clipped to the left of the line |
| `brand` | string | `"Megamind Labs"` | Used in the default state labels |
| `beforeLabel` | string | `"Without {brand}"` | Default mockup only |
| `afterLabel` | string | `"With {brand}"` | Default mockup only |
| `initial` | number | `50` | Starting divider position, percent |
| `step` | number | `5` | Arrow-key step, percent |
| `lineColor` | string | `"#5B6BDC"` | Divider, chevrons, handle label |
| `handleLabel` | string or null | `"DRAG ME"` | Pill under the handle. Null hides it |
| `overshoot` | number | `30` | px the line runs past the frame, top and bottom |
| `accent` | string | `"#6455F4"` | AFTER bars and highlighted tile (default mockup) |
| `accentTint` | string | `"#CDC7FD"` | AFTER bar caps (default mockup) |
| `ink` | string | `"#333433"` | BEFORE dark tile (default mockup) |
| `backing` | string | `"#767676"` | BEFORE frame backing (default mockup) |
| `bg` | string | `"#FAF7FD"` | Page tint. Also the opaque fill of the AFTER layer |
| `maxWidth` | number | `915` | px. Frame width |
| `onChange` | (x: number) => void | | Called with the new position, percent |
| `className`, `style` | | | Passed to the wrapper |

## How it works

1. **Two copies, one clip.** BEFORE sits in normal flow. AFTER is
   `position: absolute; inset: 0` on top of it with
   `clip-path: inset(0 calc(100% - var(--x)) 0 0)`. The only state is `--x`.
   Because the clip cuts straight through both layouts, one card can be half
   BEFORE and half AFTER. That hard mid-card cut is the effect. A crossfade or
   a count-up turns it into a different component.
2. **The AFTER layer is opaque and isolated.** It is filled with `bg` and gets
   `isolation: isolate` plus a z-index, so a transparent AFTER frame or a
   z-indexed element inside BEFORE cannot bleed through.
3. **The divider follows the pointer 1:1.** Pointer capture on pointerdown
   anywhere on the frame, one state update per animation frame however fast
   pointermove fires, clamped to 0 to 100. No easing, spring, snap or inertia.
   `touch-action: pan-y` keeps vertical page scroll working on touch.
4. **The handle is the slider.** `role="slider"` with aria values, arrow keys
   in `step` increments, Home and End for 0 and 100. It stays at the frame's
   vertical center; only x changes.

## Caveats

- Both layers must be the same size. BEFORE sets the height, so a taller AFTER
  is cropped at the bottom.
- The default mockup's BEFORE flow uses fixed pixel positions and gets cramped
  below about 400px. It is placeholder content. Replace it for production.
- Stacks to one column under 768px through a scoped `<style>` block (the
  `bar-` class prefix). Verified at 375px and 800px, no horizontal scroll.
- There is no auto-play hint animation. The reference had none.

## Reusable prompt template

For generating a variant from scratch rather than importing the component.

```
Create a [WHAT, default: product comparison section] using the technique and style below.

SUBJECT
Render one framed mockup of [MOCKUP, default: a dashboard with a process flow panel on the
left, a bar chart card top-right, and two stat tiles bottom-right] for "[BRAND, default:
Megamind Labs]", in two states that share an identical layout:
BEFORE: [BEFORE CONTENT, default: a cluttered 7-node flow, near-empty bars, "1.3%", "02"]
AFTER:  [AFTER CONTENT, default: a clean 3-node flow, near-full bars, "38%", "4,382"]
State labels: a dark pill top-left reading "[BEFORE LABEL, default: Without Megamind Labs]"
and "[AFTER LABEL, default: With Megamind Labs]".
Both copies must match to the pixel in card positions, sizes and radii. Only the content
inside the cards, the fills, and the frame backing differ.

TECHNIQUE
Stack the two copies absolutely on top of each other. The AFTER layer sits on top and is
clipped with clip-path: inset(0 calc(100% - var(--x)) 0 0), so it shows only left of the
divider; the BEFORE layer shows through on the right. The divider position is a single CSS
variable --x (0-100%). The clip cuts straight through cards, charts and numbers, so one card
can be half BEFORE and half AFTER. That hard mid-card cut is the effect; do not soften it.
Numbers in [STAT TYPEFACE, default: a light-weight serif, about 44px]; UI chips in
[UI TYPEFACE, default: a medium grotesk, 13px].

PALETTE
Page: [BG HEX, default #FAF7FD]
BEFORE backing: [BEFORE BACKING HEX, default #767676] solid fill behind the cards
AFTER backing: none, 1px hairline border only
BEFORE ink: [BEFORE INK HEX, default #333433] for the dark tile and bar fills, bar tracks #F1F1F1
AFTER accent: [ACCENT HEX, default #6455F4] for bars and the highlighted tile, bar caps
[ACCENT TINT HEX, default #CDC7FD]
Divider: [LINE HEX, default #5B6BDC]
Cards are white in both states. No gradients except one optional app-icon tile in the AFTER
flow. No glow, no shadow on the divider.

INTERACTION
Trigger: pointer drag (mouse and touch) anywhere on the section, plus arrow keys in 5% steps.
Divider: 2px vertical line in LINE HEX, running about 30px past the frame at top and bottom.
Handle: 34px white circle at the frame's vertical center with two small left/right chevrons
in LINE HEX, and "[HANDLE LABEL, default: DRAG ME]" in 9px uppercase on a white pill 8px below.
The divider follows pointer x 1:1. No easing, spring, snap or inertia. Clamped 0-100%.
CHANGES: --x only (clip position, divider and handle x).
FIXED: every card position, size and radius, the handle's y, both layers' content. Nothing
fades, scales, counts up or animates.
Cursor: grab on the handle, grabbing while dragging.
Resting state: [START, default: 50%].

FRAMING
Section centered, frame about [FRAME SIZE, default: 915x410px], 24px outer radius, 22px inner
padding, 16px card radius, 16px gaps. A thin centered subtitle line above the frame. No
browser chrome, no sound. Stacks to a single column of cards under 768px, with the divider
unchanged.
Clean, product-marketing, tactile.

OUTPUT
[Pick one and delete the other:]
A) Video: [DURATION, default 8s], one take: the divider starts near the left edge, is dragged
   right to about 70%, back left to about 20%, then all the way right to the edge, at a
   steady hand speed with a visible grab cursor.
B) Code: a single React component <BeforeAfterReveal>. Render `before` and `after` as two
   absolutely stacked children inside one relative frame; clip the after layer with
   clip-path driven by a --x CSS variable updated from pointer events (setPointerCapture on
   pointerdown, rAF-throttled pointermove). Handle is a role="slider" with aria-valuenow and
   arrow-key support. Expose before, after, beforeLabel, afterLabel, initial (0-100),
   lineColor, handleLabel, and onChange(x) as props.
```

Keep TECHNIQUE and INTERACTION exactly as written. The effect depends on two
identical layouts cut by a hard clip with no easing. Delete whichever OUTPUT
option you are not using.
