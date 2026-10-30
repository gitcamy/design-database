import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// An endless stream of image and video cards that leaves a dark strip at the
// vanishing point, splits left and right, and sweeps outward past the edges.
// Each card is about 1.5x taller than the one before it and turns further
// from the viewer, so the two streams read as walls bending toward you.
//
// This is not a 3D camera: a single perspective cannot make every step grow
// by the same ratio while the cards stay edge to edge. Instead each card has a
// continuous slot position u, height grows geometrically with u, the visible
// width shrinks as the card turns, and the card is mapped onto that trapezoid
// with a perspective-correct matrix3d. Neighbours share an edge by
// construction.
//
// Lengths are in design units: pixels at a 1200px wide stage.

const DESIGN_WIDTH = 1200;
const BASE = 400; // card element size before mapping, so media stays sharp
const STEP = 0.01;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

const CSS = `
.imc { position: relative; overflow: hidden; isolation: isolate; }
.imc-stage { position: absolute; left: 50%; width: 0; height: 0; pointer-events: none; }
.imc-card, .imc-strip { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform, opacity; }
.imc-card { overflow: hidden; background: #1a1a1a; }
.imc-card > img, .imc-card > video { display: block; width: 100%; height: 100%; object-fit: cover; user-select: none; -webkit-user-drag: none; }
.imc-overlay { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.imc-overlay > * { pointer-events: auto; }
`;

function normalise(item) {
  if (typeof item === "string") return { src: item, type: VIDEO_EXT.test(item) ? "video" : "image" };
  return { type: VIDEO_EXT.test(item.src) ? "video" : "image", ...item };
}

const mod = (a, n) => ((a % n) + n) % n;

// Slot boundaries u from -strip (the centre seam) outward. Inside the strip
// cards are flat and equal; past it height grows by `growth` per slot and the
// facing term cos(turn) decays, which narrows each card's visible width.
function buildTable(g) {
  const h = [];
  const x = [];
  let X = g.seam / 2;
  for (let i = 0; ; i++) {
    const u = -g.strip + i * STEP;
    const hu = u <= 0 ? g.cardHeight : g.cardHeight * Math.pow(g.growth, u);
    h.push(hu);
    x.push(X);
    if (X > DESIGN_WIDTH / 2 + 40 || i > 4000) break;
    const facing = u <= 0 ? 1 : Math.max(g.minFacing, Math.exp(-g.turn * u));
    X += hu * g.aspect * facing * STEP;
  }
  const at = (arr, u) => {
    const f = (u + g.strip) / STEP;
    if (f <= 0) return arr[0];
    const i = Math.floor(f);
    if (i >= arr.length - 1) return arr[arr.length - 1] + (f - arr.length + 1) * (arr[arr.length - 1] - arr[arr.length - 2]);
    return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
  };
  return { h: (u) => at(h, u), x: (u) => at(x, u), end: (x.length - 1) * STEP - g.strip };
}

// matrix3d that maps a w x h element onto quad p0..p3 (TL, TR, BR, BL).
function quad(w, h, p) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = p;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const k = (dx1 * dy3 - dx3 * dy1) / det;
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3;
  const d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${k / h},0,0,1,0,${x0},${y0},0,1)`;
}

export default function InfiniteMediaCorridor({
  items = [],
  secondsPerCard = 0.62,
  direction = 1,
  stripCards = 2,
  cardHeight = 62,
  aspect = 1,
  growth = 1.52,
  turn = 0.33,
  minFacing = 0.22,
  gap = 0.05,
  seam = 6,
  radius = 0.05,
  stripColor = "#0B0B0B",
  stripPadding = 8,
  horizon = 0.5,
  minScaleWidth = 720,
  aspectRatio = "12 / 5",
  minHeight = 300,
  background = "transparent",
  pauseOnHover = false,
  paused = false,
  children,
  className,
  style,
}) {
  const rootRef = useRef(null);
  const stripRef = useRef(null);
  const cardRefs = useRef([]);
  const mediaRefs = useRef([]);
  const cycles = useRef([]);
  const shown = useRef([]);
  const geo = useRef(null);
  const state = useRef({ offset: 0, hover: false, inView: true });
  const [width, setWidth] = useState(0);
  const [, bump] = useState(0);

  const media = items.map(normalise);
  const opts = useRef({});
  opts.current = { secondsPerCard, direction, pauseOnHover, paused };

  const table = buildTable({ strip: stripCards, cardHeight, aspect, growth, turn, minFacing, seam });
  // Enough slots to cover the seam to the edge, plus one entering and one leaving.
  const slots = Math.ceil(table.end + stripCards) + 2;
  const W = BASE * aspect;
  geo.current = { table, slots, k: Math.max(width, minScaleWidth) / DESIGN_WIDTH, width };

  const paint = () => {
    const G = geo.current;
    if (!G || !G.width) return;
    const { table: T, slots: n, k } = G;
    const { offset } = state.current;
    const half = G.width / 2;
    let changed = false;

    if (stripRef.current) {
      const sx = T.x(0) * k + stripPadding * k;
      const sh = cardHeight * k + stripPadding * 2 * k;
      const el = stripRef.current;
      el.style.width = `${sx * 2}px`;
      el.style.height = `${sh}px`;
      el.style.borderRadius = `${radius * cardHeight * 2 * k}px`;
      el.style.transform = `translate(${-sx}px, ${-sh / 2}px)`;
    }

    for (let side = 0; side < 2; side++) {
      const m = side === 0 ? -1 : 1;
      for (let j = 0; j < n; j++) {
        const id = side * n + j;
        const el = cardRefs.current[id];
        if (!el) continue;
        const total = offset + j;
        const cycle = Math.floor(total / n);
        if (cycles.current[id] !== cycle) {
          cycles.current[id] = cycle;
          changed = true;
        }
        const u = total - cycle * n - stripCards;
        const hi = T.h(u) * k;
        const ho = T.h(u + 1) * k;
        const xi = (T.x(u) + (gap * T.h(u)) / 2) * k;
        const xo = (T.x(u + 1) - (gap * T.h(u + 1)) / 2) * k;
        const visible = xi < half && xo > xi;
        if (visible) {
          // Inner edge toward the seam, outer edge toward the viewport edge.
          const p =
            m > 0
              ? [xi, -hi / 2, xo, -ho / 2, xo, ho / 2, xi, hi / 2]
              : [-xo, -ho / 2, -xi, -hi / 2, -xi, hi / 2, -xo, ho / 2];
          el.style.transform = quad(W, BASE, p);
          el.style.opacity = String(Math.min(1, (u + stripCards) / 0.6));
        }
        if (shown.current[id] !== visible) {
          shown.current[id] = visible;
          el.style.visibility = visible ? "visible" : "hidden";
          const v = mediaRefs.current[id];
          if (v && v.tagName === "VIDEO") {
            if (visible) v.play().catch(() => {});
            else v.pause();
          }
        }
      }
    }
    if (changed) bump((c) => c + 1);
  };

  useLayoutEffect(() => {
    paint();
  });

  useEffect(() => {
    const root = rootRef.current;
    const ro = new ResizeObserver(() => setWidth(root.clientWidth));
    ro.observe(root);
    const io = new IntersectionObserver(([e]) => (state.current.inView = e.isIntersecting));
    io.observe(root);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const o = opts.current;
      const st = state.current;
      if (!st.inView || o.paused || reduce.matches || (o.pauseOnHover && st.hover)) return;
      st.offset += (dt / o.secondsPerCard) * (o.direction < 0 ? -1 : 1);
      paint();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // Slot j on cycle c is the (c * slots - j)th card to leave the seam, per side.
  // Sides alternate through the list so the two streams never mirror each other.
  const pick = (side, j) => {
    if (!media.length) return null;
    const c = cycles.current[side * slots + j] ?? 0;
    return media[mod(2 * (c * slots - j) + side, media.length)];
  };

  const cards = [];
  for (let side = 0; side < 2 && width; side++) {
    for (let j = 0; j < slots; j++) {
      const id = side * slots + j;
      const m = pick(side, j);
      cards.push(
        <div
          key={id}
          ref={(el) => (cardRefs.current[id] = el)}
          className="imc-card"
          style={{ width: W, height: BASE, borderRadius: radius * BASE, visibility: "hidden" }}
        >
          {m &&
            (m.type === "video" ? (
              <video
                key={m.src}
                ref={(el) => (mediaRefs.current[id] = el)}
                src={m.src}
                poster={m.poster}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
              />
            ) : (
              <img
                key={m.src}
                ref={(el) => (mediaRefs.current[id] = el)}
                src={m.src}
                alt={m.alt ?? ""}
                decoding="async"
                draggable={false}
              />
            ))}
        </div>
      );
    }
  }

  return (
    <section
      ref={rootRef}
      className={["imc", className].filter(Boolean).join(" ")}
      style={{ aspectRatio, minHeight, background, ...style }}
      onPointerEnter={() => (state.current.hover = true)}
      onPointerLeave={() => (state.current.hover = false)}
    >
      <style>{CSS}</style>
      <div className="imc-stage" style={{ top: `${horizon * 100}%` }} aria-hidden>
        {stripColor && <div ref={stripRef} className="imc-strip" style={{ background: stripColor }} />}
        {cards}
      </div>
      {children && <div className="imc-overlay">{children}</div>}
    </section>
  );
}
