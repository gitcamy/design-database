import React, { useId, useRef } from "react";

// Glyph geometry, as stroke centrelines. Stroke width is 24, the x-height is
// 100 (y 0 to 100, baseline at 100), ascenders reach y -50. Bowls are true
// circles of centreline radius 38, so every letter has an outer height of 100.
// Terminals are butt cut. Paths use only M, H, V and A.
const STROKE = 24;
const X_HEIGHT = 100;
const ASCENDER = 50;

const BOWL = "M12 50A38 38 0 1 0 88 50A38 38 0 1 0 12 50";

// w = advance width, d = descender depth below the baseline.
export const GLYPHS = {
  a: { w: 100, d: 0, p: `${BOWL}M88 0V100` },
  b: { w: 100, d: 0, p: `${BOWL}M12 -50V100` },
  c: { w: 100, d: 0, p: "M79.1 25.6A38 38 0 1 0 79.1 74.4" },
  d: { w: 100, d: 0, p: `${BOWL}M88 -50V100` },
  e: { w: 100, d: 0, p: "M12 50H88A38 38 0 1 0 76.9 76.9" },
  g: { w: 100, d: 50, p: `${BOWL}M88 0V110A28 28 0 0 1 60 138H12` },
  h: { w: 100, d: 0, p: "M12 -50V100M12 50A38 38 0 0 1 88 50V100" },
  i: { w: 24, d: 0, p: "M12 0V100M12 -50V-26" },
  l: { w: 24, d: 0, p: "M12 -50V100" },
  m: { w: 160, d: 0, p: "M12 0V100M12 46A34 34 0 0 1 80 46V100M80 46A34 34 0 0 1 148 46V100" },
  n: { w: 100, d: 0, p: "M12 0V100M12 50A38 38 0 0 1 88 50V100" },
  o: { w: 100, d: 0, p: BOWL },
  p: { w: 100, d: 50, p: `${BOWL}M12 0V150` },
  r: { w: 76, d: 0, p: "M12 0V100M12 50A38 38 0 0 1 50 12H76" },
  s: { w: 100, d: 0, p: "M88 12H50A19 19 0 0 0 50 50A19 19 0 0 1 50 88H12" },
  t: { w: 84, d: 0, p: "M36 -30V62A26 26 0 0 0 62 88H80M4 12H76" },
  u: { w: 100, d: 0, p: "M12 0V50A38 38 0 0 0 88 50M88 0V100" },
};

// Fine monochrome film grain, tiled. Sits above the plate and the letters so
// the glow is grainy too.
const GRAIN =
  "url(\"data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
      '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>' +
      '<feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1.1 -0.1"/></filter>' +
      '<rect width="100%" height="100%" filter="url(#n)"/></svg>'
  ) +
  "\")";

function layout(lines, glyphs, tracking, leading, justify) {
  const rows = lines.map((text) => {
    const chars = [...text.toLowerCase()].filter((c) => c !== " ");
    const items = chars.map((c) => ({ c, g: glyphs[c] })).filter((i) => i.g);
    const width = items.reduce((s, i) => s + i.g.w, 0) + tracking * Math.max(items.length - 1, 0);
    return { items, width };
  });
  const blockW = Math.max(...rows.map((r) => r.width), 1);
  let bottom = 0;
  const placed = rows.map((row, li) => {
    const gap =
      justify && row.items.length > 1
        ? (blockW - (row.width - tracking * (row.items.length - 1))) / (row.items.length - 1)
        : tracking;
    const base = X_HEIGHT + li * leading;
    let x = 0;
    const out = row.items.map((i) => {
      const at = { d: i.g.p, x, y: li * leading };
      x += i.g.w + gap;
      bottom = Math.max(bottom, base + i.g.d);
      return at;
    });
    return out;
  });
  return { placed, blockW, bottom: Math.max(bottom, X_HEIGHT) };
}

export default function EmbossedWordmarkLightFooter({
  lines = ["mega", "mind", "labs"],
  links = ["X", "LinkedIn", "Support", "hello@megamindlabs.com"],
  legal = "© Megamind Labs 2026",
  plate = "#BCBEC1",
  face = "#A4A7A9",
  core = "#EFF1F1",
  mid = "#D4F2F3",
  rim = "#9FB0E8",
  text = "#6C6F74",
  radius = 0.85,
  fade = 0.6,
  wordmarkWidth = 72,
  leading = 205,
  tracking = 16,
  justify = false,
  breakpoint = 700,
  glyphs,
  label = "Megamind Labs",
  className,
  style,
}) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef(null);
  const gradRef = useRef(null);
  const glowRef = useRef(null);

  const set = { ...GLYPHS, ...glyphs };
  const { placed, blockW, bottom } = layout(lines, set, tracking, leading, justify);
  const pad = 8;
  const vx = -pad;
  const vy = -ASCENDER - pad;
  const vw = blockW + pad * 2;
  const vh = bottom + ASCENDER + pad * 2;
  const r = radius * X_HEIGHT;

  const move = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    if (!box.width) return;
    const x = vx + ((e.clientX - box.left) / box.width) * vw;
    const y = vy + ((e.clientY - box.top) / box.height) * vh;
    const g = gradRef.current;
    g.setAttribute("cx", x);
    g.setAttribute("cy", y);
    g.setAttribute("fx", x);
    g.setAttribute("fy", y);
    const glow = glowRef.current;
    glow.style.transition = "opacity 0.12s ease-out";
    glow.style.opacity = 1;
  };

  const leave = () => {
    const glow = glowRef.current;
    if (!glow) return;
    glow.style.transition = `opacity ${fade}s ease-out`;
    glow.style.opacity = 0;
  };

  const glyphSet = placed.flat().map((p, i) => (
    <path key={i} d={p.d} transform={`translate(${p.x} ${p.y})`} />
  ));

  return (
    <footer
      className={className}
      onPointerMove={move}
      onPointerLeave={leave}
      style={{
        position: "relative",
        overflow: "hidden",
        containerType: "inline-size",
        background: plate,
        color: text,
        boxShadow: "inset 0 2px 0 rgba(255,255,255,0.6), inset 0 3px 2px rgba(255,255,255,0.25)",
        touchAction: "pan-y",
        ...style,
      }}
    >
      <style>{`
        .ewlf-${uid} { padding: 5cqw; font: 400 max(10px, 1.05cqw)/1.3 "Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif; letter-spacing: .02em; text-transform: uppercase; }
        .ewlf-${uid} .ewlf-links { position: absolute; top: 5cqw; right: 5cqw; display: flex; gap: 2.2cqw; }
        .ewlf-${uid} .ewlf-legal { position: absolute; right: 5cqw; bottom: 3cqw; opacity: .8; }
        .ewlf-${uid} a { color: inherit; text-decoration: none; }
        .ewlf-${uid} a:hover { text-decoration: underline; }
        .ewlf-${uid} svg.ewlf-mark { display: block; width: ${wordmarkWidth}%; height: auto; overflow: visible; }
        @container (max-width: ${breakpoint}px) {
          .ewlf-${uid} svg.ewlf-mark { width: 100%; }
          .ewlf-${uid} .ewlf-links { position: static; flex-wrap: wrap; margin-bottom: 6cqw; }
          .ewlf-${uid} .ewlf-legal { position: static; margin-top: 6cqw; }
          .ewlf-${uid} { font-size: 11px; }
        }
      `}</style>

      <div className={`ewlf-${uid}`}>
        <nav className="ewlf-links">
          {links.map((l) => (
            <a key={l} href="#">{l}</a>
          ))}
        </nav>

        <svg
          ref={svgRef}
          className="ewlf-mark"
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          role="img"
          aria-label={label}
        >
          <defs>
            <g id={`g${uid}`}>{glyphSet}</g>

            {/* Recess: white outer lip, the face, then a dark inner shadow on
                the top and left edges. All derived from the glyph alpha. */}
            <filter id={`f${uid}`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
              <feOffset in="SourceAlpha" dx="1.6" dy="1.6" result="lipOff" />
              <feGaussianBlur in="lipOff" stdDeviation="1.4" result="lipBlur" />
              <feFlood floodColor="#ffffff" floodOpacity="0.85" />
              <feComposite in2="lipBlur" operator="in" result="lip" />
              <feComponentTransfer in="SourceAlpha" result="inv">
                <feFuncA type="table" tableValues="1 0" />
              </feComponentTransfer>
              <feOffset in="inv" dx="2.2" dy="2.2" result="shOff" />
              <feGaussianBlur in="shOff" stdDeviation="2.4" result="shBlur" />
              <feFlood floodColor="#3d4046" floodOpacity="0.42" />
              <feComposite in2="shBlur" operator="in" result="shade" />
              <feComposite in="shade" in2="SourceAlpha" operator="in" result="shadeIn" />
              <feMerge>
                <feMergeNode in="lip" />
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="shadeIn" />
              </feMerge>
            </filter>

            {/* The glow can only ever land on letter faces. The mask is a hair
                wider than the glyphs so the lit edge picks up a brighter lip. */}
            <mask id={`m${uid}`} maskUnits="userSpaceOnUse" x={vx} y={vy} width={vw} height={vh}>
              <use href={`#g${uid}`} fill="none" stroke="#fff" strokeWidth={STROKE + 4} />
            </mask>

            <radialGradient
              id={`r${uid}`}
              ref={gradRef}
              gradientUnits="userSpaceOnUse"
              cx={-9999}
              cy={-9999}
              fx={-9999}
              fy={-9999}
              r={r}
            >
              <stop offset="0" stopColor={core} />
              <stop offset="0.42" stopColor={core} />
              <stop offset="0.68" stopColor={mid} />
              <stop offset="0.9" stopColor={rim} stopOpacity="0.85" />
              <stop offset="1" stopColor={rim} stopOpacity="0" />
            </radialGradient>
          </defs>

          <g filter={`url(#f${uid})`}>
            <use href={`#g${uid}`} fill="none" stroke={face} strokeWidth={STROKE} />
          </g>

          <g ref={glowRef} style={{ opacity: 0 }} mask={`url(#m${uid})`}>
            <rect x={vx} y={vy} width={vw} height={vh} fill={`url(#r${uid})`} />
          </g>
        </svg>

        <span className="ewlf-legal">{legal}</span>
      </div>

      {/* Grain over everything, plate, letters and glow alike. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: GRAIN,
          mixBlendMode: "multiply",
          opacity: 0.32,
        }}
      />
      {/* Very faint horizontal brushed streaks. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, rgba(0,0,0,0.012) 1px 4px)",
        }}
      />
    </footer>
  );
}
