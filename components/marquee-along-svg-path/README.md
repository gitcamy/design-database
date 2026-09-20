# marquee-along-svg-path

A marquee that moves its children along an arbitrary SVG path using CSS
`offset-path`. Supports hover slowdown, drag with inertia, scroll-velocity
coupling, direction flipping, rolling z-index, and responsive scaling.
React + TypeScript + Tailwind + [motion](https://motion.dev).

## Files

| File | Purpose |
|---|---|
| `marquee-along-svg-path.tsx` | The component. Copy to `components/ui/`. |
| `demo.tsx` | Example usage with 13 Unsplash images on a looping path. |
| `utils.ts` | The `cn` helper. Identical to what shadcn generates at `lib/utils.ts`. |
| `demo.html` | No-build preview. Transpiles the files above in the browser. |

## Requirements

The component expects a shadcn-style project: TypeScript, Tailwind CSS, the
`@/` path alias, and `cn` exported from `@/lib/utils`. This repo is a
resource library and is not itself a shadcn project, so set one up in the
app you are copying into.

New project:

```bash
npx shadcn@latest init
```

The CLI scaffolds Next.js or Vite with TypeScript and Tailwind, creates
`components.json`, adds the `@/` alias, and writes `lib/utils.ts`.

Existing project without shadcn: install Tailwind per
https://tailwindcss.com/docs/installation, add TypeScript, then run the
same `init` command. It detects the framework and only adds what is missing.

## Install

```bash
npm install motion
```

`clsx` and `tailwind-merge` come with `shadcn init`. If you wired `cn` up
by hand, install those two as well.

Then copy the files:

- `marquee-along-svg-path.tsx` to `components/ui/marquee-along-svg-path.tsx`
- `demo.tsx` wherever you keep pages or examples

### Why `components/ui`

shadcn's default component path is `components/ui` (the `ui` alias in
`components.json`). The CLI writes every generated primitive there, and
the demo imports from `@/components/ui/marquee-along-svg-path`. Keeping
the folder means CLI-added components and hand-copied ones resolve through
one alias, imports stay copy-pasteable between projects, and app-specific
components in `components/` stay separate from reusable primitives. If
your `components.json` points elsewhere, put the file there and adjust
the import in `demo.tsx`.

### Next.js App Router

The component uses hooks and pointer events. Add `"use client"` as the
first line of both files.

## Usage

```tsx
import MarqueeAlongSvgPath from "@/components/ui/marquee-along-svg-path"

<MarqueeAlongSvgPath
  path="M0 50 C 25 0, 75 100, 100 50"
  viewBox="0 0 100 100"
  baseVelocity={4}
  repeat={3}
  responsive
  className="w-full h-96"
>
  {items.map((src) => (
    <img key={src} src={src} className="w-14 object-cover" draggable={false} />
  ))}
</MarqueeAlongSvgPath>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | ReactNode | required | Each child becomes a marquee item |
| `path` | string | required | SVG path `d` string, in `viewBox` units |
| `viewBox` | string | `"0 0 100 100"` | Must match the coordinate space of `path` |
| `pathId` | string | random | Id for the `<path>` element |
| `showPath` | boolean | `false` | Strokes the path, useful when tuning |
| `preserveAspectRatio` | string | `"xMidYMid meet"` | |
| `width`, `height` | string or number | `"100%"` | SVG size |
| `baseVelocity` | number | `5` | Percent of path length per second |
| `direction` | `"normal"` or `"reverse"` | `"normal"` | |
| `easing` | `(t) => number` | none | Remaps progress 0..1 along the path |
| `repeat` | number | `3` | Copies of each child. Raise until the path looks full |
| `slowdownOnHover` | boolean | `false` | |
| `slowDownFactor` | number | `0.3` | Speed multiplier while hovered |
| `slowDownSpringConfig` | SpringOptions | `{ damping: 50, stiffness: 400 }` | |
| `useScrollVelocity` | boolean | `false` | Scroll speed adds to marquee speed |
| `scrollAwareDirection` | boolean | `false` | Scroll direction flips marquee direction |
| `scrollSpringConfig` | SpringOptions | `{ damping: 50, stiffness: 400 }` | |
| `scrollContainer` | ref or element | own wrapper | Element whose scroll is tracked |
| `draggable` | boolean | `false` | |
| `dragSensitivity` | number | `0.2` | Pointer px to path percent |
| `dragVelocityDecay` | number | `0.96` | Inertia after release. Closer to 1 coasts longer |
| `dragAwareDirection` | boolean | `false` | Marquee keeps the direction of the last drag |
| `grabCursor` | boolean | `false` | |
| `enableRollingZIndex` | boolean | `true` | Items further along the path stack on top |
| `zIndexBase`, `zIndexRange` | number | `1`, `10` | |
| `cssVariableInterpolation` | `{ property, from, to }[]` | `[]` | Animates CSS variables or style props by path progress |
| `responsive` | boolean | `false` | Scales the `viewBox` box to fit the wrapper |
| `className` | string | | Applied to the wrapper |

## Integration notes

- **Data.** Children are arbitrary nodes. For images, set a fixed width on
  each child and `draggable={false}` on the `<img>` so native image drag
  does not fight the marquee drag.
- **State.** None required from the app. All animation state lives in
  motion values and refs, so the marquee does not re-render per frame.
- **Assets.** The demo uses Unsplash URLs, all checked to resolve. On
  Next.js with `next/image`, add `images.unsplash.com` to `remotePatterns`.
- **Responsive.** With `responsive`, the path box is scaled with a CSS
  transform to fit the wrapper and centred. Item sizes scale with it, so
  size items for the `viewBox`, not the screen. The wrapper needs an
  explicit height.
- **Placement.** Works best as a full-bleed hero or section background
  with a scroll container, as in the demo.

## Caveats

- Hooks are called inside `items.map` in the render. It works because the
  item count is stable between renders, but changing `children` length or
  `repeat` at runtime changes the hook count and React will throw. Remount
  the component with a `key` if those need to change. ESLint's
  `react-hooks/rules-of-hooks` will flag these lines.
- `offset-path: path()` is supported in current Chrome, Edge, Firefox, and
  Safari 16+. There is no fallback for older browsers.
- The path `id` is random per render when `pathId` is not given. Pass
  `pathId` under SSR to avoid a hydration mismatch warning.

## Demo

Serve this folder and open `demo.html`:

```bash
python3 -m http.server 8767
```
