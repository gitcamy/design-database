import React, { useEffect, useRef } from "react";

// Turns any photograph into a false-color stipple illustration. The image is
// cut into flat tones by luminance, and each tone is swapped for a fixed
// unnatural color: shadow to near-black, midtones to two neon greens,
// highlights to warm paper. Midtone pixels that are clearly blue (water) take
// the water color, and warm ones (dry grass, earth, light at the edge of a
// shadow) take the ochre accent. There are no gradients: all shading comes from per-pixel noise added
// to luminance before it is cut, and each pixel samples the image at a small
// random offset, so tone boundaries become 20 to 40px bands of mixed specks
// instead of hard edges. Every speck also gets a small random hue
// rotation and brightness offset, and over water the noise is stretched into
// short horizontal streaks.
//
// One WebGL fragment shader, one draw per prop change. The grain is frozen
// unless grainFps > 0, which rerolls the noise seed for a live shimmer.

const DEFAULT_PALETTE = {
  paper: "#EEEAE7",
  shadow: "#24261E",
  deep: "#12AD49",
  bright: "#19D57B",
  accent: "#D9B03A",
  water: "#32ADC4",
};

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform sampler2D uImage;
uniform vec2 uRes, uImgRes;
uniform float uSeed, uDither, uGrain, uHue, uStreak, uSpeck, uWaterBias, uWarmBias, uFeather;
uniform vec3 uT;
uniform vec3 uPaper, uShadow, uDeep, uBright, uAccent, uWater;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973) + uSeed * 0.0137);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec3 hueRotate(vec3 c, float a) {
  vec3 k = vec3(0.57735);
  float cs = cos(a), sn = sin(a);
  return c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs);
}

void main() {
  vec2 px = floor(gl_FragCoord.xy / uGrain);
  // Cover-fit the image, origin top left.
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float s = max(uRes.x / uImgRes.x, uRes.y / uImgRes.y);
  vec2 uv = (frag - 0.5 * uRes) / (uImgRes * s) + 0.5;
  // Feathering: each pixel reads a random neighbour within uFeather px, with
  // the offset concentrated near the centre. Where two areas of tone meet,
  // pixels on either side pick from both, so the boundary becomes a band of
  // mixed specks of the two real tones, never an in-between tone.
  float r = uFeather * hash(px + 91.7) * hash(px + 7.3);
  float a = 6.2832 * hash(px + 43.1);
  vec2 jit = vec2(cos(a), sin(a)) * r / (uImgRes * s);
  vec3 c = texture2D(uImage, uv + jit).rgb;
  float L = dot(c, vec3(0.299, 0.587, 0.114));
  bool water = c.b - max(c.r, c.g) > uWaterBias;
  bool warm = c.r - c.g > -uWarmBias && c.r > c.b + 0.08;

  // Triangular noise in [-1, 1]. Over water it is held across uStreak cells
  // horizontally, which reads as ripples.
  vec2 np = water ? vec2(floor(px.x / uStreak), px.y) : px;
  float n = hash(np) + hash(np + 17.31) - 1.0;
  float Lh = L + n * uDither;

  vec3 col;
  if (Lh < uT.x) col = uShadow;
  else if (Lh < uT.z) col = water ? uWater : warm ? uAccent : Lh < uT.y ? uDeep : uBright;
  else col = uPaper;

  // Per-speck variation: grey specks in the shadow, hue and brightness jitter.
  if (Lh < uT.x && hash(px + 53.7) < uSpeck) col += 0.11;
  col = hueRotate(col, (hash(px + 31.9) - 0.5) * 2.0 * uHue);
  col *= 1.0 + (hash(px + 71.3) - 0.5) * 0.12;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const v = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function compile(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export default function FalseColorStipple({
  src,
  palette = DEFAULT_PALETTE,
  thresholds = [0.2, 0.4, 0.76],
  dither = 0.12,
  feather = 16,
  grain = 1,
  hueJitter = 8,
  streak = 6,
  speckle = 0.04,
  waterBias = 0.04,
  warmBias = 0.06,
  grainFps = 0,
  seed = 1,
  alt = "",
  className,
  style,
}) {
  const canvasRef = useRef(null);
  const glRef = useRef(null); // { gl, prog, loc, tex, img }
  const propsRef = useRef(null);
  const seedRef = useRef(seed);
  propsRef.current = { palette: { ...DEFAULT_PALETTE, ...palette }, thresholds, dither, feather, grain, hueJitter, streak, speckle, waterBias, warmBias };

  const draw = () => {
    const ctx = glRef.current;
    if (!ctx || !ctx.img) return;
    const { gl, loc } = ctx;
    const p = propsRef.current;
    const dpr = window.devicePixelRatio || 1;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(loc.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(loc.uImgRes, ctx.img.width, ctx.img.height);
    gl.uniform1f(loc.uSeed, seedRef.current);
    gl.uniform1f(loc.uDither, p.dither);
    gl.uniform1f(loc.uGrain, Math.max(1, p.grain * dpr));
    gl.uniform1f(loc.uHue, (p.hueJitter * Math.PI) / 180);
    gl.uniform1f(loc.uStreak, Math.max(1, p.streak));
    gl.uniform1f(loc.uSpeck, p.speckle);
    gl.uniform1f(loc.uWaterBias, p.waterBias);
    gl.uniform3f(loc.uT, ...p.thresholds);
    gl.uniform1f(loc.uFeather, p.feather * dpr);
    gl.uniform1f(loc.uWarmBias, p.warmBias);
    for (const k of ["paper", "shadow", "deep", "bright", "accent", "water"]) {
      gl.uniform3f(loc["u" + k[0].toUpperCase() + k.slice(1)], ...hexToRgb(p.palette[k]));
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // GL setup and canvas sizing, once.
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: true });
    if (!gl) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const loc = {};
    for (const u of ["uImage", "uRes", "uImgRes", "uSeed", "uDither", "uGrain", "uHue", "uStreak", "uSpeck", "uWaterBias", "uWarmBias", "uFeather", "uT", "uPaper", "uShadow", "uDeep", "uBright", "uAccent", "uWater"]) {
      loc[u] = gl.getUniformLocation(prog, u);
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    glRef.current = { gl, prog, loc, tex, img: null };

    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      draw();
    });
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      glRef.current = null;
    };
  }, []);

  // Load the image whenever src changes.
  useEffect(() => {
    if (!src) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = glRef.current;
      if (!alive || !ctx) return;
      const { gl } = ctx;
      gl.bindTexture(gl.TEXTURE_2D, ctx.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      ctx.img = img;
      draw();
    };
    img.src = src;
    return () => { alive = false; };
  }, [src]);

  // Redraw on any prop change.
  useEffect(() => {
    seedRef.current = seed;
    draw();
  });

  // Optional live shimmer.
  useEffect(() => {
    if (!grainFps) return;
    const id = setInterval(() => {
      seedRef.current = (seedRef.current + 1) % 997;
      draw();
    }, 1000 / grainFps);
    return () => clearInterval(id);
  }, [grainFps]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated", background: palette.paper || DEFAULT_PALETTE.paper, ...style }}
    />
  );
}
