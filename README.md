# design-database

A collection of reusable design components and resources. Each component
lives in its own folder under `components/` with source, a runnable demo,
and a short README describing props and usage.

## Components

| Component | Description |
|---|---|
| [ascii-footer](components/ascii-footer/) | Footer that renders a wordmark as an ASCII glyph grid with a cursor-reactive point light. React + canvas. |
| [marquee-along-svg-path](components/marquee-along-svg-path/) | Marquee that moves items along any SVG path, with drag, hover slowdown, and scroll coupling. React + TypeScript + Tailwind + motion. |

## Conventions

- One folder per component: `components/<name>/`.
- Include a `demo.html` that runs without a build step where practical.
- Document every exposed prop in the component's README.
- Add every component to `index.json` and to the table above. `index.json`
  is the machine-readable catalogue — name, aliases, tags, stack,
  dependencies, file destinations, and the techniques worth reusing. Tools
  read it instead of walking the folders, so a component missing from it is
  effectively invisible.
