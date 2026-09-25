# transparent-to-solid-nav

A fixed top nav that sits transparent over the hero with light ink, and
switches to a solid bar with dark ink as soon as the page scrolls a few
pixels. It switches back only at the very top. It is a two-state switch with
a short crossfade, not a fade tied to scroll progress. Only the background
opacity and ink color change: height, layout, logo and CTA stay fixed.

React, no dependencies.

Derived from a screen recording via the `visual-to-prompt` skill. The
mechanic, timings and palette come from that reference. The brand, copy and
hero image do not.

## Files

| File | Purpose |
|---|---|
| `ScrollNav.jsx` | The component. Copy anywhere in a React project. |
| `demo.html` | No-build preview over a procedural stand-in hero. Transpiles the component in the browser. |
| `README.md` | This file, including the reusable prompt template. |

## Usage

```jsx
import ScrollNav from "./ScrollNav";

<ScrollNav />

// Colored bar instead of white
<ScrollNav solidBg="#6455F4" scrolledInk="#FFFFFF" />

<ScrollNav
  brand="Megamind Labs"
  links={[{ label: "Work", href: "/work" }, { label: "Log In", href: "/login" }]}
  cta="Start a project"
  ctaHref="/contact"
  onMenu={() => setMenuOpen(true)}
  threshold={8}
/>
```

Next.js App Router: add `"use client"` as the first line.

## Demo

Serve this folder and open `demo.html`:

```bash
python3 -m http.server 8770
```

The button cycles the solid state between white, ink and violet.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `brand` | string | `"Megamind Labs"` | Wordmark, left |
| `links` | `{label, href}[]` | `[{ label: "Log In", href: "#" }]` | Text links, right. Hidden below 768px |
| `cta` | string or null | `"Start a project"` | Pill button. Null hides it |
| `ctaHref` | string | `"#"` | |
| `onCta` | function | | Click handler for the CTA |
| `onMenu` | function | | Click handler for the menu icon |
| `threshold` | number | `8` | px of scroll before the switch |
| `solidBg` | string | `"#FFFFFF"` | Scrolled background. Any color works; pair it with `scrolledInk` |
| `topInk` | string | `"#FFFFFF"` | Ink over the hero |
| `scrolledInk` | string | `"#1E1E1C"` | Ink on the solid bar |
| `ctaBg` | string | `"#D5F88A"` | CTA fill, the same in both states |
| `ctaInk` | string | `"#1E1E1C"` | CTA label |
| `height` | number | `76` | px. Never changes between states |
| `padding` | number | `60` | px side padding. 20px below 768px |
| `fade` | number | `250` | ms, background opacity |
| `inkFade` | number | `150` | ms, ink color. Shorter, so type is dark before the bar is fully white |
| `scrollContainer` | Element | `window` | For a nav inside a scrolling element |
| `className`, `style` | | | Passed to the `<header>` |

## How it works

1. **Two states, one boolean.** `scrollY > threshold` sets `data-scrolled` on
   the header. There is no direction logic and no hide-on-scroll. The scroll
   listener is passive and sets state directly, because React skips the
   render when the boolean has not changed.
2. **The background is its own layer.** An absolutely positioned div filled
   with `solidBg` has only its opacity transitioned, on
   `cubic-bezier(0.2, 0, 0, 1)`. Nothing reflows and the height never changes.
3. **Ink is one CSS variable.** `--nav-ink` swaps between `topInk` and
   `scrolledInk`. The wordmark, links and menu icon inherit it with a shorter
   transition than the background, which matches the reference: the type
   turns dark when the white is only about 15% in.
4. **No flash on a scrolled load.** The first check runs on mount with
   transitions disabled (`data-instant`), so a page reloaded mid-scroll starts
   solid rather than fading in.
5. `prefers-reduced-motion` switches instantly.

## Caveats

- The hero needs enough contrast under the top strip for `topInk` to read.
  There is deliberately no scrim; add one to the hero, not the nav.
- The menu icon only calls `onMenu`. The drawer is up to you.
- At 375px, links are hidden and the wordmark drops to 20px so the CTA and
  menu icon fit. Verified at 375px and 800px, no horizontal scroll.

## Reusable prompt template

For generating a variant from scratch rather than importing the component.

```
Create a fixed top navigation bar using the technique and style below.

SUBJECT
A single-row nav for "[BRAND, default: Megamind Labs]": wordmark left set in [TYPEFACE STYLE,
default: a clean geometric grotesk, regular, 24px, -1% tracking]; right cluster of a text
link "[LINK, default: Log In]", a pill CTA "[CTA, default: Start a project]", and a
three-line menu icon. It sits over [HERO, default: a full-bleed photographic hero with a
bright sky and a dark subject].

TECHNIQUE
The bar has exactly two states, switched by a boolean at a scroll threshold, never by a
scroll-linked progress value. Render the background as its own layer (a ::before or an
absolutely positioned div) and animate only its opacity, so the layout never reflows.
Drive ink color from a single CSS variable on the nav (--nav-ink) and transition it.
Use a passive scroll listener (or an IntersectionObserver on a 1px sentinel at the top of
the page) and toggle a data-scrolled attribute.

PALETTE
Top state: background transparent; ink [TOP INK HEX, default #FFFFFF].
Scrolled state: background [SOLID BG HEX, default #FFFFFF] at 100% opacity (a brand color
works too, pair it with a readable ink); ink [SCROLLED INK HEX, default #1E1E1C].
CTA: fill [CTA HEX, default #D5F88A], label [CTA INK HEX, default #1E1E1C], identical in
both states.
No shadow, no bottom border, no backdrop blur, no gradient scrim in either state.

INTERACTION
Trigger: scrollY > [THRESHOLD, default 8]px switches to scrolled; scrollY <= THRESHOLD
switches back. No direction logic, no hide-on-scroll.
Background opacity: 0 to 1 over [FADE, default 250]ms, cubic-bezier(0.2, 0, 0, 1).
Ink color: crossfades over [INK FADE, default 150]ms, so type turns dark before the
background is fully in.
Reverse runs with the same durations.
CHANGES: background opacity, ink color.
FIXED: height [HEIGHT, default 76]px, [PADDING, default 60]px side padding, positions, logo
size and asset, CTA fill. Nothing slides, shrinks, blurs or bounces.
Resting state: transparent over the hero on page load at scrollY 0; if the page loads
already scrolled, start in the scrolled state with no animation.

FRAMING
Fixed to the viewport top, full width, z-index above page content. Below 768px keep the
wordmark and menu icon, hide the text link, keep the CTA if it fits. Respect
prefers-reduced-motion by switching instantly.
Clean, quiet, confident.

OUTPUT
[Pick one and delete the other:]
A) Video: [DURATION, default 6]s, cursor-free scroll: rest at the top for 1.5s, scroll down
   past the hero, hold, then scroll back to the top so the bar returns to transparent.
B) Code: a single React component <ScrollNav>. Background on its own layer with an opacity
   transition, ink via --nav-ink, state from a passive scroll listener and an initial check
   on mount. Expose brand, links, cta, onCta, threshold, solidBg, topInk, scrolledInk,
   ctaBg, ctaInk, height, and fade durations as props.
```

Keep the TECHNIQUE section as written. The effect depends on a two-state
switch with the background faded on its own layer. Tying it to scroll
progress or animating the height gives a different nav. Delete whichever
OUTPUT option you are not using.
