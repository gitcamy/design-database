import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";

// A scroll-driven field of image and UI cards floating in 3D depth behind a
// hero. As the page scrolls, every card slides away from the viewer along z.
// Cards are sharp only near a focus plane and blur in both directions from
// it, so the field reads like a camera with shallow depth of field pulling
// back through a cloud of photographs. Cards enter from in front of the lens
// (large, past the frame edges), pass through focus, then shrink toward the
// vanishing point, blur out and fade into the background. Depth wraps, so the
// field never runs dry however long the section is.
//
// Each card is turned on Y so its inner edge (the one nearest the centre line)
// leans away, which makes the cards read as panels around a corridor rather
// than flat stickers. Positions are seeded, so layout is stable across renders.
//
// The overlay (children) sits above the 3D scene and receives the scroll
// progress as the CSS variable --p (0 to 1), for staggered fades of headline
// lines and similar choreography in plain CSS.

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

const CSS = `
.dfcd { position: relative; }
.dfcd-sticky { position: sticky; top: 0; height: 100vh; overflow: hidden; }
.dfcd-view { position: absolute; inset: 0; z-index: 0; isolation: isolate; overflow: hidden; contain: strict; pointer-events: none; }
.dfcd-scene { position: absolute; inset: 0; transform-style: preserve-3d; }
.dfcd-card { position: absolute; left: 50%; top: 50%; transform-style: flat; will-change: transform, filter, opacity; backface-visibility: hidden; overflow: hidden; }
.dfcd-card > img, .dfcd-card > video { display: block; width: 100%; height: 100%; object-fit: cover; user-select: none; -webkit-user-drag: none; }
.dfcd-card.is-node { background: #fff; box-shadow: 0 1px 2px #0000000d, 0 8px 30px #0000000f; }
.dfcd-overlay { position: absolute; inset: 0; z-index: 1; pointer-events: none; transform: translateZ(0); }
.dfcd-overlay > * { pointer-events: auto; }
`;

function normalise(item) {
  if (item && typeof item === "object" && "node" in item) return { type: "node", ...item };
  if (typeof item === "string") return { src: item, type: VIDEO_EXT.test(item) ? "video" : "image" };
  return { type: VIDEO_EXT.test(item.src) ? "video" : "image", ...item };
}

// Card sizes and x/y spread are in design units at a 1440px wide stage and
// scale with the stage, so the composition holds from laptop to phone.
const DESIGN_WIDTH = 1440;

// Small deterministic PRNG so the layout is the same on every render.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export default function DepthFieldCardDrift({
  items = [],
  height = "300vh",
  perspective = 1000,
  depth = 3200,
  near = 420,
  travel = 1.1,
  focusZ = -60,
  focusDepth = 120,
  blurPerPx = 0.016,
  maxBlur = 14,
  farFade = 0.12,
  cardWidth = 210,
  widthJitter = 0.45,
  aspect = 0.72,
  tilt = 24,
  clearCenter = 0.4,
  radius = 14,
  seed = 7,
  background = "#F1EFE9",
  children,
  className = "",
  style,
}) {
  const rootRef = useRef(null);
  const stickyRef = useRef(null);
  const cardRefs = useRef([]);
  const scaleRef = useRef(0);

  const cards = useMemo(() => {
    const r = rng(seed);
    const list = items.map(normalise);
    const n = list.length;
    return list.map((item, i) => {
      // Alternate sides so each side stays populated; spread y over the full frame.
      const side = i % 2 === 0 ? -1 : 1;
      const nx = side * (clearCenter + r() * (1 - clearCenter));
      const ny = r() * 2 - 1;
      const w = cardWidth * (1 - widthJitter / 2 + r() * widthJitter);
      const a = item.aspect || aspect * (0.85 + r() * 0.3);
      // Even spacing in depth with jitter, so cards never clump on one plane.
      const z0 = ((i + r() * 0.6) / n) * depth;
      return { item, nx, ny, w, h: w / a, z0, rot: -side * tilt * (0.75 + r() * 0.5) };
    });
  }, [items, seed, clearCenter, cardWidth, widthJitter, aspect, depth, tilt]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const sticky = stickyRef.current;
    if (!root || !sticky) return;
    let raf = 0;
    let visible = true;
    scaleRef.current = 0;

    const frame = () => {
      raf = 0;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight;
      const span = Math.max(1, rect.height - vh);
      const p = clamp(-rect.top / span, 0, 1);
      sticky.style.setProperty("--p", p.toFixed(4));

      const W = sticky.clientWidth;
      const H = sticky.clientHeight;
      const k = Math.max(0.45, W / DESIGN_WIDTH);
      if (k !== scaleRef.current) {
        scaleRef.current = k;
        cards.forEach((c, i) => {
          const el = cardRefs.current[i];
          if (!el) return;
          el.style.width = `${(c.w * k).toFixed(1)}px`;
          if (c.item.type !== "node") el.style.height = `${(c.h * k).toFixed(1)}px`;
          else el.style.fontSize = `${(16 * k).toFixed(2)}px`;
        });
      }
      const far = near - depth;
      const shift = p * travel * depth;

      cards.forEach((c, i) => {
        const el = cardRefs.current[i];
        if (!el) return;
        // z runs from `near` (in front of the focus plane) down to `far`, then wraps.
        const u = (((c.z0 + shift) % depth) + depth) % depth;
        const z = near - u;
        const dist = Math.abs(z - focusZ);
        // maxBlur and blurPerPx are in screen pixels. CSS blur is applied before
        // projection, so scale it by the inverse of the perspective shrink.
        const screenBlur = Math.min(maxBlur, Math.max(0, dist - focusDepth) * blurPerPx);
        const blur = screenBlur * Math.max(0.2, (perspective - z) / perspective);
        // Fade in just after the wrap (in front of the lens) and out toward the far end.
        const fadeIn = smooth(near, near - 160, z);
        const fadeOut = 1 - smooth(far * farFade, far, z);
        const op = fadeIn * fadeOut;
        const x = c.nx * W * 0.5;
        const y = c.ny * H * 0.46;
        el.style.transform =
          `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${c.rot.toFixed(2)}deg)`;
        el.style.filter = blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : "none";
        el.style.opacity = op.toFixed(3);
        el.style.visibility = op < 0.01 ? "hidden" : "visible";
        el.style.zIndex = String(Math.round(z + depth));
        const vid = el.firstElementChild;
        if (vid && vid.tagName === "VIDEO") {
          if (op > 0.05 && vid.paused) vid.play().catch(() => {});
          else if (op <= 0.05 && !vid.paused) vid.pause();
        }
      });
    };

    const request = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; request(); });
    io.observe(root);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    frame();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [cards, perspective, depth, near, travel, focusZ, focusDepth, blurPerPx, maxBlur, farFade]);

  useEffect(() => { cardRefs.current.length = cards.length; }, [cards.length]);

  return (
    <section ref={rootRef} className={`dfcd ${className}`} style={{ height, background, ...style }}>
      <style>{CSS}</style>
      <div ref={stickyRef} className="dfcd-sticky" style={{ "--p": 0 }}>
        <div className="dfcd-view" style={{ perspective: `${perspective}px` }}>
        <div className="dfcd-scene">
          {cards.map((c, i) => (
            <div
              key={i}
              ref={(el) => (cardRefs.current[i] = el)}
              className={`dfcd-card${c.item.type === "node" ? " is-node" : ""}`}
              style={{ width: c.w, height: c.item.type === "node" ? "auto" : c.h, borderRadius: radius, opacity: 0 }}
            >
              {c.item.type === "node" ? (
                c.item.node
              ) : c.item.type === "video" ? (
                <video src={c.item.src} poster={c.item.poster} muted loop playsInline preload="metadata" />
              ) : (
                <img src={c.item.src} alt={c.item.alt || ""} loading="lazy" draggable={false} />
              )}
            </div>
          ))}
        </div>
        </div>
        {children && <div className="dfcd-overlay">{children}</div>}
      </div>
    </section>
  );
}
