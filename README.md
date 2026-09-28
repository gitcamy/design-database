# design-database

A collection of reusable design components and resources. Each component
lives in its own folder under `components/` with source, a runnable demo,
and a short README describing props and usage.

## Components

| Component | Description |
|---|---|
| [ascii-footer](components/ascii-footer/) | Footer that renders a wordmark as an ASCII glyph grid with a cursor-reactive point light. React + canvas. |
| [marquee-along-svg-path](components/marquee-along-svg-path/) | Marquee that moves items along any SVG path, with drag, hover slowdown, and scroll coupling. React + TypeScript + Tailwind + motion. |
| [mosaic-hero-open](components/mosaic-hero-open/) | Hero that opens by expanding a pill to full bleed, with a screen-space tile mosaic that resolves as it grows. React + canvas. |
| [before-after-drag-reveal](components/before-after-drag-reveal/) | Before/after comparison with a draggable divider that clips one layout over an identical one, cutting cards mid-way. React, no dependencies. |
| [transparent-to-solid-nav](components/transparent-to-solid-nav/) | Fixed nav that is transparent over the hero and switches to a solid white or colored bar on scroll. React, no dependencies. |
| [watermark-cta-form](components/watermark-cta-form/) | CTA card with an inline email form, color-mixed corner glows, and a cropped low-opacity logo watermark. Color and mark are props. React, no dependencies. |
| [iridescent-cobalt-3d](components/iridescent-cobalt-3d/) | Material for any 3D object: glossy cobalt plastic with a banded thin-film iridescent coat. Three.js module and demo, plus image-model and Blender prompts. |
| [lens-part-cta-reveal](components/lens-part-cta-reveal/) | Closing CTA revealed on scroll by two soft-lit ellipses that part like an opening lens, clipping and brightening the headline between them. React, no dependencies. |
| [cast-iron-medallion-tilt](components/cast-iron-medallion-tilt/) | 3D ring-and-mark medallion in dark sandblasted cast iron that tilts toward the pointer on a critically damped spring. Three.js module and demo, plus image, video and code prompts. |
| [negative-space-mark-footer](components/negative-space-mark-footer/) | Two-colour footer band with an oversized monogram whose gutters form a star in negative space. React + SVG. |

## Conventions

- One folder per component: `components/<name>/`.
- Include a `demo.html` that runs without a build step where practical.
- Document every exposed prop in the component's README.
- Add every component to `index.json` and to the table above. `index.json`
  is the machine-readable catalogue — name, aliases, tags, stack,
  dependencies, file destinations, and the techniques worth reusing. Tools
  read it instead of walking the folders, so a component missing from it is
  effectively invisible.
