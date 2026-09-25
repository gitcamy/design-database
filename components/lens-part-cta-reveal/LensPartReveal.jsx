import React, { useEffect, useLayoutEffect, useRef } from "react";

// A closing CTA section revealed by two oversized soft lobes that part like an
// opening lens as the section scrolls in. The lobes sit in front of the content
// and clip it; only their vertical offset and the content's opacity change.
// Progress is scrubbed from scroll position, never autoplayed.

const SERIF = '"Newsreader", "Tiempos Headline", Georgia, "Times New Roman", serif';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';

const CSS = `
.lpr { position: relative; overflow: hidden; isolation: isolate; }
.lpr-lobe { position: absolute; left: 0; top: 0; border-radius: 50%; will-change: transform; z-index: 2; pointer-events: none; }
.lpr-content { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 1;
  width: min(92vw, 640px); text-align: center; will-change: opacity; }
.lpr-h { margin: 0; font-weight: 400; letter-spacing: -0.02em; line-height: 1.02; }
.lpr-h em { font-style: italic; }
.lpr-p { margin: 18px auto 0; max-width: 34em; line-height: 1.5; }
.lpr-cta { display: inline-block; margin-top: 28px; padding: 13px 24px; border-radius: 999px;
  text-decoration: none; font-weight: 500; transition: filter 150ms ease-out; }
.lpr-cta:hover { filter: brightness(1.25); }
.lpr-cta:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
`;

const DEFAULT_HEADLINE = (
  <>
    Build faster <em>systems</em>.<br />
    Ship sharper <em>ideas</em>.
  </>
);

export default function LensPartReveal({
  headline = DEFAULT_HEADLINE,
  body = "Book a 15-minute call and see how Megamind Labs takes your product from first sketch to shipped.",
  ctaLabel = "Book a Call",
  ctaHref = "#",
  onCta,
  bg = "#9793FE",
  deep = "#8984FE",
  side = "#B8B4FE",
  lobe = "#AFA9FF",
  rim = "#C2BFFF",
  shade = "rgba(72, 62, 214, 0.22)",
  ink = "#F6F4FF",
  ctaColor = "#1E1E1E",
  ctaInk = "#FFFFFF",
  restGap = 0.5,
  lobeWidth = 1.8,
  sag = 0.11,
  start = 0.5,
  end = 0,
  curve = 1.5,
  height = "100vh",
  minHeight = 560,
  serif = SERIF,
  sans = SANS,
  scrollContainer,
  className,
  style,
}) {
  const rootRef = useRef(null);
  const topRef = useRef(null);
  const botRef = useRef(null);
  const contentRef = useRef(null);
  const geo = useRef({ W: 0, H: 0, b: 0, minGap: 0 });
  const opts = useRef({});
  opts.current = { restGap, lobeWidth, sag, start, end, curve, scrollContainer };

  // Size the lobes so their curved edge sags `sag * width` across the viewport.
  const layout = () => {
    const root = rootRef.current;
    if (!root) return;
    const { lobeWidth: lw, sag: s } = opts.current;
    const W = root.clientWidth;
    const H = root.clientHeight;
    const a = (lw * W) / 2;
    const k = 1 - Math.sqrt(Math.max(0, 1 - Math.pow(W / 2 / a, 2)));
    const b = (s * W) / Math.max(k, 0.01);
    const ch = contentRef.current ? contentRef.current.offsetHeight : 0;
    geo.current = { W, H, b, minGap: ch + 48 };
    for (const el of [topRef.current, botRef.current]) {
      el.style.width = `${2 * a}px`;
      el.style.height = `${2 * b}px`;
      el.style.left = `${W / 2 - a}px`;
    }
    topRef.current.style.top = `${H / 2 - 2 * b}px`;
    botRef.current.style.top = `${H / 2}px`;
  };

  const paint = () => {
    const root = rootRef.current;
    if (!root) return;
    const { restGap: rg, start: s0, end: s1, curve: c, scrollContainer: sc } = opts.current;
    const vh = sc ? sc.clientHeight : window.innerHeight;
    const vTop = sc ? sc.getBoundingClientRect().top : 0;
    const top = root.getBoundingClientRect().top - vTop;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let p = (s0 * vh - top) / ((s0 - s1) * vh);
    p = reduce ? 1 : Math.min(1, Math.max(0, p));

    // Gap at rest never smaller than the content, so narrow screens stay legible.
    const { H, minGap } = geo.current;
    const rest = Math.max(rg * H, minGap);
    const gap = rest * Math.pow(p, c);
    topRef.current.style.transform = `translate3d(0, ${-gap / 2}px, 0)`;
    botRef.current.style.transform = `translate3d(0, ${gap / 2}px, 0)`;

    const t = Math.min(1, Math.max(0, (p - 0.2) / 0.75));
    contentRef.current.style.opacity = String(0.1 + 0.9 * t);
  };

  useLayoutEffect(() => {
    layout();
    paint();
  });

  useEffect(() => {
    const target = scrollContainer || window;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        paint();
      });
    };
    const ro = new ResizeObserver(() => {
      layout();
      paint();
    });
    ro.observe(rootRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [scrollContainer]);

  const lobeStyle = (edge) => ({
    background: lobe,
    // Rim highlight hugs the visible curved edge; the drop shade falls into the gap.
    boxShadow:
      edge === "bottom"
        ? `inset 0 -16px 26px -8px ${rim}, 0 22px 44px -14px ${shade}`
        : `inset 0 16px 26px -8px ${rim}, 0 -22px 44px -14px ${shade}`,
  });

  return (
    <section
      ref={rootRef}
      className={["lpr", className].filter(Boolean).join(" ")}
      style={{
        height,
        minHeight,
        background: `radial-gradient(60% 70% at 50% 50%, ${deep} 0%, ${bg} 55%, ${side} 100%)`,
        ...style,
      }}
    >
      <style>{CSS}</style>
      <div ref={topRef} className="lpr-lobe" style={lobeStyle("bottom")} aria-hidden />
      <div ref={botRef} className="lpr-lobe" style={lobeStyle("top")} aria-hidden />
      <div ref={contentRef} className="lpr-content" style={{ color: ink }}>
        <h2 className="lpr-h" style={{ fontFamily: serif, fontSize: "clamp(38px, 5.4vw, 76px)" }}>
          {headline}
        </h2>
        {body && (
          <p className="lpr-p" style={{ fontFamily: sans, fontSize: 15, opacity: 0.72 }}>
            {body}
          </p>
        )}
        {ctaLabel && (
          <a
            className="lpr-cta"
            href={ctaHref}
            onClick={onCta}
            style={{ background: ctaColor, color: ctaInk, fontFamily: sans, fontSize: 14 }}
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}
