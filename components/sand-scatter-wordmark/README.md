# sand-scatter-wordmark

A wordmark drawn from about 40,000 gold sand grains rather than solid ink.
When the cursor passes over it, the grains inside a soft circle around the
pointer are pushed outward into a pale haze, opening a dusty hole in the
letters. When the cursor moves on, a damped spring pulls every grain back to
where it started and the letters re-form. On load, the grains start as wavy
concentric rings, like raked sand, and settle into the letters.

React and a single `<canvas>`, no dependencies. Derived from a screen recording
via the `visual-to-prompt` skill. The grain look, the scatter, the spring back
and the intro come from that reference. The brand, the tagline copy and the
tagline's colour sweep do not.

## Files

| File | Purpose |
|---|---|
| `SandScatterWordmark.jsx` | The component. Copy anywhere in a React project. |
| `demo.html` | No-build preview. Transpiles the component in the browser. Add `?intro=0` to skip the intro. |
| `README.md` | This file, including the reusable prompt template. |

## Usage

```jsx
import SandScatterWordmark from "./SandScatterWordmark";

<SandScatterWordmark />

<SandScatterWordmark text="Megamind" width={60} radius={0.7}>
  <p className="tagline">Built for the next<br />generation of tools</p>
</SandScatterWordmark>
```

Children render under the canvas, so a tagline sits inside the same
background block. Next.js App Router: add `"use client"` as the first line.

## Demo

```bash
python3 -m http.server 8792
```

Then open `components/sand-scatter-wordmark/demo.html`.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | `"Megamind Labs"` | The wordmark |
| `font` | string | `"Archivo Black", "Arial Black", system-ui, sans-serif` | CSS font family. Load web fonts before mount, or they will be picked up once `document.fonts.ready` resolves |
| `fontWeight` | number | `900` | |
| `width` | number | `70` | % of the container width the wordmark fills |
| `count` | number | `40000` | Number of grains. Lower for fainter, sparser letters, or on slow devices |
| `radius` | number | `0.6` | Scatter radius as a fraction of cap height |
| `push` | number | `1` | Multiplies how far grains are pushed |
| `colorLow`, `colorHigh` | color | `#C9962E`, `#F0CF7A` | Each grain picks a random colour between these two |
| `background` | color | `#FDFDFD` | Background of the wrapper |
| `intro` | boolean | `true` | Play the raked-sand intro on mount. It is always skipped under `prefers-reduced-motion` |
| `stiffness` | number | `0.06` | Home spring, per 60Hz step |
| `damping` | number | `0.88` | Velocity kept per 60Hz step |
| `label` | string | `text` | Accessible name for the canvas (`role="img"`) |
| `className`, `style` | | | Passed to the wrapper `<div>` |
| `children` | node | | Rendered under the canvas |

## How it works

1. **Grains come from a text mask.** On mount and on width change, the text is
   fitted to `width`% of the container, rasterised with `fillText` offscreen,
   and the filled pixels are collected. Pixels with nothing two rows above
   them go in the pool three times, so grains collect a little more densely
   along top edges, as in the reference.
2. **One ImageData buffer per frame.** Every grain is a 1 to 2 CSS px square
   (corners dropped at 3 device px and up) composited by hand into a single
   buffer with straight-alpha "over", then `putImageData`. 40,000 grains at 2x
   costs about 2.5ms.
3. **The cursor moves targets, not forces.** For a grain whose home lies inside
   the radius, the spring target becomes a point on the same ray from the
   pointer, pushed out to `R × (0.3 + 0.95 k²)`, where `k` is a per-grain random
   value from 0.4 to 1.4. The spread of `k` gives a soft hole edge and a few
   grains landing well past the rim, which is the haze. Displaced grains lose
   up to 60% opacity. A fast swipe also adds some of the pointer's velocity
   to the grains under it, which smears them along the path.
4. **Spring home.** The damped spring runs at a fixed 60Hz step, so it feels
   the same on 120Hz screens. The loop stops once every grain has settled and
   restarts on the next pointer event.
5. **Intro.** Each grain starts on one of seven wobbly concentric ellipses
   centred on the wordmark. Over 0.4s the rings fade in, then each grain moves
   to its home over 1.2s with easeOutCubic and a random delay of up to 0.25s.

## Caveats

- The canvas is 0.8 cap heights taller than the text, top and bottom, so the
  haze and the intro rings are not clipped. Pull a tagline up with a negative
  margin if the gap is too big.
- Long, thin wordmarks look denser than the short, chunky one in the
  reference because the same `count` covers less area. Lower `count` to match.
- The scatter radius, the reach curve and the spring constants were tuned by
  eye against the recording, not measured.
- On touch, the scatter follows the finger while it is down. `touch-action:
  pan-y` keeps vertical page scrolling working.
- The text is redrawn only when the container's width changes. Changing
  props rebuilds the grains and skips the intro.

## Reusable prompt template

```
Create a [WHAT, default: hero wordmark] using the technique and style below.

SUBJECT
Render the wordmark "[BRAND, default: Megamind Labs]" in [TYPEFACE STYLE, default: a heavy
geometric sans with squared terminals], about [WIDTH, default: 70]% of the viewport width,
centred above an optional tagline "[TAGLINE, default: Built for the next / generation of tools]"
(two lines, dark neutral sans). Draw the wordmark entirely from sand grains. Never draw it as
filled vector glyphs.

TECHNIQUE
Rasterise the text offscreen, sample about [COUNT, default: 40000] grain positions from the
glyph mask, spread evenly, with grains slightly denser along the top edges of the letters.
Each grain is a round dot 1 to 2 CSS px across, with opacity between 0.5 and 1. Every grain
keeps a home position and a velocity, and a damped spring pulls it home (stiffness about
0.06, damping about 0.88 per frame). Render on one canvas at devicePixelRatio, 60fps.

PALETTE
Background: [BG HEX, default #FDFDFD]
Grains: each one picks a random colour between [INK LOW, default #C9962E] and [INK HIGH,
default #F0CF7A]. No glow, no drop shadow, no gradient across the word, and no colour change
on interaction.

INTERACTION
Trigger: cursor over the canvas (touch drag on mobile).
Radius: [RADIUS, default 0.6 x cap height].
Grains inside the radius are pushed outward from the pointer with a smooth falloff
(strongest at the centre, zero at the edge) plus a small random jitter, so the cleared area
is a soft dusty circle, not a clean disc. Displaced grains travel 40 to 120 px and fade to
about 40% opacity, leaving a pale haze. Fast cursor movement leaves a smeared trail.
CHANGES: grain positions and opacity only.
FIXED: the wordmark's layout, size and position, and the tagline. Nothing scales, tilts or
shifts colour.
Release: grains spring back home within about 0.8s.
Resting state: [RESTING, default: a crisp, speckled sand wordmark, still].

INTRO (on load)
0 to 0.2s: blank. Grains start spread across an ellipse about 1.3 times the wordmark's width,
arranged in concentric wavy rings like raked sand. Over 1.2s (easeOutCubic) they pull
together into blurry letters, then sharp ones. [INTRO, default: on]

FRAMING
Aspect ratio [RATIO, default 1.94:1], lots of empty margin, flat white page, no UI chrome,
no sound. Mood: tactile, warm, quiet.

OUTPUT
[Pick one and delete the other:]
A) Video: [DURATION, default 10s]. Intro, then a cursor sweeps slowly across the word,
   pauses inside one letter, does one fast swipe, then leaves while the word re-forms.
B) Code: a single React component on <canvas>. Sample the grains from an offscreen text
   mask on mount and on resize. Each frame, apply the cursor's push force and the home
   spring, then draw every grain with fillRect or one ImageData pass. Expose text, font,
   count, radius, colorLow, colorHigh, background, intro, and stiffness/damping as props.
   Respect prefers-reduced-motion by skipping the intro and limiting the push.
```

To keep the effect, leave TECHNIQUE and the falloff and spring wording in
INTERACTION as they are. Those are what make it read as sand rather than generic
particles. Colours, radius, count and the intro are safe to change.
