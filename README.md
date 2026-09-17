# design-database

A collection of reusable design components and resources. Each component
lives in its own folder under `components/` with source, a runnable demo,
and a short README describing props and usage.

## Components

| Component | Description |
|---|---|
| [ascii-footer](components/ascii-footer/) | Footer that renders a wordmark as an ASCII glyph grid with a cursor-reactive point light. React + canvas. |

## Conventions

- One folder per component: `components/<name>/`.
- Include a `demo.html` that runs without a build step where practical.
- Document every exposed prop in the component's README.
