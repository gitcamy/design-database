import React, { useCallback, useEffect, useRef, useState } from "react";

// Two identical layouts stacked on top of each other. The AFTER layer is
// clipped to the left of the divider, so the BEFORE layer shows through on the
// right. The only thing that ever changes is --x. Nothing fades, eases or
// counts up: the hard cut through a card is the effect.

const clamp = (v) => Math.min(100, Math.max(0, v));

const SERIF = '"Iowan Old Style", "Newsreader", Georgia, serif';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';

// Scoped styles for the parts inline styles cannot express: the stacking
// breakpoint and the grab cursors.
const CSS = `
.bar-root { --bar-gap: 16px; }
.bar-grid { display: grid; grid-template-columns: 45fr 55fr; gap: var(--bar-gap); }
.bar-right { display: grid; grid-template-rows: 180px 172px; gap: var(--bar-gap); }
.bar-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: var(--bar-gap); }
.bar-frame { cursor: grab; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
.bar-frame[data-dragging="true"], .bar-frame[data-dragging="true"] * { cursor: grabbing; }
.bar-handle:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
@media (max-width: 767px) {
  .bar-grid { grid-template-columns: 1fr; }
  .bar-left { min-height: 340px; }
}
`;

// ---------------------------------------------------------------------------
// Default mockup, used when `before` / `after` are not passed. Both states
// share every size and position; only fills and content differ.

const BEFORE_BARS = [9, 4, 2, 2, 2, 2, 2];
const AFTER_BARS = [88, 88, 91, 94, 92, 97, 95];

function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        boxShadow: "0 1px 2px rgba(20,20,40,0.06), 0 8px 24px rgba(20,20,40,0.06)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Chip({ children, style }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 999,
        padding: "7px 12px",
        font: `500 13px/1 ${SANS}`,
        color: "#1B1B1F",
        boxShadow: "0 1px 2px rgba(20,20,40,0.08), 0 4px 12px rgba(20,20,40,0.06)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Tile({ size = 40, color, style }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: "#FFFFFF",
        boxShadow: "0 1px 2px rgba(20,20,40,0.08), 0 4px 12px rgba(20,20,40,0.06)",
        display: "grid",
        placeItems: "center",
        flex: "none",
        ...style,
      }}
    >
      <div style={{ width: size * 0.5, height: size * 0.5, borderRadius: size * 0.14, background: color }} />
    </div>
  );
}

function StateLabel({ text }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 11px 6px 8px",
        borderRadius: 999,
        background: "#23262E",
        color: "#FFFFFF",
        font: `500 14px/1 ${SANS}`,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: "linear-gradient(135deg, #F06BC4, #6455F4)",
        }}
      />
      {text}
    </div>
  );
}

function BeforeFlow() {
  // A cluttered 7-node path with winding connectors.
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg
        viewBox="0 0 400 360"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        fill="none"
        stroke="#9A9AA2"
        strokeWidth="1.5"
      >
        <path d="M340 70 C 380 70, 380 110, 340 110 L 120 110 C 90 110, 90 150, 120 150 L 180 150" />
        <path d="M280 150 C 330 150, 330 185, 290 190 L 230 200" />
        <path d="M205 225 L 205 245 M 205 245 L 150 245 L 150 265 M 205 245 L 260 245 L 260 265 M 205 245 L 205 265" />
        <path d="M205 320 L 205 335" />
      </svg>
      <div style={{ position: "absolute", top: 50, left: "26%", display: "flex", alignItems: "center", gap: 8 }}>
        <Chip>Open profile</Chip>
        <Tile size={36} color="#E4577F" />
        <Tile size={36} color="#1B1B1F" />
        <Tile size={36} color="#3A6FF0" />
      </div>
      <div style={{ position: "absolute", top: 132, left: "44%", display: "flex", alignItems: "center", gap: 8 }}>
        <Tile size={36} color="#555" style={{ background: "#D9D9DC" }} />
        <Chip style={{ fontSize: 11 }}>View link page</Chip>
      </div>
      <div style={{ position: "absolute", top: 180, left: "22%", display: "flex", alignItems: "center", gap: 8 }}>
        <Chip style={{ fontSize: 11 }}>Select product</Chip>
        <Tile size={40} color="#6A5CF2" />
      </div>
      <div style={{ position: "absolute", top: 262, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18 }}>
        {[
          ["Checkout", "#B03BC7"],
          ["Account", "#2FA64A"],
          ["Billing info", "#E8603C"],
        ].map(([label, c]) => (
          <div key={label} style={{ display: "grid", justifyItems: "center", gap: 6 }}>
            <Tile size={32} color={c} />
            <span style={{ font: `500 10px/1 ${SANS}`, color: "#1B1B1F" }}>{label}</span>
          </div>
        ))}
      </div>
      <Chip style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", fontSize: 11 }}>
        <span style={{ color: "#2FA64A" }}>●</span> Buy product
      </Chip>
    </div>
  );
}

function AfterFlow() {
  // Three nodes on straight connectors under one glossy app tile.
  const arrow = <div style={{ width: 1.5, height: 26, background: "#C9C9CF", margin: "0 auto" }} />;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        justifyItems: "center",
        alignContent: "center",
        gap: 6,
        paddingTop: 16,
      }}
    >
      <div
        style={{
          width: 70,
          height: 70,
          borderRadius: 16,
          background: "#FFFFFF",
          boxShadow: "0 2px 4px rgba(20,20,40,0.08), 0 10px 24px rgba(20,20,40,0.08)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 34,
            borderRadius: 7,
            transform: "skewX(-12deg)",
            background: "linear-gradient(135deg, #F79A3E 0%, #E8479B 45%, #6455F4 100%)",
          }}
        />
      </div>
      {arrow}
      <div style={{ display: "flex", alignItems: "center", gap: 10, transform: "translateX(14px)" }}>
        <Chip style={{ fontSize: 15, padding: "9px 14px" }}>Tap your link</Chip>
        <Tile size={44} color="#E4577F" />
      </div>
      {arrow}
      <div style={{ display: "flex", alignItems: "center", gap: 10, transform: "translateX(-18px)" }}>
        <Tile size={44} color="#9B5CF2" style={{ background: "#EBD9FB" }} />
        <Chip style={{ fontSize: 15, padding: "9px 14px" }}>Pick a product</Chip>
      </div>
      {arrow}
      <div style={{ display: "flex", alignItems: "center", gap: 10, transform: "translateX(18px)" }}>
        <Chip style={{ fontSize: 15, padding: "9px 14px" }}>Check out</Chip>
        <Tile size={44} color="#2E9E3F" style={{ background: "#D8F5B8" }} />
      </div>
    </div>
  );
}

function Bars({ values, fill, cap, track }) {
  return (
    <div style={{ position: "absolute", left: 20, right: 16, top: 52, bottom: 14, display: "flex", gap: 10 }}>
      <div
        style={{
          display: "grid",
          alignContent: "space-between",
          font: `400 10px/1 ${SANS}`,
          color: "#8A8A92",
          paddingBottom: 18,
          width: 24,
        }}
      >
        <span>100</span>
        <span>75</span>
        <span>50</span>
        <span>0</span>
      </div>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "grid", gridTemplateRows: "1fr 6px", gap: 8 }}>
          <div
            style={{
              position: "relative",
              borderRadius: 7,
              overflow: "hidden",
              background: cap ? cap : track,
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            <div style={{ width: "100%", height: `${v}%`, minHeight: 3, background: fill, borderRadius: cap ? 0 : 2 }} />
          </div>
          <div style={{ borderRadius: 3, background: "#E7E7EA" }} />
        </div>
      ))}
    </div>
  );
}

function Legend({ viewsColor, salesColor }) {
  const dot = (c) => <span style={{ width: 9, height: 9, borderRadius: 9, background: c, display: "inline-block" }} />;
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 18,
        display: "flex",
        gap: 12,
        font: `500 11px/1 ${SANS}`,
        color: "#3A3A40",
        alignItems: "center",
      }}
    >
      <span style={{ display: "flex", gap: 5, alignItems: "center" }}>{dot(viewsColor)} Views</span>
      <span style={{ display: "flex", gap: 5, alignItems: "center" }}>{dot(salesColor)} Sales</span>
    </div>
  );
}

function StatTile({ label, value, dark, fill }) {
  return (
    <Card style={{ background: dark ? fill : "#FFFFFF", padding: "22px 20px" }}>
      <div style={{ font: `400 18px/1.2 ${SERIF}`, color: dark ? "rgba(255,255,255,0.85)" : "#2A2A2E" }}>{label}</div>
      <div
        style={{
          position: "absolute",
          left: 20,
          bottom: 20,
          font: `300 clamp(34px, 4.2vw, 46px)/1 ${SERIF}`,
          color: dark ? "#FFFFFF" : "#2A2A2E",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </Card>
  );
}

export function DashboardMockup({
  state = "before",
  label,
  accent = "#6455F4",
  accentTint = "#CDC7FD",
  ink = "#333433",
  backing = "#767676",
  stats,
}) {
  const after = state === "after";
  const s = stats || (after ? { rate: "38%", sold: "4,382" } : { rate: "1.3%", sold: "02" });
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 24,
        background: after ? "transparent" : backing,
        boxShadow: after ? "inset 0 0 0 1px rgba(30,30,60,0.12)" : "none",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div className="bar-grid" style={{ height: "100%" }}>
        <Card
          style={{
            minHeight: 368,
            backgroundImage: "radial-gradient(rgba(30,30,60,0.10) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
          }}
        >
          <div className="bar-left" style={{ position: "absolute", inset: 0 }}>
            <StateLabel text={label} />
            {after ? <AfterFlow /> : <BeforeFlow />}
          </div>
        </Card>
        <div className="bar-right">
          <Card>
            <div style={{ position: "absolute", top: 18, left: 20, font: `400 18px/1 ${SERIF}`, color: "#2A2A2E" }}>
              Store sales
            </div>
            <Legend viewsColor={after ? accentTint : "#ECECEE"} salesColor={after ? accent : ink} />
            <Bars
              values={after ? AFTER_BARS : BEFORE_BARS}
              fill={after ? accent : "#343432"}
              cap={after ? accentTint : null}
              track="#F1F1F1"
            />
          </Card>
          <div className="bar-tiles">
            <StatTile label="Conversion Rate" value={s.rate} />
            <StatTile label="Items sold" value={s.sold} dark fill={after ? accent : ink} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function BeforeAfterReveal({
  before,
  after,
  brand = "Megamind Labs",
  beforeLabel,
  afterLabel,
  initial = 50,
  step = 5,
  lineColor = "#5B6BDC",
  handleLabel = "DRAG ME",
  overshoot = 30,
  accent = "#6455F4",
  accentTint = "#CDC7FD",
  ink = "#333433",
  backing = "#767676",
  bg = "#FAF7FD",
  maxWidth = 915,
  onChange,
  className,
  style,
}) {
  const frameRef = useRef(null);
  const raf = useRef(0);
  const pending = useRef(null);
  const [x, setX] = useState(clamp(initial));
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const commit = useCallback(
    (v) => {
      const next = clamp(v);
      setX(next);
      if (onChange) onChange(next);
    },
    [onChange]
  );

  // One state update per frame, however fast pointermove fires.
  const fromClientX = useCallback(
    (clientX) => {
      const r = frameRef.current.getBoundingClientRect();
      pending.current = ((clientX - r.left) / r.width) * 100;
      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        commit(pending.current);
      });
    },
    [commit]
  );

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    frameRef.current.setPointerCapture(e.pointerId);
    setDragging(true);
    fromClientX(e.clientX);
  };
  const onPointerMove = (e) => {
    if (dragging) fromClientX(e.clientX);
  };
  const end = (e) => {
    if (frameRef.current.hasPointerCapture(e.pointerId)) frameRef.current.releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  const onKeyDown = (e) => {
    const map = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step };
    if (e.key in map) commit(x + map[e.key]);
    else if (e.key === "Home") commit(0);
    else if (e.key === "End") commit(100);
    else return;
    e.preventDefault();
  };

  const mockProps = { accent, accentTint, ink, backing };
  const beforeNode = before ?? (
    <DashboardMockup state="before" label={beforeLabel ?? `Without ${brand}`} {...mockProps} />
  );
  const afterNode = after ?? (
    <DashboardMockup state="after" label={afterLabel ?? `With ${brand}`} {...mockProps} />
  );

  return (
    <div
      className={"bar-root" + (className ? " " + className : "")}
      style={{ background: bg, padding: `${overshoot}px 16px`, ...style }}
    >
      <style>{CSS}</style>
      <div
        ref={frameRef}
        className="bar-frame"
        data-dragging={dragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        style={{ position: "relative", maxWidth, margin: "0 auto", "--x": `${x}%` }}
      >
        {/* BEFORE sets the height; AFTER is stacked on top of it and clipped. */}
        <div aria-hidden={x >= 100} style={{ isolation: "isolate" }}>
          {beforeNode}
        </div>
        <div
          aria-hidden={x <= 0}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            isolation: "isolate",
            // Opaque, so nothing from the BEFORE layer shows through a
            // transparent AFTER frame.
            background: bg,
            clipPath: "inset(0 calc(100% - var(--x)) 0 0)",
            WebkitClipPath: "inset(0 calc(100% - var(--x)) 0 0)",
          }}
        >
          {afterNode}
        </div>

        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "var(--x)",
            top: -overshoot,
            bottom: -overshoot,
            width: 2,
            marginLeft: -1,
            zIndex: 2,
            background: lineColor,
            pointerEvents: "none",
          }}
        />
        <div
          className="bar-handle"
          role="slider"
          tabIndex={0}
          aria-label="Comparison position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(x)}
          aria-valuetext={`${Math.round(x)}% after`}
          onKeyDown={onKeyDown}
          style={{
            position: "absolute",
            left: "var(--x)",
            top: "50%",
            width: 34,
            height: 34,
            margin: "-17px 0 0 -17px",
            borderRadius: 34,
            zIndex: 3,
            background: "#FFFFFF",
            color: lineColor,
            boxShadow: "0 1px 3px rgba(20,20,40,0.18), 0 4px 10px rgba(20,20,40,0.10)",
            display: "grid",
            placeItems: "center",
            outline: "none",
          }}
        >
          <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor" aria-hidden>
            <path d="M0 5 L6 0 L6 10 Z M16 5 L10 0 L10 10 Z" />
          </svg>
          {handleLabel ? (
            <span
              style={{
                position: "absolute",
                top: 42,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "4px 7px",
                borderRadius: 999,
                background: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(20,20,40,0.12)",
                font: `600 9px/1 ${SANS}`,
                letterSpacing: "0.06em",
                color: lineColor,
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {handleLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
