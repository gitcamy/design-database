import React, { useEffect, useRef, useState } from "react";

// A rounded rectangle with independent corner radii, written as an SVG path.
// Corner order is [topLeft, topRight, bottomRight, bottomLeft]. Giving one
// corner a large radius and the rest a small one is how a tile bulges toward
// the centre of the mark.
function tile(x, y, w, h, [tl, tr, br, bl]) {
  const m = Math.min(w, h) / 2;
  const a = Math.min(tl, m);
  const b = Math.min(tr, m);
  const c = Math.min(br, m);
  const d = Math.min(bl, m);
  return [
    `M${x + a},${y}`,
    `H${x + w - b}`,
    `A${b},${b} 0 0 1 ${x + w},${y + b}`,
    `V${y + h - c}`,
    `A${c},${c} 0 0 1 ${x + w - c},${y + h}`,
    `H${x + d}`,
    `A${d},${d} 0 0 1 ${x},${y + h - d}`,
    `V${y + a}`,
    `A${a},${a} 0 0 1 ${x + a},${y}`,
    "Z",
  ].join(" ");
}

// A half disc sitting on its flat edge.
function dome(cx, baseY, r) {
  return `M${cx - r},${baseY} A${r},${r} 0 0 1 ${cx + r},${baseY} Z`;
}

// Five tiles on a 116 x 100 field. The gutters between them are the subject.
// Each tile turns one large radius toward the middle, and the dome bulges up
// from the bottom, so the space they leave closes into a four pointed star
// with concave sides. Nothing draws that star; it is only what is left over.
const MARK_VIEWBOX = "0 0 116 100";
const MARK_TILES = [
  tile(0, 0, 55, 47, [18, 5, 24, 5]),    // upper left, half round turned inward
  tile(61, 0, 55, 47, [5, 18, 5, 24]),   // upper right
  tile(0, 53, 38, 47, [24, 5, 5, 18]),   // lower left, set wider apart than the pair above
  tile(78, 53, 38, 47, [5, 24, 18, 5]),  // lower right
  dome(58, 100, 16),                      // bottom centre, closes the star from below
];

export default function NegativeSpaceMarkFooter({
  brand = "Megamind Labs",
  tagline = "Make it obvious.",
  links = ["Privacy Policy", "Terms of Service", "Cookie choices", "Contact"],
  socials = ["in", "X", "ig"],
  ground = "#A44604",
  ink = "#FDFBD2",
  markPaths = MARK_TILES,
  markViewBox = MARK_VIEWBOX,
  markWidth = 34,
  bandAspect = 2.03,
  axis = 39,
  flank = 31,
  margin = 5.5,
  disc = 3,
  breakpoint = 700,
  wordmarkFont = 'Georgia, "Times New Roman", serif',
  bodyFont = '"Helvetica Neue", Helvetica, Arial, sans-serif',
  className,
  style,
}) {
  const ref = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Seed from the current rect: a ResizeObserver's first callback is
    // delivered on a rendering step, which a hidden document may never reach.
    const r0 = el.getBoundingClientRect();
    if (r0.width) setW(r0.width);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = w > 0 && w < breakpoint;
  // Every size is derived from the container width, so the band holds its
  // proportions at any size, with floors so it stays readable on a phone.
  const px = (frac, floor = 0) => `${Math.max(floor, w * frac)}px`;
  const wordmarkSize = narrow ? px(0.085, 24) : px(0.034);
  const taglineSize = narrow ? px(0.045, 16) : px(0.026);
  const linkSize = narrow ? px(0.034, 13) : px(0.011);
  const discSize = narrow ? px(0.095, 34) : px(disc / 100);
  const pad = `${(narrow ? 8 : margin)}%`;

  const wordmarkEl = (
    <div style={{ fontFamily: wordmarkFont, fontSize: wordmarkSize, lineHeight: 1 }}>{brand}</div>
  );
  const taglineEl = (
    <div style={{ fontFamily: bodyFont, fontSize: taglineSize, fontWeight: 700, letterSpacing: "-0.01em" }}>
      {tagline}
    </div>
  );
  const markEl = (
    <svg
      viewBox={markViewBox}
      aria-hidden="true"
      style={{ width: "100%", display: "block" }}
    >
      {markPaths.map((d, i) => (
        <path key={i} d={d} fill={ink} />
      ))}
    </svg>
  );

  const utility = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: narrow ? "center" : "space-between",
        flexDirection: narrow ? "column" : "row",
        gap: narrow ? px(0.06, 20) : px(0.04),
        flexWrap: "wrap",
        fontFamily: bodyFont,
      }}
    >
      <nav style={{ display: "flex", gap: narrow ? px(0.045, 16) : px(0.03), flexWrap: "wrap", justifyContent: "center" }}>
        {links.map((l) => (
          <a key={l} href="#" style={{ color: ink, textDecoration: "none", fontSize: linkSize, fontWeight: 500 }}>
            {l}
          </a>
        ))}
      </nav>
      <div style={{ display: "flex", gap: narrow ? px(0.035, 12) : px((disc * 0.55) / 100) }}>
        {socials.map((s) => (
          <span
            key={s}
            style={{
              width: discSize,
              height: discSize,
              borderRadius: "999px",
              background: ink,
              color: ground,
              display: "grid",
              placeItems: "center",
              fontSize: narrow ? px(0.04, 14) : px((disc * 0.42) / 100),
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );

  const shell = {
    position: "relative",
    width: "100%",
    boxSizing: "border-box",
    background: ground,
    color: ink,
    overflow: "hidden",
    ...style,
  };

  if (narrow) {
    // Stacked: the lockup cannot hold one axis at phone width, so it becomes
    // a column. The mark, the two colours and the mechanic are unchanged.
    return (
      <footer ref={ref} className={className} style={{ ...shell, padding: `${pad} ${pad} ${pad}` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: px(0.06, 20), textAlign: "center" }}>
          <div style={{ width: "58%" }}>{markEl}</div>
          {wordmarkEl}
          {taglineEl}
          <div style={{ width: "100%", marginTop: px(0.05, 16) }}>{utility}</div>
        </div>
      </footer>
    );
  }

  const centred = (leftPct) => ({
    position: "absolute",
    left: `${leftPct}%`,
    top: `${axis}%`,
    transform: "translate(-50%, -50%)",
    whiteSpace: "nowrap",
  });

  return (
    <footer ref={ref} className={className} style={{ ...shell, aspectRatio: String(bandAspect) }}>
      <div style={centred(50 - flank)}>{wordmarkEl}</div>
      <div style={{ ...centred(50), width: `${markWidth}%` }}>{markEl}</div>
      <div style={centred(50 + flank)}>{taglineEl}</div>
      <div style={{ position: "absolute", left: pad, right: pad, bottom: pad }}>{utility}</div>
    </footer>
  );
}
