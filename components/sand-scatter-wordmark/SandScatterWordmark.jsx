import React, { useEffect, useRef } from "react";

// A wordmark drawn from thousands of sand grains. The cursor blows the grains
// within a soft radius outward into a pale haze, and a damped spring pulls
// each one back to its home position once the cursor moves on. On mount the
// grains start as wavy concentric rings, like raked sand, and settle into the
// letters.

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export default function SandScatterWordmark({
  text = "Megamind Labs",
  font = '"Archivo Black", "Arial Black", system-ui, sans-serif',
  fontWeight = 900,
  width = 70,
  count = 40000,
  radius = 0.6,
  push = 1,
  colorLow = "#C9962E",
  colorHigh = "#F0CF7A",
  background = "#FDFDFD",
  intro = true,
  stiffness = 0.06,
  damping = 0.88,
  label,
  className,
  style,
  children,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lo = hexToRgb(colorLow);
    const hi = hexToRgb(colorHigh);

    let raf = 0;
    let disposed = false;
    let firstBuild = true;
    let P = null; // particle state
    let W = 0, H = 0, dpr = 1, R = 100, img = null;
    let introStart = 0, introOn = false, lastT = 0;
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, on: false, t: 0 };

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth;
      if (!W) return;

      // Fit the text to `width`% of the container.
      const m = document.createElement("canvas").getContext("2d");
      m.font = `${fontWeight} 100px ${font}`;
      const probe = m.measureText(text);
      const size = (100 * (W * width) / 100) / Math.max(1, probe.width);
      m.font = `${fontWeight} ${size}px ${font}`;
      const tm = m.measureText(text);
      const ascent = tm.actualBoundingBoxAscent;
      const descent = tm.actualBoundingBoxDescent;
      const capH = m.measureText("H").actualBoundingBoxAscent;
      const textH = ascent + descent;
      const pad = capH * 0.8;
      H = Math.ceil(textH + pad * 2);
      R = capH * radius;

      // Rasterise the glyphs and collect the filled pixels.
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const o = off.getContext("2d");
      o.font = `${fontWeight} ${size}px ${font}`;
      o.textBaseline = "alphabetic";
      const x0 = (W - tm.width) / 2;
      const base = pad + ascent;
      o.fillText(text, x0, base);
      const a = o.getImageData(0, 0, W, H).data;
      const cand = [];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (a[(y * W + x) * 4 + 3] < 128) continue;
          cand.push(x, y);
          // Grains collect a little more densely along top edges.
          const above = y >= 2 ? a[((y - 2) * W + x) * 4 + 3] : 0;
          if (above < 128) cand.push(x, y, x, y);
        }
      }
      const nC = cand.length / 2;
      if (!nC) return;

      const n = count;
      const p = {
        n,
        hx: new Float32Array(n), hy: new Float32Array(n),
        x: new Float32Array(n), y: new Float32Array(n),
        vx: new Float32Array(n), vy: new Float32Array(n),
        sx: new Float32Array(n), sy: new Float32Array(n), // intro start
        delay: new Float32Array(n),
        k: new Float32Array(n), // per-grain push multiplier
        s: new Uint8Array(n), // size in device px
        a: new Float32Array(n), // base alpha
        r: new Uint8Array(n), g: new Uint8Array(n), b: new Uint8Array(n),
      };

      // Intro rings: wavy concentric ellipses around the wordmark centre.
      const cx = W / 2, cy = pad + textH / 2;
      const ea = Math.min(W / 2, tm.width * 0.65);
      const eb = Math.min(ea * 0.45, (H / 2) * 0.9);
      const RINGS = 7;

      for (let i = 0; i < n; i++) {
        const c = (Math.random() * nC) | 0;
        const hx = cand[c * 2] + Math.random();
        const hy = cand[c * 2 + 1] + Math.random();
        p.hx[i] = hx; p.hy[i] = hy;

        const ring = 1 + ((Math.random() * RINGS) | 0);
        const th = Math.random() * Math.PI * 2;
        const wob = 1 + 0.07 * Math.sin(th * 6 + ring * 1.7) + 0.04 * Math.sin(th * 11 - ring);
        const rr = (ring / RINGS) * wob + (Math.random() - 0.5) * 0.025;
        p.sx[i] = cx + Math.cos(th) * ea * rr;
        p.sy[i] = cy + Math.sin(th) * eb * rr;
        p.delay[i] = Math.random() * 0.25;

        p.k[i] = 0.4 + Math.random();
        const sz = 1 + Math.random(); // 1 to 2 CSS px
        p.s[i] = Math.max(1, Math.round(sz * dpr));
        p.a[i] = 0.5 + Math.random() * 0.5;
        const t = Math.random();
        p.r[i] = lo[0] + (hi[0] - lo[0]) * t;
        p.g[i] = lo[1] + (hi[1] - lo[1]) * t;
        p.b[i] = lo[2] + (hi[2] - lo[2]) * t;
      }

      const playIntro = intro && firstBuild && !reduced;
      for (let i = 0; i < n; i++) {
        p.x[i] = playIntro ? p.sx[i] : p.hx[i];
        p.y[i] = playIntro ? p.sy[i] : p.hy[i];
      }
      firstBuild = false;
      P = p;
      introOn = playIntro;
      introStart = performance.now();

      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.height = H + "px";
      img = ctx.createImageData(canvas.width, canvas.height);
      wake();
    };

    // Composite every grain straight into an ImageData buffer.
    const draw = (fadeAll) => {
      const d = img.data;
      d.fill(0);
      const cw = canvas.width, ch = canvas.height;
      const p = P;
      const fadeDist = R * 1.2;
      for (let i = 0; i < p.n; i++) {
        const dx = p.x[i] - p.hx[i], dy = p.y[i] - p.hy[i];
        const disp = Math.sqrt(dx * dx + dy * dy);
        let al = p.a[i] * (1 - Math.min(1, disp / fadeDist) * 0.6) * fadeAll;
        if (al <= 0.01) continue;
        const s = p.s[i];
        const px = (p.x[i] * dpr) | 0, py = (p.y[i] * dpr) | 0;
        const r = p.r[i], g = p.g[i], b = p.b[i];
        for (let yy = 0; yy < s; yy++) {
          const Y = py + yy;
          if (Y < 0 || Y >= ch) continue;
          for (let xx = 0; xx < s; xx++) {
            // Knock the corners off larger grains so they read round.
            if (s >= 3 && (yy === 0 || yy === s - 1) && (xx === 0 || xx === s - 1)) continue;
            const X = px + xx;
            if (X < 0 || X >= cw) continue;
            const j = (Y * cw + X) * 4;
            const da = d[j + 3] / 255;
            const na = al + da * (1 - al);
            const w = al / na;
            d[j] += (r - d[j]) * w;
            d[j + 1] += (g - d[j + 1]) * w;
            d[j + 2] += (b - d[j + 2]) * w;
            d[j + 3] = na * 255;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    const INTRO_FADE = 0.4, INTRO_MOVE = 1.2;

    const tick = (now) => {
      raf = 0;
      if (disposed || !P) return;
      const p = P;
      let fadeAll = 1;
      let moving = false;

      if (introOn) {
        const t = (now - introStart) / 1000;
        fadeAll = Math.min(1, t / INTRO_FADE) * 0.5 + (t > INTRO_FADE ? 0.5 * Math.min(1, (t - INTRO_FADE) / 0.6) : 0);
        for (let i = 0; i < p.n; i++) {
          const u = Math.max(0, Math.min(1, (t - INTRO_FADE - p.delay[i]) / INTRO_MOVE));
          const e = easeOutCubic(u);
          p.x[i] = p.sx[i] + (p.hx[i] - p.sx[i]) * e;
          p.y[i] = p.sy[i] + (p.hy[i] - p.sy[i]) * e;
        }
        if (t >= INTRO_FADE + INTRO_MOVE + 0.25) introOn = false;
        moving = true;
      } else {
        const R2 = R * R;
        // Fixed 60Hz physics steps, so the feel is the same on 120Hz screens.
        const steps = lastT ? Math.max(1, Math.min(4, Math.round((now - lastT) / 16.667))) : 1;
        let maxV = 0;
        for (let st = 0; st < steps; st++) {
          const pv = pointer.on ? Math.min(40, Math.hypot(pointer.vx, pointer.vy)) : 0;
          maxV = 0;
          for (let i = 0; i < p.n; i++) {
            let vx = p.vx[i], vy = p.vy[i];
            let tx = p.hx[i], ty = p.hy[i], kk = stiffness;
            if (pointer.on) {
              // Grains whose home lies inside the radius are sent to a point
              // pushed out to (roughly) the rim. The per-grain multiplier makes
              // some land past the rim, which is the pale haze.
              const hx = p.hx[i] - pointer.x, hy = p.hy[i] - pointer.y;
              const h2 = hx * hx + hy * hy;
              if (h2 < R2) {
                const hd = Math.sqrt(h2) || 1;
                const reach = R * (0.3 + 0.95 * p.k[i] * p.k[i]) * push;
                if (reach > hd) {
                  tx = pointer.x + (hx / hd) * reach;
                  ty = pointer.y + (hy / hd) * reach;
                  kk = stiffness * 2.5;
                }
              }
              // A fast swipe drags grains under the pointer along with it.
              if (pv > 2) {
                const dx = p.x[i] - pointer.x, dy = p.y[i] - pointer.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < R2) {
                  const f = 1 - Math.sqrt(d2) / R;
                  vx += pointer.vx * 0.08 * f * p.k[i] + (Math.random() - 0.5) * f;
                  vy += pointer.vy * 0.08 * f * p.k[i] + (Math.random() - 0.5) * f;
                }
              }
            }
            vx += (tx - p.x[i]) * kk;
            vy += (ty - p.y[i]) * kk;
            vx *= damping;
            vy *= damping;
            p.x[i] += vx;
            p.y[i] += vy;
            p.vx[i] = vx;
            p.vy[i] = vy;
            const av = Math.abs(vx) + Math.abs(vy) + Math.abs(p.hx[i] - p.x[i]) + Math.abs(p.hy[i] - p.y[i]);
            if (av > maxV) maxV = av;
          }
          pointer.vx *= 0.5;
          pointer.vy *= 0.5;
        }
        moving = pointer.on || maxV > 0.05;
      }

      lastT = now;
      draw(fadeAll);
      if (moving) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || disposed) return;
      lastT = 0;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (pointer.on) {
        pointer.vx = x - pointer.x;
        pointer.vy = y - pointer.y;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.on = true;
      wake();
    };
    const onLeave = () => {
      pointer.on = false;
      wake();
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointercancel", onLeave);

    let lastW = 0;
    const ro = new ResizeObserver(() => {
      if (wrap.clientWidth !== lastW) {
        lastW = wrap.clientWidth;
        build();
      }
    });

    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      if (disposed) return;
      lastW = wrap.clientWidth;
      build();
      ro.observe(wrap);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointercancel", onLeave);
    };
  }, [text, font, fontWeight, width, count, radius, push, colorLow, colorHigh, intro, stiffness, damping]);

  return (
    <div ref={wrapRef} className={className} style={{ background, width: "100%", ...style }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label ?? text}
        style={{ display: "block", width: "100%", touchAction: "pan-y" }}
      />
      {children}
    </div>
  );
}
