import React, { useEffect, useState } from "react";

// A fixed nav with exactly two states. At the top it is transparent with light
// ink; past `threshold` it switches to a solid bar with dark ink. It is a
// boolean switch, not scroll-linked progress. Only background opacity and ink
// color ever change: height, layout, logo and CTA stay put.

const SANS = '"Inter Tight", Inter, "Helvetica Neue", Arial, sans-serif';

const CSS = `
.stsn { --nav-ink: var(--stsn-top-ink); }
.stsn[data-scrolled="true"] { --nav-ink: var(--stsn-scrolled-ink); }
.stsn-bg { opacity: 0; transition: opacity var(--stsn-fade) cubic-bezier(0.2, 0, 0, 1); }
.stsn[data-scrolled="true"] .stsn-bg { opacity: 1; }
.stsn-ink { color: var(--nav-ink); transition: color var(--stsn-ink-fade) ease-out; }
.stsn-link { text-decoration: none; }
.stsn-link:hover { opacity: 0.7; }
.stsn-cta { transition: filter 150ms ease-out; }
.stsn-cta:hover { filter: brightness(0.95); }
.stsn-menu { background: none; border: 0; padding: 6px; margin: -6px; cursor: pointer; }
.stsn :focus-visible { outline: 2px solid currentColor; outline-offset: 3px; border-radius: 4px; }
.stsn[data-instant="true"] .stsn-bg,
.stsn[data-instant="true"] .stsn-ink { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .stsn-bg, .stsn-ink { transition: none; }
}
@media (max-width: 767px) {
  .stsn { --stsn-pad: 20px !important; }
  .stsn-hide-sm { display: none !important; }
  .stsn-brand { font-size: 20px !important; }
  .stsn-right { gap: 16px !important; }
}
`;

function MenuIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M0 1h20M0 7h20M0 13h20" />
    </svg>
  );
}

export default function ScrollNav({
  brand = "Megamind Labs",
  links = [{ label: "Log In", href: "#" }],
  cta = "Start a project",
  ctaHref = "#",
  onCta,
  onMenu,
  threshold = 8,
  solidBg = "#FFFFFF",
  topInk = "#FFFFFF",
  scrolledInk = "#1E1E1C",
  ctaBg = "#D5F88A",
  ctaInk = "#1E1E1C",
  height = 76,
  padding = 60,
  fade = 250,
  inkFade = 150,
  scrollContainer,
  className,
  style,
}) {
  const [scrolled, setScrolled] = useState(false);
  // True until the first check has run, so a page that loads already
  // scrolled starts solid without playing the fade.
  const [instant, setInstant] = useState(true);

  useEffect(() => {
    const target = scrollContainer || window;
    const read = () =>
      scrollContainer ? scrollContainer.scrollTop : window.scrollY || document.documentElement.scrollTop;
    // Setting a boolean is cheap and React skips the render when it has not
    // changed, so there is no need to throttle this.
    const check = () => setScrolled(read() > threshold);
    check();
    // A timeout rather than rAF: rAF does not fire in a background tab.
    const id = setTimeout(() => setInstant(false), 50);
    target.addEventListener("scroll", check, { passive: true });
    return () => {
      target.removeEventListener("scroll", check);
      clearTimeout(id);
    };
  }, [threshold, scrollContainer]);

  return (
    <header
      className={"stsn" + (className ? " " + className : "")}
      data-scrolled={scrolled}
      data-instant={instant}
      style={{
        "--stsn-top-ink": topInk,
        "--stsn-scrolled-ink": scrolledInk,
        "--stsn-fade": `${fade}ms`,
        "--stsn-ink-fade": `${inkFade}ms`,
        "--stsn-pad": `${padding}px`,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height,
        ...style,
      }}
    >
      <style>{CSS}</style>
      {/* The background is its own layer so only its opacity animates. */}
      <div className="stsn-bg" aria-hidden style={{ position: "absolute", inset: 0, background: solidBg }} />
      <nav
        style={{
          position: "relative",
          height: "100%",
          padding: "0 var(--stsn-pad)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <a
          href="/"
          className="stsn-ink stsn-link stsn-brand"
          style={{ font: `400 24px/1 ${SANS}`, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
        >
          {brand}
        </a>
        <div className="stsn-right" style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="stsn-ink stsn-link stsn-hide-sm"
              style={{ font: `500 14px/1 ${SANS}`, whiteSpace: "nowrap" }}
            >
              {l.label}
            </a>
          ))}
          {cta ? (
            <a
              href={ctaHref}
              onClick={onCta}
              className="stsn-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 40,
                padding: "0 18px",
                borderRadius: 999,
                background: ctaBg,
                color: ctaInk,
                font: `500 14px/1 ${SANS}`,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {cta}
            </a>
          ) : null}
          <button type="button" aria-label="Open menu" onClick={onMenu} className="stsn-ink stsn-menu">
            <MenuIcon />
          </button>
        </div>
      </nav>
    </header>
  );
}
