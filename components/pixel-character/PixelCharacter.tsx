import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * PixelCharacter
 * A 1-bit dithered pixel character drawn live on a canvas.
 * Loop: a wave of pixels rolls in from off-screen and crashes into her shape,
 * she waves, takes a call, types on a laptop, then washes back out.
 * One accent color marks the prop in her hands (phone, laptop lid).
 *
 * No dependencies beyond React. Works in Next.js, Vite, Framer (as a code component), etc.
 */

export type Pose = "wave" | "phone" | "type" | "idle"

export type PixelCharacterProps = {
    /** "auto" plays the full loop; or lock to a single pose */
    pose?: "auto" | Pose
    /** Screen pixels per character pixel (grid is 96 x 112) */
    cell?: number
    ink?: string
    background?: string
    accent?: string
    /** Show the pixel logomark on the laptop lid */
    showLogo?: boolean
    className?: string
    style?: CSSProperties
    ariaLabel?: string
}

const GW = 96, GH = 112
const LIME_MARK = "rgb(0,255,0)" // internal marker color, repainted with `accent`
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
const LOGO_D = "M396 0L198 0V33L132 33V66H66V132H33L33 165H0L0 363H33L33 429H66V462H99L99 495H165V528H330V495H396V462H429V396H462V231L429 231V198H396L396 165H363V132L198 132V165H165V198H132L132 330H165V363L198 363V396H297V363H330V264H264V330H198L198 231H231V198L330 198V231H363V264H396V396H363V429H330V462L165 462L165 429H132V396H99V363H66L66 198L99 198L99 132H132V99L198 99L198 66L363 66V99L429 99V132L462 132V165H495L495 231H528L528 429H495V462H462V528H429L429 544.5V561H396.042V594H429.042H462.042V561H495L495 528H528V495L561 495V429H594L594 198H561V132H528V99H495V66L462 66V33L396 33V0Z"
let REDUCED = false
let SHOW_LOGO = true
let g: CanvasRenderingContext2D

const gray = (v: number) => { const c = Math.max(0, Math.min(255, Math.round(v * 255))); return `rgb(${c},${c},${c})` }
const hash = (x: number, y: number, s: number) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v) }
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const easeOutBack = (q: number) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(q - 1, 3) + c1 * Math.pow(q - 1, 2) }

// Megamind Labs logomark (loopMM.svg), 594 x 594 on a 33-unit grid = 18 x 18 pixels
let LOGO: number[][] | null = null;
function logoCells(): number[][] {
  if (LOGO) return LOGO;
  const path = new Path2D(LOGO_D);
  const probe = document.createElement("canvas").getContext("2d")!;
  const cells: number[][] = [];
  for (let j = 0; j < 18; j++) for (let i = 0; i < 18; i++)
    if (probe.isPointInPath(path, (i + 0.5) * 33, (j + 0.5) * 33, "evenodd")) cells.push([i, j]);
  LOGO = cells;
  return cells;
}

function curls(list: number[][], fill: string | CanvasGradient) {
  g.fillStyle = fill;
  for (const [x, y, r] of list) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = gray(0.05); g.lineWidth = 1;
  for (const [x, y, r] of list) { g.beginPath(); g.arc(x + r * 0.1, y + r * 0.1, r * 0.55, Math.PI * 0.15, Math.PI * 1.45); g.stroke(); }
  g.fillStyle = gray(0.72);
  for (const [x, y, r] of list) g.fillRect(x - r * 0.45, y - r * 0.55, 1.2, 1.2);
}
function limb(pts: number[][], w: number, v: number) {
  g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); };
  path(); g.strokeStyle = gray(0.06); g.lineWidth = w + 2; g.stroke();
  path(); g.strokeStyle = gray(v); g.lineWidth = w; g.stroke();
}
function hand(x: number, y: number, r = 4) {
  g.fillStyle = gray(0.06); g.beginPath(); g.arc(x, y, r + 1, 0, Math.PI * 2); g.fill();
  const hg = g.createRadialGradient(x - 1.5, y - 1.5, 0.5, x, y, r + 1.5);
  hg.addColorStop(0, gray(1)); hg.addColorStop(1, gray(0.62));
  g.fillStyle = hg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}
function rrect(x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}

// Torso as a crew-neck top. rightArmUp removes the hanging right arm.
function torso(rightArmUp: boolean) {
  g.beginPath();
  g.moveTo(42, 61);
  g.quadraticCurveTo(30, 61, 24, 67);
  g.quadraticCurveTo(17, 72, 16, 86);
  g.lineTo(14, 112); g.lineTo(82, 112);
  if (rightArmUp) {
    g.lineTo(76, 88); g.quadraticCurveTo(76, 71, 71, 67);
  } else {
    g.lineTo(80, 86); g.quadraticCurveTo(79, 72, 72, 67);
  }
  g.quadraticCurveTo(66, 61, 54, 61);
  g.quadraticCurveTo(48, 65, 42, 61);
  g.closePath();
}

function drawCharacter(pose: string, t: number, compact: boolean) {
  const m = REDUCED ? 0 : 1;
  const tt = t * m;
  g.clearRect(0, 0, GW, GH);
  const breathe = Math.sin(tt * 2.2) * 0.5;
  const bob = pose === "type" ? Math.abs(Math.sin(tt * 11)) * 0.7 : 0;
  const armUp = pose === "wave" || pose === "phone";

  // Neck, short
  g.fillStyle = gray(0.06); g.fillRect(43, 50, 10, 14);
  g.fillStyle = gray(0.62); g.fillRect(44, 50, 8, 14);
  g.fillStyle = gray(0.34); g.beginPath(); g.ellipse(48, 55, 4, 2.2, 0, 0, Math.PI * 2); g.fill();

  // Top
  g.save(); g.translate(0, breathe + bob);
  torso(armUp);
  g.fillStyle = gray(0.06); g.lineWidth = 2; g.strokeStyle = gray(0.06); g.stroke();
  const tg = g.createRadialGradient(36, 72, 2, 48, 96, 46);
  tg.addColorStop(0, gray(0.86)); tg.addColorStop(0.5, gray(0.56)); tg.addColorStop(1, gray(0.24));
  torso(armUp); g.fillStyle = tg; g.fill();
  // Neckline
  g.strokeStyle = gray(0.1); g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(42, 61.5); g.quadraticCurveTo(48, 67, 54, 61.5); g.stroke();
  // Arm seams (arms resting at sides)
  g.strokeStyle = gray(0.18); g.lineWidth = 1;
  g.beginPath(); g.moveTo(25, 70); g.quadraticCurveTo(24, 90, 25, 112); g.stroke();
  if (!armUp) { g.beginPath(); g.moveTo(71, 70); g.quadraticCurveTo(72, 90, 71, 112); g.stroke(); }
  // Fold on the chest
  g.strokeStyle = gray(0.4); g.beginPath(); g.moveTo(38, 84); g.quadraticCurveTo(42, 88, 40, 96); g.stroke();
  g.restore();

  // Head group
  let tilt = 0, dy = 0;
  if (pose === "wave") tilt = 0.06 * Math.sin(tt * 4.5);
  if (pose === "phone") tilt = 0.1 + 0.02 * Math.sin(tt * 3);
  if (pose === "type") { tilt = -0.02; dy = 1 + bob * 0.4; }
  g.save();
  g.translate(48, 56 + dy + breathe * 0.4); g.rotate(tilt); g.translate(-48, -56);

  const hairG = g.createRadialGradient(40, 22, 3, 48, 36, 36);
  hairG.addColorStop(0, gray(0.5)); hairG.addColorStop(0.5, gray(0.25)); hairG.addColorStop(1, gray(0.07));
  curls([[48,17,14],[35,22,9.5],[61,22,9.5],[28,32,8.5],[68,32,8.5],[26,43,8],[70,43,8],[27,53,7],[69,53,7],[30,61,6],[66,61,6],[39,13,8],[57,13,8]], hairG);

  // Face
  const fg = g.createRadialGradient(42, 32, 2, 48, 40, 22);
  fg.addColorStop(0, gray(1)); fg.addColorStop(0.55, gray(0.88)); fg.addColorStop(1, gray(0.55));
  g.fillStyle = gray(0.06); g.beginPath(); g.ellipse(48, 38, 16.5, 18, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = fg; g.beginPath(); g.ellipse(48, 38, 15.5, 17, 0, 0, Math.PI * 2); g.fill();

  // Cheeks
  g.fillStyle = gray(0.74);
  g.beginPath(); g.arc(37.5, 46, 2.8, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(58.5, 46, 2.8, 0, Math.PI * 2); g.fill();

  // Brows
  g.strokeStyle = gray(0.1); g.lineWidth = 1.1; g.lineCap = "round";
  g.beginPath(); g.moveTo(38.5, 33.2); g.quadraticCurveTo(41.5, 31.8, 44.5, 32.8); g.stroke();
  g.beginPath(); g.moveTo(51.5, 32.8); g.quadraticCurveTo(54.5, 31.8, 57.5, 33.2); g.stroke();

  // Eyes with lashes
  const look = pose === "phone" ? [-0.8, -0.3] : pose === "type" ? [0, 1.5] : [0, 0];
  const blink = m > 0 && (tt % 3.4) < 0.13;
  ([[42, -1], [54, 1]] as number[][]).forEach(([ex, side]) => {
    const x = ex + look[0], y = 39.5 + look[1];
    g.strokeStyle = gray(0); g.lineWidth = 1;
    if (blink) {
      g.beginPath(); g.moveTo(x - 2.6, y); g.quadraticCurveTo(x, y + 1.4, x + 2.6, y); g.stroke();
    } else {
      g.fillStyle = gray(0); g.beginPath(); g.ellipse(x, y, 2.7, 3.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = gray(1); g.fillRect(x - 1.6, y - 2.2, 1.3, 1.3); g.fillRect(x + 0.6, y + 1, 0.8, 0.8);
    }
    g.beginPath(); g.moveTo(x + side * 2.4, y - 2.4); g.lineTo(x + side * 4, y - 3.8); g.stroke();
  });

  // Nose
  g.strokeStyle = gray(0.45); g.lineWidth = 1;
  g.beginPath(); g.moveTo(48.5, 42.5); g.quadraticCurveTo(49.6, 44.2, 48, 45); g.stroke();

  // Mouth
  g.fillStyle = gray(0.04); g.strokeStyle = gray(0.04); g.lineWidth = 1.2;
  if (pose === "wave") {
    g.beginPath(); g.moveTo(44, 48.5); g.quadraticCurveTo(48, 54, 52, 48.5); g.closePath(); g.fill();
    g.fillStyle = gray(0.9); g.fillRect(45.5, 48.6, 5, 0.9);
  } else if (pose === "phone") {
    g.beginPath(); g.ellipse(47.5, 50, 2.3, 0.7 + 1.4 * Math.abs(Math.sin(tt * 13)), 0, 0, Math.PI * 2); g.fill();
  } else {
    g.beginPath(); g.arc(48, 46, 3.8, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  }

  // Bangs
  curls([[37,23,5.5],[44,20,6],[52,20,6],[59,23,5.5],[32.5,28,4.2],[63.5,28,4.2]], hairG);

  // Phone lives in head space so it stays on her ear as she tilts
  if (pose === "phone") {
    g.save(); g.translate(66.5, 42); g.rotate(0.22);
    rrect(-4.2, -9.5, 8.4, 19, 1.8); g.fillStyle = gray(0.05); g.fill();
    rrect(-3.2, -8.5, 6.4, 17, 1.2); g.fillStyle = LIME_MARK; g.fill();
    g.restore();
  }
  g.restore();

  // Arms and props
  if (pose === "wave") {
    const a = 0.5 * Math.sin(tt * 9);
    const sh = [73, 70 + breathe], el = compact ? [79, 63] : [85, 62];
    const L = compact ? 11 : 13;
    const hd = [el[0] + Math.sin(a) * L, el[1] - Math.cos(a) * L];
    limb([sh, el, hd], 7, 0.6);
    hand(hd[0], hd[1]);
    g.fillStyle = gray(0.06);
    for (let f = -1; f <= 1; f++) g.fillRect(hd[0] + f * 1.6 + Math.sin(a) * 3, hd[1] - 4.6, 0.8, 1.6);
  } else if (pose === "phone") {
    limb([[73, 70 + breathe], [80, 84], [69, 56]], 7, 0.6);
    hand(68.5, 53, 3.8);
  } else if (pose === "type") {
    // Forearms reach toward the keyboard, hidden behind the lid
    const kL = Math.abs(Math.sin(tt * 14)) * 1.2, kR = Math.abs(Math.sin(tt * 14 + Math.PI / 2)) * 1.2;
    limb([[23, 76], [30, 94 - kL]], 7, 0.58);
    limb([[73, 76], [66, 94 - kR]], 7, 0.58);
    // Desk
    g.fillStyle = gray(0.06); g.fillRect(0, 99, GW, 13);
    const dg = g.createLinearGradient(0, 100, 0, 112);
    dg.addColorStop(0, gray(0.92)); dg.addColorStop(1, gray(0.45));
    g.fillStyle = dg; g.fillRect(0, 100.5, GW, 11.5);
    // Lid (back of screen)
    rrect(27, 72, 42, 28, 2.2); g.fillStyle = gray(0.05); g.fill();
    rrect(28, 73, 40, 26.5, 1.6); g.fillStyle = LIME_MARK; g.fill();
    g.fillStyle = gray(0);
    if (SHOW_LOGO) for (const [i, j] of logoCells()) g.fillRect(39 + i, 77 + j, 1, 1);
    // Hinge and base slab
    g.fillStyle = gray(0.05); g.fillRect(24, 99.5, 48, 4);
    g.fillStyle = gray(0.78); g.fillRect(25, 100, 46, 1.6);
    g.fillStyle = gray(0.35); g.fillRect(25, 101.6, 46, 1.4);
    g.fillStyle = gray(0.05); g.fillRect(27, 103.5, 3, 1); g.fillRect(66, 103.5, 3, 1);
  }
}




const TIMELINE = [
    { k: "assemble", pose: "wave" as Pose, d: 2.6, glitch: false },
    { k: "hold", pose: "wave" as Pose, d: 2.8, glitch: false },
    { k: "hold", pose: "phone" as Pose, d: 3.6, glitch: true },
    { k: "hold", pose: "type" as Pose, d: 3.8, glitch: true },
    { k: "scatter", pose: "type" as Pose, d: 1.6, glitch: false },
    { k: "gap", pose: null as Pose | null, d: 0.6, glitch: false },
]
const TOTAL = TIMELINE.reduce((a, s) => a + s.d, 0)

export default function PixelCharacter({
    pose = "auto",
    cell = 5,
    ink = "#FFFFFF",
    background = "#000000",
    accent = "#E3F988",
    showLogo = true,
    className,
    style,
    ariaLabel = "A pixel-art character with curly hair forms from a wave of pixels, waves, takes a call, then types on a laptop.",
}: PixelCharacterProps) {
    const ref = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = ref.current
        if (!canvas) return
        REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        SHOW_LOGO = showLogo
        const ctx = canvas.getContext("2d")!
        const off = document.createElement("canvas"); off.width = GW; off.height = GH
        const offCtx = off.getContext("2d", { willReadFrequently: true })!
        const S = cell
        const start = performance.now()
        const locked = pose !== "auto" || REDUCED
        let seed = 1, raf = 0, lockedAt = start
        const W: number[] = [], B: number[] = [], A: number[] = [], SPR: number[] = []

        const frame = (now: number) => {
            const t = (now - start) / 1000
            let seg: (typeof TIMELINE)[number], local: number
            if (!locked) {
                let tt = t % TOTAL
                seg = TIMELINE[0]; local = 0
                for (const s of TIMELINE) { if (tt < s.d) { seg = s; local = tt; break } tt -= s.d }
            } else {
                seg = { k: "hold", pose: (pose === "auto" ? "wave" : pose) as Pose, d: 0, glitch: true }
                local = (now - lockedAt) / 1000
            }
            ctx.fillStyle = background
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            if (!seg.pose) { raf = requestAnimationFrame(frame); return }

            g = offCtx
            drawCharacter(seg.pose, t, false)
            const data = g.getImageData(0, 0, GW, GH).data
            const p = seg.d ? local / seg.d : 1
            const gk = seg.glitch && !REDUCED ? clamp(1 - local / 0.4) : 0
            if (seg.glitch && local < 0.02) seed = Math.floor(t * 10)

            W.length = 0; B.length = 0; A.length = 0; SPR.length = 0
            for (let y = 0; y < GH; y++) {
                const rowShift = gk > 0 && hash(0, y, 8 + seed) < 0.35 ? (hash(1, y, 9 + seed) - 0.5) * 14 * gk : 0
                for (let x = 0; x < GW; x++) {
                    const i = (y * GW + x) * 4
                    if (data[i + 3] < 128) continue
                    const r = data[i], gr = data[i + 1], b = data[i + 2]
                    const list = gr > 180 && r < 90 && b < 90 ? A : r / 255 > BAYER[(y & 3) * 4 + (x & 3)] ? W : B
                    let dx = x + rowShift, dy = y
                    const h1 = hash(x, y, 1), h2 = hash(x, y, 2), h3 = hash(x, y, 3)
                    if (seg.k === "assemble") {
                        const d = ((x / GW) * 0.55 + (1 - y / GH) * 0.2) * 0.62 + h1 * 0.1
                        const raw = (p - d) / 0.42, q = clamp(raw)
                        const sx = -30 - h2 * 70, sy = GH + 8 + h3 * 40
                        dx = sx + (x - sx) * easeOutBack(q)
                        dy = sy + (y - sy) * (1 - Math.pow(1 - q, 3)) - Math.sin(Math.PI * q) * (38 + h2 * 34)
                        if (raw > 1 && raw < 1.5 && h1 < 0.1) {
                            const k = (raw - 1) / 0.5
                            SPR.push(Math.round(x + (18 + h2 * 30) * k), Math.round(y - (22 + h3 * 22) * k + 40 * k * k))
                        }
                    } else if (seg.k === "scatter") {
                        const d = ((1 - x / GW) * 0.5 + (y / GH) * 0.2) * 0.55 + h1 * 0.1
                        const q = clamp((p - d) / 0.45), e = q * q * q
                        const tx = GW + 30 + h2 * 70, ty = -20 - h3 * 50
                        dx = x + (tx - x) * e
                        dy = y + (ty - y) * e - Math.sin(Math.PI * q) * (20 + h2 * 20)
                    }
                    list.push(Math.round(dx), Math.round(dy))
                }
            }
            const paint = (arr: number[], color: string) => { ctx.fillStyle = color; for (let k = 0; k < arr.length; k += 2) ctx.fillRect(arr[k] * S, arr[k + 1] * S, S, S) }
            paint(B, background); paint(W, ink); paint(A, accent); paint(SPR, ink)
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
        return () => cancelAnimationFrame(raf)
    }, [pose, cell, ink, background, accent, showLogo])

    return (
        <canvas
            ref={ref}
            width={GW * cell}
            height={GH * cell}
            role="img"
            aria-label={ariaLabel}
            className={className}
            style={{ width: "100%", height: "auto", aspectRatio: `${GW} / ${GH}`, imageRendering: "pixelated", display: "block", ...style }}
        />
    )
}
