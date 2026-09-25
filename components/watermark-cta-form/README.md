# watermark-cta-form

A closing call-to-action card with an inline email form. One base color is
lifted by two soft corner glows. An oversized brand mark sits behind the
copy as a faint watermark, cropped by the bottom edge. A centered headline,
a three-line paragraph and an input plus button row sit on top. Both the
color and the mark are props, and every other tone is mixed from the color,
so one prop re-themes the card.

React, no dependencies. Needs `color-mix()` (all evergreen browsers since
2023) for the glows.

Derived from a screenshot via the `visual-to-prompt` skill. The layout,
proportions and palette come from that reference. The brand, copy and mark
do not.

## Files

| File | Purpose |
|---|---|
| `WatermarkCtaForm.jsx` | The component (default export) and `RingsMark`, the default watermark (named export). |
| `demo.html` | No-build preview. Buttons cycle the color and swap the mark. |
| `README.md` | This file, including the reusable prompt template. |

## Usage

```jsx
import WatermarkCtaForm from "./WatermarkCtaForm";

<WatermarkCtaForm />

// Different color and your own mark (SVG node or image URL)
<WatermarkCtaForm
  bg="#6455F4"
  watermark={<MyLogo style={{ width: "100%", height: "100%" }} />}
  onSubmit={async (email) => {
    await fetch("/api/lead", { method: "POST", body: JSON.stringify({ email }) });
  }}
/>

<WatermarkCtaForm watermark="/logo-mark.svg" watermarkOpacity={0.08} />
```

An SVG mark should use `currentColor` so it takes the ink color. An image URL
is rendered as-is at `watermarkOpacity`, so a white or single-color file
works best.

Next.js App Router: add `"use client"` as the first line.

## Demo

```bash
python3 -m http.server 8771
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `headline` | string | `"Interested in trying Megamind Labs?"` | One line on desktop, balanced when it wraps |
| `body` | string | placeholder | About three lines at 46ch |
| `placeholder` | string | `"name@email.com"` | |
| `cta` | string | `"Request Info"` | |
| `successText` | string | `"Thanks, we'll be in touch."` | Replaces the form after a successful submit |
| `onSubmit` | `(email) => void or Promise` | | Rejecting shows an error line. Without it, submit goes straight to success |
| `bg` | string | `"#2667E0"` | Base card color. The glows are mixed from it |
| `ink` | string | `"#FFFFFF"` | Headline, body, and watermark color |
| `glow` | boolean | `true` | False gives a flat `bg` |
| `watermark` | ReactNode or string | `<RingsMark />` | Node, or an image URL |
| `watermarkOpacity` | number | `0.06` | The reference sits around 5 to 7% |
| `watermarkSize` | number | `1.4` | Mark height as a multiple of the card height |
| `watermarkX` | number | `50` | Mark center, percent of card width |
| `watermarkY` | number | `86` | Mark center, percent of card height. Above 50 crops it at the bottom |
| `inputBg` | string | `"#EFEFEF"` | |
| `buttonBg` | string | `"#FFFFFF"` | |
| `buttonInk` | string | `"#242424"` | |
| `radius` | number | `24` | px, card corners |
| `maxWidth` | number | `1165` | px |
| `className`, `style` | | | Passed to the `<section>` |

## How it works

1. **One color in, three tones out.** The background layers two radial
   gradients over `bg`: a top-left lift mixed 18% toward white, and a
   bottom-right bloom mixed 45% toward a pale sky blue. Both are made with
   `color-mix(in oklab, ...)`, so any base color keeps the same lighting.
2. **The watermark is a positioned layer.** It is absolutely positioned
   behind the content (`z-index: -1` inside an isolated section), sized as a
   multiple of the card height, centered at (`watermarkX`, `watermarkY`), and
   clipped by the card's `overflow: hidden`. It takes `ink` through
   `currentColor` at low opacity, so it tints with the card instead of
   sitting on top of it.
3. **The form is real.** It uses a labelled `type="email"` input with
   `required` and `autocomplete`. `onSubmit` can be async, and the component
   tracks idle, sending, done and error states.

## Caveats

- The card has no outer margin. Give its parent some padding.
- The bottom-right bloom is tuned for blues and violets. On a warm `bg`, pass
  `glow={false}` or override `style.background`.
- Stacks the input above the button below 640px. Verified at 375px and 800px,
  no horizontal scroll.

## Reusable prompt template

For generating a variant from scratch rather than importing the component.

```
Create a closing call-to-action section with an inline email form using the technique and
style below.

SUBJECT
A single rounded card containing a centered headline "[HEADLINE, default: Interested in
trying Megamind Labs?]" (one line on desktop), a three-line paragraph "[BODY, default: We
welcome any interest in putting our work to the test. Leave your email and we'll walk you
through a short demo and show you what it can do for your team.]", and one row with an
email input "[PLACEHOLDER, default: name@email.com]" and a button "[CTA, default: Request
Info]". Behind the copy, a watermark of [MARK, default: three nested rings sharing a bottom
tangent] for "[BRAND, default: Megamind Labs]".

TECHNIQUE
Background: the base color [BG HEX, default #2667E0] with two radial glows mixed from it: a
soft lift in the top-left corner (base mixed ~18% toward white) and a brighter, cooler
bloom in the bottom-right corner (base mixed ~45% toward #9FD4FF). No other gradients.
Watermark: the mark scaled to ~140% of the card height, centered horizontally, its center
at ~86% of the card height so most of it is cropped by the bottom edge and only the
upper arcs show behind the copy. Filled with the ink color at 5 to 7% opacity. It is a
tint, not a graphic: it should be barely visible, never compete with the headline, and
never sit above the text.

PALETTE
Card: [BG HEX, default #2667E0], glows derived from it as above
Ink: [INK HEX, default #FFFFFF] for headline, body at 90%, and watermark
Input: fill [INPUT HEX, default #EFEFEF], no border, placeholder #9A9A9A
Button: fill [BUTTON HEX, default #FFFFFF], label [BUTTON INK HEX, default #242424]
No shadows on the card, input, or button. No border on the card.

INTERACTION
Static section. Input and button are 50px tall, 8px radius, 10px apart; the input is about
310px wide and the button hugs its label with 20px padding. Button darkens ~4% on hover and
nudges 1px down on press. On submit the form is replaced by one line of confirmation text.
Nothing on the card animates: no parallax on the watermark, no gradient movement.

FRAMING
Card about [WIDTH, default 1165]px wide, ~390px tall at desktop, [RADIUS, default 24]px
corners, centered on a white page with generous space above and below. Headline in a clean
grotesk, medium weight, ~40px, -2.5% tracking; body 17px, 1.45 line height, max ~46ch.
Below 640px the input stacks above a full-width button.
Clean, trustworthy, product-marketing.

OUTPUT
[Pick one and delete the other:]
A) Image: a single frame of the section at 1440px wide, no browser chrome.
B) Code: a single React component <WatermarkCtaForm>. Glows via color-mix from one bg prop;
   watermark as an absolutely positioned child behind the content in an isolated,
   overflow-hidden section, using currentColor. Labelled type="email" input, async
   onSubmit with idle, sending, done and error states. Expose headline, body, placeholder,
   cta, successText, onSubmit, bg, ink, glow, watermark (node or image URL),
   watermarkOpacity, watermarkSize, watermarkX, watermarkY, inputBg, buttonBg, buttonInk,
   radius, and maxWidth as props.
```

Keep the TECHNIQUE section as written. The effect depends on the glows being
derived from one base color and the mark being huge, cropped and nearly
invisible. A small, centered or opaque logo turns it into an ordinary badge.
Delete whichever OUTPUT option you are not using.
