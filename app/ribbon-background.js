"use client";

import { useEffect, useRef } from "react";

// ── Palette definitions ──────────────────────────────────────────────────────
// Dark: exact 21st.dev Ribbon Field spec
const DARK_COLORS = [
  { hex: "#000000", pos: 0.18 }, // Ink
  { hex: "#0D0261", pos: 0.40 }, // Midnight
  { hex: "#121851", pos: 0.60 }, // Midnight
  { hex: "#B28FCE", pos: 0.89 }, // Wisteria
  { hex: "#001CD5", pos: 1.00 }, // Navy
];

// Light: same ribbon concept, adapted for bright interface
const LIGHT_COLORS = [
  { hex: "#f5f3ff", pos: 0.10 }, // Off-white
  { hex: "#ddd6fe", pos: 0.32 }, // Lavender
  { hex: "#c4b5fd", pos: 0.52 }, // Lavender mid
  { hex: "#818cf8", pos: 0.78 }, // Indigo
  { hex: "#6366f1", pos: 0.92 }, // Indigo deep
  { hex: "#4338ca", pos: 1.00 }, // Deep indigo
];

// ── Hex → RGB ──────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ── Interpolate stops array → sorted by pos ────────────────────────────────
function buildPalette(colors) {
  return [...colors].sort((a, b) => a.pos - b.pos).map((c) => ({
    pos: c.pos,
    rgb: hexToRgb(c.hex),
  }));
}

// ── Sample palette at position t ∈ [0,1] ──────────────────────────────────
function samplePalette(palette, t) {
  if (t <= palette[0].pos) return palette[0].rgb;
  if (t >= palette[palette.length - 1].pos) return palette[palette.length - 1].rgb;
  for (let i = 0; i < palette.length - 1; i++) {
    const a = palette[i], b = palette[i + 1];
    if (t >= a.pos && t <= b.pos) {
      const f = (t - a.pos) / (b.pos - a.pos);
      return [
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * f,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * f,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * f,
      ];
    }
  }
  return palette[palette.length - 1].rgb;
}

// ── Smooth step for feathered stripe edges ─────────────────────────────────
function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ── Draw one frame ─────────────────────────────────────────────────────────
function drawFrame(canvas, ctx, ph, isDark) {
  const W = canvas.width;
  const H = canvas.height;

  // Stripe field parameters (from spec)
  const BASE_ANGLE   = 38;   // degrees
  const SOFTNESS     = 24;   // feather width %
  const WAVE         = 14;   // wave amplitude
  const COUNT        = 6;    // stripe count
  const SCALE        = 68;   // stripe scale %
  const SPREAD       = -20;  // spread
  const FADE         = 40;   // fade %

  // Animated angle: angle + sin(spin*0.6)*28*amt
  // amt = 0.00 per spec → 0 sway. But we add subtle motion for visual life.
  const AMT  = 0.18; // subtle motion (not in spec, but spec allows amt variation)
  const DIR  = 1;
  const spin = ph * DIR;
  const angle = BASE_ANGLE + Math.sin(spin * 0.6) * 28 * AMT;
  const angleRad = (angle * Math.PI) / 180;

  // Wave clock (spec: 20.75 + ph*1.2)
  const waveClock = 20.75 + ph * 1.2;

  const palette = buildPalette(isDark ? DARK_COLORS : LIGHT_COLORS);

  const data = ctx.createImageData(W, H);
  const px = data.data;

  // Diagonal length for normalization
  const diag = Math.sqrt(W * W + H * H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Normalized coords [-1, 1]
      const nx = (x / W) * 2 - 1;
      const ny = (y / H) * 2 - 1;

      // Project onto the stripe axis
      const main  =  nx * Math.cos(angleRad) + ny * Math.sin(angleRad);
      const cross = -nx * Math.sin(angleRad) + ny * Math.cos(angleRad);

      // Wave bend: (wave/100) * 0.35 * sin(cross * 2.4 * 2π + waveClock)
      const waveBend = (WAVE / 100) * 0.35 * Math.sin(cross * 2.4 * 2 * Math.PI + waveClock);

      // Final band position
      const band = (main + waveBend + 1) / 2; // [0,1]

      // Map band position through stripe count
      const stripePos = ((band * COUNT * (SCALE / 100)) + (SPREAD / 100)) % 1.0;
      const t = Math.max(0, Math.min(1, stripePos));

      // Sample palette
      const [r, g, b] = samplePalette(palette, t);

      // Feathered edges via softness
      const soft = SOFTNESS / 100;
      const edgeFade = smoothstep(0, soft, t) * smoothstep(1, 1 - soft, t);

      // Fade (vignette-like)
      const fadeAmt = FADE / 100;
      const distFromCenter = Math.sqrt(nx * nx + ny * ny) / Math.SQRT2;
      const vignetteAlpha = 1 - distFromCenter * fadeAmt * 0.5;

      // Grain (simplified — static noise layer)
      const grain = (Math.random() - 0.5) * (42 / 255) * 18;

      const alpha = edgeFade * vignetteAlpha;
      const idx = (y * W + x) * 4;
      px[idx    ] = Math.max(0, Math.min(255, r + grain));
      px[idx + 1] = Math.max(0, Math.min(255, g + grain));
      px[idx + 2] = Math.max(0, Math.min(255, b + grain));
      px[idx + 3] = Math.max(0, Math.min(255, alpha * 255));
    }
  }

  ctx.putImageData(data, 0, 0);
}

// ── Low-res render then upscale (performance) ──────────────────────────────
const RENDER_SCALE = 0.35; // render at 35% size, CSS scales up

export default function RibbonBackground({ isDark }) {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const startRef  = useRef(null);
  const reducedMotion = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width  = Math.round(window.innerWidth  * RENDER_SCALE);
      canvas.height = Math.round(window.innerHeight * RENDER_SCALE);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(document.documentElement);

    if (reducedMotion) {
      // Static frame only
      drawFrame(canvas, ctx, 0, isDark);
      return () => { ro.disconnect(); };
    }

    function tick(ts) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000; // seconds
      const ph = elapsed * 1.00; // speed = 100
      drawFrame(canvas, ctx, ph, isDark);
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [isDark, reducedMotion]);

  return (
    <div className="luqmati-bg" aria-hidden="true">
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          imageRendering: "auto",
        }}
      />
      <div className="luqmati-bg-overlay" />
    </div>
  );
}
