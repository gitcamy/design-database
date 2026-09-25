import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Easing fitted to the reference: progress^0.6. Fast off the mark, long settle.
// Measured against the source frames at 0.077, 0.31, 0.62 and 0.92 of the open.
const openEase = (p) => Math.pow(Math.min(Math.max(p, 0), 1), 0.6);
const lerp = (a, b, t) => a + (b - a) * t;

// Drawn when no `image` is given, so the component runs with no asset.
// A dark field, a bright limb arc, and one warm glow: enough tonal range for
// the mosaic to read.
function paintFallback(w, h, card, warm, cool) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");

  // Sky.
  g.fillStyle = card;
  g.fillRect(0, 0, w, h);

  // A curved body filling the lower frame. The radii are deliberately close to
  // the frame size so the curvature is visible across the width.
  const cx = w * 0.5;
  const cy = h * 1.18;
  const rx = w * 0.62;
  const ry = h * 0.62;

  // Warm light sitting just above the horizon, offset from centre.
  const glow = g.createRadialGradient(w * 0.56, h * 0.58, 0, w * 0.56, h * 0.58, w * 0.4);
  glow.addColorStop(0, warm);
  glow.addColorStop(0.3, "rgba(131,102,89,0.42)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);

  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.clip();

  const body = g.createLinearGradient(0, h * 0.5, 0, h);
  body.addColorStop(0, cool);
  body.addColorStop(0.25, "rgba(50,67,80,0.9)");
  body.addColorStop(0.7, "rgba(18,24,30,0.95)");
  body.addColorStop(1, card);
  g.fillStyle = body;
  g.fillRect(0, 0, w, h);

  g.restore();

  // Atmosphere: a soft band hugging the top of the arc rather than a hard stroke.
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
  g.lineWidth = Math.max(6, h * 0.05);
  g.strokeStyle = "rgba(150,180,210,0.30)";
  g.filter = "blur(" + Math.max(4, h * 0.018) + "px)";
  g.stroke();
  g.filter = "none";
  g.lineWidth = Math.max(1.5, h * 0.006);
  g.strokeStyle = "rgba(205,220,235,0.6)";
  g.stroke();
  g.restore();

  return c;
}

export default function MosaicHeroOpen({
  brand = "Megamind Labs",
  mark = "•",
  headline = ["Design that opens", "on arrival."],
  paragraph = "A short supporting line that runs to about three lines at desktop width, long enough to sit as a block against the corner of the frame.",
  cta = "Start a project",
  image = null,
  cell = 19,
  seedWidth = 170,
  seedHeight = 90,
  openDuration = 1.3,
  radius = 20,
  inset = 8,
  bg = "#FFFFFF",
  card = "#0A0B0A",
  ink = "#FDFDFC",
  warm = "#836659",
  cool = "#5D6B7A",
  zoomRate = 0.027,
  zoomMax = 1.3,
  height = "100vh",
  autoPlay = true,
  className,
  style,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState(autoPlay ? 0 : 1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Seed from the current rect. A ResizeObserver's first callback is delivered
    // on a rendering step, which a backgrounded or hidden document may never
    // reach, and the component would then never start.
    const r0 = el.getBoundingClientRect();
    if (r0.width && r0.height) setBox({ w: r0.width, h: r0.height });

    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Source pixels: either the supplied image or the procedural fallback.
  useEffect(() => {
    if (!image) {
      sourceRef.current = paintFallback(1200, 660, card, warm, cool);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      sourceRef.current = img;
    };
    img.src = image;
  }, [image, card, warm, cool]);

  // One mosaic pass. The cell grid is sized in SCREEN space, so growing the
  // card adds cells instead of enlarging them. That is the whole effect.
  const draw = useCallback(
    (cardW, cardH, zoom) => {
      const cv = canvasRef.current;
      const src = sourceRef.current;
      if (!cv || !src || cardW < 1 || cardH < 1) return;

      const dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(cardW * dpr) || cv.height !== Math.round(cardH * dpr)) {
        cv.width = Math.round(cardW * dpr);
        cv.height = Math.round(cardH * dpr);
      }
      const ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = card;
      ctx.fillRect(0, 0, cardW, cardH);

      const cols = Math.max(1, Math.ceil(cardW / cell));
      const rows = Math.max(1, Math.ceil(cardH / cell));

      // Cover-fit the source to the card, then zoom in around the centre.
      const sw = src.width;
      const sh = src.height;
      const scale = Math.max(cardW / sw, cardH / sh) * zoom;
      const vw = cardW / scale;
      const vh = cardH / scale;
      const sx = (sw - vw) / 2;
      const sy = (sh - vh) / 2;

      // Downsample to one pixel per cell and let the browser do the averaging.
      const tiny = document.createElement("canvas");
      tiny.width = cols;
      tiny.height = rows;
      const tctx = tiny.getContext("2d");
      tctx.imageSmoothingEnabled = true;
      tctx.drawImage(src, sx, sy, vw, vh, 0, 0, cols, rows);
      const data = tctx.getImageData(0, 0, cols, rows).data;

      // Paint each cell as a flat square with a 1px seam.
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          ctx.fillStyle = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
          ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
        }
      }
    },
    [card, cell]
  );

  useEffect(() => {
    if (!box.w || !box.h) return;

    const targetW = box.w - inset * 2;
    const targetH = box.h - inset * 2;

    const frame = (now) => {
      if (!startRef.current) startRef.current = now;
      const t = (now - startRef.current) / 1000;
      const p = autoPlay ? openEase(t / openDuration) : 1;

      const w = lerp(seedWidth, targetW, p);
      const h = lerp(seedHeight, targetH, p);
      const r = lerp(Math.min(seedWidth, seedHeight) / 2, radius, p);

      const el = canvasRef.current?.parentElement;
      if (el) {
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        el.style.borderRadius = `${r}px`;
      }

      const settled = Math.max(0, t - openDuration);
      const zoom = Math.min(zoomMax, 1 + settled * zoomRate);
      draw(w, h, zoom);

      if (p >= 1 && phase === 0) setPhase(1);
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [box.w, box.h, inset, seedWidth, seedHeight, openDuration, radius, draw, zoomRate, zoomMax, autoPlay, phase]);

  const entered = phase === 1;
  const enter = (delay, shift = 8) => ({
    opacity: entered ? 1 : 0,
    transform: entered ? "translateY(0)" : `translateY(${shift}px)`,
    transition: `opacity 420ms ease ${delay}ms, transform 420ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  });

  const lines = useMemo(() => (Array.isArray(headline) ? headline : [headline]), [headline]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: "relative", width: "100%", height, background: bg, overflow: "hidden", ...style }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: seedWidth,
          height: seedHeight,
          borderRadius: seedHeight / 2,
          overflow: "hidden",
          background: card,
          willChange: "width, height, border-radius",
        }}
      >
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "clamp(20px, 2.4vw, 35px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: ink,
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            pointerEvents: entered ? "auto" : "none",
          }}
        >
          <div style={{ ...enter(0, 4), fontSize: 15, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>
            <span style={{ marginRight: 6 }}>{mark}</span>
            {brand}
          </div>

          <div style={{ marginTop: "auto", marginBottom: "auto" }}>
            {lines.map((line, i) => (
              <div key={i} style={{ overflow: "hidden" }}>
                <div
                  style={{
                    transform: entered ? "translateY(0)" : "translateY(105%)",
                    transition: `transform 620ms cubic-bezier(0.22,1,0.36,1) ${200 + i * 200}ms`,
                    fontSize: "clamp(40px, 6.6vw, 96px)",
                    lineHeight: 1.04,
                    letterSpacing: "-0.02em",
                    fontWeight: 500,
                  }}
                >
                  {line}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <p style={{ ...enter(620), margin: 0, flex: "1 1 260px", maxWidth: "34ch", fontSize: 15, lineHeight: 1.55, opacity: entered ? 0.92 : 0 }}>
              {paragraph}
            </p>
            <div style={{ ...enter(760), display: "flex", alignItems: "center", gap: 14, flexShrink: 0, marginLeft: "auto" }}>
              <span
                style={{
                  background: ink,
                  color: card,
                  borderRadius: 999,
                  padding: "13px 22px",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {cta}
              </span>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: `1px solid ${ink}55`,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                }}
              >
                {"→"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
