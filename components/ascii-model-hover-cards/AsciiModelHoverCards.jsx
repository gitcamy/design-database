import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// A row of square cards. Behind each card's text sits a 3D object rendered
// live as monospace ASCII in one flat tint. Hovering a card lightens its
// surface and swaps the bracketed CTA for a filled button, while the object
// is pushed away from the cursor like a magnet meeting a matching pole. Text, card size and glyph tint never change.

const DEFAULT_RAMP = " .,:;-_+*=!|0123456789$#@";

// ---------------------------------------------------------------------------
// Built-in models. Each returns a THREE.Object3D centred on the origin and
// roughly 2 units tall. Set userData.repelParts on the returned object to make
// each direct child repel the cursor independently. Pass your own `model` function to use anything else.
// ---------------------------------------------------------------------------
const PRESETS = {
  trophy(T) {
    const pts = [
      [0, -1.15], [0.62, -1.15], [0.62, -1.0], [0.42, -0.92], [0.4, -0.82],
      [0.14, -0.7], [0.11, -0.2], [0.18, -0.08], [0.62, 0.12], [0.78, 0.5],
      [0.82, 0.95], [0.74, 0.98], [0.68, 0.6], [0.5, 0.3], [0, 0.22],
    ].map(([x, y]) => new T.Vector2(x, y));
    const g = new T.Group();
    g.add(new T.Mesh(new T.LatheGeometry(pts, 48), mat(T)));
    for (const s of [-1, 1]) {
      const handle = new T.Mesh(new T.TorusGeometry(0.28, 0.06, 12, 32, Math.PI * 1.2), mat(T));
      handle.position.set(s * 0.8, 0.55, 0);
      handle.rotation.z = s > 0 ? -Math.PI * 0.6 : Math.PI * 1.6;
      g.add(handle);
    }
    return g;
  },
  coins(T) {
    const g = new T.Group();
    const spots = [
      [-0.95, 0.75, 0.2, 0.9, 0.3],
      [0.85, 0.15, -0.3, -0.5, 1.1],
      [-0.4, -0.85, 0.1, 1.3, -0.4],
    ];
    for (const [x, y, z, rx, rz] of spots) {
      const coin = new T.Group();
      coin.add(new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 0.12, 64), mat(T)));
      const rim = new T.Mesh(new T.TorusGeometry(0.56, 0.035, 8, 64), mat(T));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.07;
      coin.add(rim);
      coin.position.set(x, y, z);
      coin.rotation.set(rx, 0, rz);
      g.add(coin);
    }
    g.userData.repelParts = true; // each coin flees the cursor on its own
    return g;
  },
  knot(T) {
    return new T.Mesh(new T.TorusKnotGeometry(0.75, 0.26, 200, 24, 2, 3), mat(T));
  },
};

function mat(T) {
  return new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.1 });
}

// One small WebGL renderer shared by every card. Each card renders its scene
// into a render target the size of its glyph grid, then reads the pixels back.
let shared = null;
function getRenderer() {
  if (shared) return shared;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: false });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  shared = renderer;
  return renderer;
}

function AsciiCard({ card, ramp, cellSize, bg, hoverBg, border, accent, strength, radius, displayFont, monoFont, reducedMotion }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const [hot, setHot] = useState(false);
  const hotRef = useRef(false);
  const pointerRef = useRef(null);
  hotRef.current = hot;

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    const renderer = getRenderer();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(2.5, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.9);
    rim.position.set(-3, -1, -2);
    scene.add(rim);

    const pivot = new THREE.Group();
    const restY = card.restRotation ?? -0.5;
    const restX = card.restTilt ?? 0.12;
    pivot.rotation.set(restX, restY, 0);
    pivot.scale.setScalar(card.scale ?? 1.25);
    if (card.offset) pivot.position.set(card.offset[0] || 0, card.offset[1] || 0, 0);
    scene.add(pivot);

    const build = typeof card.model === "function" ? card.model : PRESETS[card.model] || PRESETS.knot;
    // Bodies are what the cursor pushes. A model can opt into per-part
    // repulsion (each direct child flees on its own) with userData.repelParts.
    const bodies = [];
    const addBody = (o) => bodies.push({
      o, p0: o.position.clone(), r0: o.rotation.clone(),
      off: new THREE.Vector2(), vel: new THREE.Vector2(),
      rot: new THREE.Vector2(), rotVel: new THREE.Vector2(),
    });
    Promise.resolve(build(THREE)).then((obj) => {
      if (disposed || !obj) return;
      pivot.add(obj);
      if (obj.userData.repelParts) obj.children.forEach(addBody);
      else addBody(pivot);
      kick();
    });

    let cols = 0, rows = 0, target = null, buf = null, cw = 0, ch = 0, dpr = 1;
    const ctx = canvas.current.getContext("2d");
    const cellW = cellSize;
    const cellH = Math.round(cellSize * 1.65);

    function resize() {
      const r = wrap.current.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = r.width; ch = r.height;
      canvas.current.width = Math.round(cw * dpr);
      canvas.current.height = Math.round(ch * dpr);
      cols = Math.max(8, Math.floor(cw / cellW));
      rows = Math.max(8, Math.floor(ch / cellH));
      // Render at the glyph grid's own aspect so the object is not stretched.
      camera.aspect = (cols * cellW) / (rows * cellH);
      camera.updateProjectionMatrix();
      target?.dispose();
      // Taller than the grid by the cell aspect, then sampled per cell.
      target = new THREE.WebGLRenderTarget(cols, rows, { type: THREE.UnsignedByteType });
      buf = new Uint8Array(cols * rows * 4);
      kick();
    }

    function draw() {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, cols, rows, buf);
      renderer.setRenderTarget(null);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = card.tint;
      ctx.font = `${Math.round(cellH * 0.92)}px ${monoFont}`;
      ctx.textBaseline = "top";
      const n = ramp.length - 1;
      const ox = (cw - cols * cellW) / 2;
      const oy = (ch - rows * cellH) / 2;
      for (let y = 0; y < rows; y++) {
        const ry = rows - 1 - y; // GL rows are bottom-up
        for (let x = 0; x < cols; x++) {
          const i = (ry * cols + x) * 4;
          const l = (0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]) / 255;
          if (l < 0.035) continue;
          const g = ramp[Math.min(n, Math.max(1, Math.round(Math.pow(l, 0.75) * n)))];
          if (g !== " ") ctx.fillText(g, ox + x * cellW, oy + y * cellH);
        }
      }
    }

    // Magnetic repulsion. The cursor is projected onto the z = 0 plane; every
    // body is pushed directly away from it with a Gaussian falloff, and turns
    // its face away. Each body hangs on an underdamped spring, so it lunges
    // away, overshoots slightly, and springs home when the cursor leaves.
    const K = 60, C = 7, TURN = 0.75;
    const viewH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    const local = new THREE.Vector3();
    const ws = new THREE.Vector3();
    let h = 0, t = 0, last = 0, running = false;
    function frame(now) {
      const dt = last ? Math.min(0.033, (now - last) / 1000) : 0.016;
      last = now;
      const want = hotRef.current && !reducedMotion ? 1 : 0;
      h += (want - h) * (1 - Math.exp(-dt * 8));
      t += dt;

      const ptr = pointerRef.current;
      let has = false;
      if (ptr && h > 0.001) {
        const ox = (cw - cols * cellW) / 2, oy = (ch - rows * cellH) / 2;
        ndc.set(((ptr.x - ox) / (cols * cellW)) * 2 - 1, -(((ptr.y - oy) / (rows * cellH)) * 2 - 1));
        ray.setFromCamera(ndc, camera);
        has = !!ray.ray.intersectPlane(plane, hit);
      }

      let moving = false;
      for (const b of bodies) {
        let tx = 0, ty = 0, f = 0;
        const parent = b.o.parent;
        const sc = parent.getWorldScale(ws).x;
        const R = (radius * viewH) / sc;
        const S = (strength * viewH) / sc;
        if (has) {
          local.copy(hit);
          parent.worldToLocal(local);
          const dx = b.p0.x + b.off.x - local.x;
          const dy = b.p0.y + b.off.y - local.y;
          const d = Math.hypot(dx, dy) || 1e-4;
          f = Math.exp(-(d * d) / (R * R)) * h;
          tx = (dx / d) * f * S;
          ty = (dy / d) * f * S;
        }
        // Spring the offset toward the push target, and the turn toward
        // facing away from the cursor.
        b.vel.x += (K * (tx - b.off.x) - C * b.vel.x) * dt;
        b.vel.y += (K * (ty - b.off.y) - C * b.vel.y) * dt;
        b.off.x += b.vel.x * dt;
        b.off.y += b.vel.y * dt;
        const rxT = -(ty / S) * TURN, ryT = (tx / S) * TURN;
        b.rotVel.x += (K * (rxT - b.rot.x) - C * b.rotVel.x) * dt;
        b.rotVel.y += (K * (ryT - b.rot.y) - C * b.rotVel.y) * dt;
        b.rot.x += b.rotVel.x * dt;
        b.rot.y += b.rotVel.y * dt;

        b.o.position.set(b.p0.x + b.off.x, b.p0.y + b.off.y, b.p0.z);
        b.o.rotation.set(b.r0.x + b.rot.x, b.r0.y + b.rot.y, b.r0.z);
        if (Math.abs(b.off.x) + Math.abs(b.off.y) + Math.abs(b.vel.x) + Math.abs(b.vel.y) +
            Math.abs(b.rot.x) + Math.abs(b.rot.y) + Math.abs(b.rotVel.x) + Math.abs(b.rotVel.y) > 1e-3) moving = true;
      }
      if (card.animate) card.animate(pivot, t, h);
      draw();
      if (!want && h < 0.002 && !moving) { running = false; last = 0; return; }
      raf = requestAnimationFrame(frame);
    }
    function kick() {
      if (disposed || !target) return;
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    wrap.current.__kick = kick;

    const ro = new ResizeObserver(resize);
    ro.observe(wrap.current);
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      target?.dispose();
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    };
  }, [card, ramp, cellSize, strength, radius, monoFont, reducedMotion]);

  useEffect(() => { wrap.current?.__kick?.(); }, [hot]);

  const track = (e) => {
    const r = wrap.current.getBoundingClientRect();
    pointerRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    wrap.current.__kick?.();
  };
  const on = (e) => { if (e && e.clientX !== undefined) track(e); setHot(true); };
  const off = () => { pointerRef.current = null; setHot(false); };
  const Tag = card.href ? "a" : "div";

  return (
    <Tag
      ref={wrap}
      href={card.href}
      className={"amhc-card" + (hot ? " is-hot" : "")}
      onPointerEnter={on}
      onPointerLeave={off}
      onPointerMove={track}
      onFocus={on}
      onBlur={off}
      tabIndex={card.href ? undefined : 0}
      style={{ "--bg": bg, "--hover-bg": hoverBg, "--border": border, "--accent": accent }}
    >
      <canvas ref={canvas} className="amhc-ascii" aria-hidden="true" />
      <div className="amhc-content">
        {card.tag && <span className="amhc-tag" style={{ fontFamily: monoFont }}>{card.tag}</span>}
        <div className="amhc-middle">
          {card.kicker && <p className="amhc-kicker" style={{ fontFamily: displayFont }}>{card.kicker}</p>}
          {card.headline && <h3 className="amhc-headline" style={{ fontFamily: displayFont }}>{card.headline}</h3>}
          {card.subline && <p className="amhc-subline" style={{ fontFamily: monoFont }}>{card.subline}</p>}
        </div>
        {card.cta && (
          <span className="amhc-cta" style={{ fontFamily: monoFont }}>
            <span className="amhc-cta-label">{card.cta}</span>
            <span className="amhc-cta-icon" aria-hidden="true">{hot ? "☝" : "☞"}</span>
          </span>
        )}
      </div>
    </Tag>
  );
}

const CSS = `
.amhc { color: #fff; }
.amhc-title { margin: 0 0 18px; font-weight: 800; font-stretch: 125%; text-transform: uppercase; letter-spacing: 0.01em; font-size: clamp(22px, 2.6vw, 34px); line-height: 1; }
.amhc-row { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: var(--gap); }
@media (max-width: 760px) { .amhc-row { grid-template-columns: 1fr; } }
.amhc-card { position: relative; aspect-ratio: 1 / 1; overflow: hidden; display: block; color: inherit; text-decoration: none;
  background: var(--bg); border: 1px solid var(--border); border-radius: 4px; transition: background-color 250ms ease-out; outline: none; }
.amhc-card.is-hot { background: var(--hover-bg); }
.amhc-card:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
.amhc-ascii { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.amhc-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: 16px 16px 28px; text-align: center; }
.amhc-tag { border: 1px solid #fff; border-radius: 999px; padding: 4px 11px; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; }
.amhc-middle { display: flex; flex-direction: column; align-items: center; }
.amhc-kicker { margin: 0 0 4px; font-weight: 800; font-size: clamp(11px, 1.1vw, 15px); text-transform: uppercase; letter-spacing: 0.02em; }
.amhc-headline { margin: 0; font-weight: 900; font-stretch: 125%; text-transform: uppercase; font-size: clamp(26px, 3.1vw, 44px); line-height: 0.9; letter-spacing: -0.01em; }
.amhc-subline { margin: 10px 0 0; font-size: clamp(11px, 1vw, 14px); text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.85; }
.amhc-cta { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; font-size: 12px; letter-spacing: 0.08em;
  text-transform: uppercase; transition: background-color 180ms ease-out; }
.amhc-cta::before, .amhc-cta::after { content: ""; position: absolute; top: 0; bottom: 0; width: 7px; border: 1.5px solid #fff; transition: opacity 180ms ease-out; }
.amhc-cta::before { left: 0; border-right: 0; }
.amhc-cta::after { right: 0; border-left: 0; }
.amhc-card.is-hot .amhc-cta { background: var(--accent); }
.amhc-card.is-hot .amhc-cta::before, .amhc-card.is-hot .amhc-cta::after { opacity: 0; }
.amhc-cta-icon { font-size: 15px; line-height: 1; }
`;

export default function AsciiModelHoverCards({
  title,
  cards = [],
  columns = 3,
  gap = 14,
  cellSize = 6,
  ramp = DEFAULT_RAMP,
  strength = 0.14,
  radius = 0.32,
  bg = "#0B0B0B",
  hoverBg = "#252029",
  border = "#2A2A2A",
  accent = "#A12CF2",
  displayFont = '"Archivo", "Helvetica Neue", Arial, sans-serif',
  monoFont = '"JetBrains Mono", ui-monospace, Menlo, monospace',
  className = "",
  style,
}) {
  const [reducedMotion, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const u = () => setReduced(m.matches);
    u();
    m.addEventListener("change", u);
    return () => m.removeEventListener("change", u);
  }, []);

  return (
    <section className={"amhc " + className} style={style}>
      <style>{CSS}</style>
      {title && <h2 className="amhc-title" style={{ fontFamily: displayFont }}>{title}</h2>}
      <div className="amhc-row" style={{ "--cols": columns, "--gap": gap + "px" }}>
        {cards.map((card, i) => (
          <AsciiCard
            key={card.key ?? i}
            card={card}
            ramp={ramp}
            cellSize={cellSize}
            bg={bg}
            hoverBg={hoverBg}
            border={border}
            accent={accent}
            strength={strength}
            radius={radius}
            displayFont={displayFont}
            monoFont={monoFont}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </section>
  );
}

AsciiModelHoverCards.presets = PRESETS;
