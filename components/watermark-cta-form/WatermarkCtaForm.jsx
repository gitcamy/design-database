import React, { useId, useState } from "react";

// A rounded CTA card: one base color lifted by two soft corner glows, an
// oversized brand mark as a faint watermark cropped by the bottom edge, and a
// centered headline, paragraph and inline email form. Everything is derived
// from `bg`, so changing one color re-themes the card.

const SANS = '"Inter Tight", Inter, "Helvetica Neue", Arial, sans-serif';

const CSS = `
.wcf-input, .wcf-btn { box-sizing: border-box; }
.wcf-input::placeholder { color: #9A9A9A; }
.wcf-input:focus-visible { outline: 2px solid rgba(255,255,255,0.9); outline-offset: 2px; }
.wcf-btn { transition: transform 120ms ease-out, filter 120ms ease-out; }
.wcf-btn:hover { filter: brightness(0.96); }
.wcf-btn:active { transform: translateY(1px); }
.wcf-btn:focus-visible { outline: 2px solid rgba(255,255,255,0.9); outline-offset: 2px; }
@media (max-width: 640px) {
  .wcf-form { flex-direction: column; }
  .wcf-form > input, .wcf-form > button { flex: none !important; width: 100% !important; }
}
`;

// Default watermark: three nested rings sharing a bottom tangent. A generic
// stand-in; pass your own mark through `watermark`.
export function RingsMark(props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="22" {...props}>
      <circle cx="100" cy="100" r="89" />
      <circle cx="100" cy="126" r="52" />
      <circle cx="100" cy="152" r="20" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function WatermarkCtaForm({
  headline = "Interested in trying Megamind Labs?",
  body = "We welcome any interest in putting our work to the test. Leave your email and we'll walk you through a short demo and show you what it can do for your team.",
  placeholder = "name@email.com",
  cta = "Request Info",
  successText = "Thanks, we'll be in touch.",
  onSubmit,
  bg = "#2667E0",
  ink = "#FFFFFF",
  glow = true,
  watermark,
  watermarkOpacity = 0.06,
  watermarkSize = 1.4,
  watermarkX = 50,
  watermarkY = 86,
  inputBg = "#EFEFEF",
  buttonBg = "#FFFFFF",
  buttonInk = "#242424",
  radius = 24,
  maxWidth = 1165,
  className,
  style,
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error

  const submit = async (e) => {
    e.preventDefault();
    if (!onSubmit) {
      setStatus("done");
      return;
    }
    setStatus("sending");
    try {
      await onSubmit(email);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  // A string is treated as an image URL; anything else is rendered as-is.
  const mark =
    typeof watermark === "string" ? (
      <img src={watermark} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    ) : (
      watermark ?? <RingsMark style={{ width: "100%", height: "100%" }} />
    );

  // Base color plus a soft lift in the top-left corner and a brighter,
  // cooler bloom in the bottom-right, all mixed from `bg`.
  const background = glow
    ? [
        `radial-gradient(60% 80% at 0% 0%, color-mix(in oklab, ${bg}, white 18%) 0%, transparent 70%)`,
        `radial-gradient(55% 75% at 100% 100%, color-mix(in oklab, ${bg}, #9FD4FF 45%) 0%, transparent 72%)`,
        bg,
      ].join(", ")
    : bg;

  return (
    <section
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        maxWidth,
        margin: "0 auto",
        borderRadius: radius,
        background,
        color: ink,
        padding: "clamp(56px, 9vw, 104px) 24px",
        textAlign: "center",
        ...style,
      }}
    >
      <style>{CSS}</style>

      <div
        aria-hidden
        style={{
          position: "absolute",
          zIndex: -1,
          left: `${watermarkX}%`,
          top: `${watermarkY}%`,
          height: `${watermarkSize * 100}%`,
          aspectRatio: "1",
          transform: "translate(-50%, -50%)",
          color: ink,
          opacity: watermarkOpacity,
          pointerEvents: "none",
        }}
      >
        {mark}
      </div>

      <h2
        style={{
          margin: "0 auto",
          maxWidth: "24ch",
          font: `500 clamp(30px, 4.2vw, 44px)/1.1 ${SANS}`,
          letterSpacing: "-0.025em",
          textWrap: "balance",
        }}
      >
        {headline}
      </h2>
      <p
        style={{
          margin: "16px auto 0",
          maxWidth: "46ch",
          font: `400 17px/1.45 ${SANS}`,
          opacity: 0.9,
          textWrap: "pretty",
        }}
      >
        {body}
      </p>

      {status === "done" ? (
        <p role="status" style={{ margin: "32px 0 0", font: `500 17px/1.4 ${SANS}` }}>
          {successText}
        </p>
      ) : (
        <form
          className="wcf-form"
          onSubmit={submit}
          style={{ margin: "32px auto 0", display: "flex", gap: 10, justifyContent: "center", maxWidth: 440 }}
        >
          <label htmlFor={id} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            Email
          </label>
          <input
            id={id}
            className="wcf-input"
            type="email"
            required
            autoComplete="email"
            placeholder={placeholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              height: 50,
              padding: "0 14px",
              border: 0,
              borderRadius: 8,
              background: inputBg,
              color: "#1E1E1C",
              font: `400 16px/1 ${SANS}`,
            }}
          />
          <button
            type="submit"
            className="wcf-btn"
            disabled={status === "sending"}
            style={{
              height: 50,
              padding: "0 20px",
              border: 0,
              borderRadius: 8,
              background: buttonBg,
              color: buttonInk,
              font: `500 16px/1 ${SANS}`,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {status === "sending" ? "Sending…" : cta}
          </button>
        </form>
      )}
      {status === "error" ? (
        <p role="alert" style={{ margin: "12px 0 0", font: `400 14px/1.4 ${SANS}` }}>
          Something went wrong. Try again.
        </p>
      ) : null}
    </section>
  );
}
