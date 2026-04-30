// ── Memory Video Styles ────────────────────────────────────────────────────
// Each style defines:
//   • preprocess()   — sharp pipeline producing the per-photo "card"
//   • kenBurns(i)    — ffmpeg zoompan/scale filter (post-loop input)
//   • transition(i)  — xfade transition name to use BETWEEN slide i and i+1
//   • durationScale  — optional multiplier on per-photo duration for pacing

import sharp from "sharp";
import path from "path";

export type MemoryStyle =
  | "cinematic"
  | "polaroid"
  | "filmstrip"
  | "bollywood"
  | "vintage"
  | "storybook";

export interface StyleMeta {
  id: MemoryStyle;
  label: string;
  description: string;
  /** A music mood hint we can feed to AI prompts when none is supplied. */
  defaultMusicPrompt: string;
}

export const STYLE_META: StyleMeta[] = [
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Blurred backdrop, gentle Ken Burns motion, crossfades. Classic & tasteful.",
    defaultMusicPrompt:
      "A cinematic emotional orchestral instrumental with soft piano, rising strings and warm percussion",
  },
  {
    id: "polaroid",
    label: "Polaroid Memories",
    description: "Photos appear as polaroid prints on a wood/paper backdrop with light tilt.",
    defaultMusicPrompt:
      "A warm acoustic instrumental with ukulele, soft piano and gentle percussion, nostalgic family vibe",
  },
  {
    id: "filmstrip",
    label: "Filmstrip",
    description: "Vertical filmstrip frames with sprockets, sliding transitions.",
    defaultMusicPrompt:
      "A retro indie folk instrumental with acoustic guitar, light percussion and a vintage feel",
  },
  {
    id: "bollywood",
    label: "Bollywood Beat",
    description: "Vivid colors, punchy zooms, energetic transitions. Made for celebrations.",
    defaultMusicPrompt:
      "An energetic upbeat Indian Bollywood-style instrumental with dhol percussion, sitar, flute and uplifting melody",
  },
  {
    id: "vintage",
    label: "Vintage Film",
    description: "Sepia tone, film grain, light leaks. Old-photo-album feel.",
    defaultMusicPrompt:
      "A vintage instrumental waltz with old piano, brushed drums and warm vinyl crackle, nostalgic 1950s",
  },
  {
    id: "storybook",
    label: "Storybook",
    description: "Parchment backdrop with hand-drawn frame; page-flip transitions.",
    defaultMusicPrompt:
      "A magical children's instrumental with celesta, harp, soft strings and a whimsical fairytale mood",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function makeWoodBackdrop(w: number, h: number): Buffer | string {
  // SVG warm wood / craft-paper gradient with subtle grain.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#5a3a22"/>
        <stop offset="50%" stop-color="#3d2814"/>
        <stop offset="100%" stop-color="#2a1a0c"/>
      </linearGradient>
      <radialGradient id="vg" cx="50%" cy="45%" r="75%">
        <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" fill="url(#vg)"/>
  </svg>`;
  return Buffer.from(svg);
}

function makeParchmentBackdrop(w: number, h: number): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="p" cx="50%" cy="40%" r="80%">
        <stop offset="0%" stop-color="#f3e6c7"/>
        <stop offset="60%" stop-color="#dcc89a"/>
        <stop offset="100%" stop-color="#9a7c4a"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#p)"/>
  </svg>`;
  return Buffer.from(svg);
}

function makeBollywoodBackdrop(w: number, h: number, idx: number): Buffer {
  const palettes = [
    ["#ff3d7f", "#ffb142", "#ff6b6b"],
    ["#7c3aed", "#ec4899", "#f59e0b"],
    ["#10b981", "#0ea5e9", "#8b5cf6"],
    ["#ef4444", "#f59e0b", "#fbbf24"],
    ["#dc2626", "#ea580c", "#facc15"],
    ["#9333ea", "#db2777", "#f97316"],
  ];
  const p = palettes[idx % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="80%">
        <stop offset="0%" stop-color="${p[0]}"/>
        <stop offset="55%" stop-color="${p[1]}"/>
        <stop offset="100%" stop-color="${p[2]}"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <g opacity="0.18">
      ${Array.from({ length: 60 })
        .map((_, i) => {
          const x = (i * 73) % w;
          const y = (i * 137 + 50) % h;
          const r = 4 + ((i * 7) % 40);
          return `<circle cx="${x}" cy="${y}" r="${r}" fill="white"/>`;
        })
        .join("")}
    </g>
  </svg>`;
  return Buffer.from(svg);
}

function makeFilmstripBackdrop(w: number, h: number): Buffer {
  // Black background with a vertical band of "sprocket holes" on each side.
  const holeSize = Math.round(h / 28);
  const sideMargin = Math.round(w * 0.06);
  let holes = "";
  for (let y = holeSize; y < h - holeSize; y += holeSize * 2) {
    holes += `<rect x="${sideMargin / 2 - holeSize / 2}" y="${y}" width="${holeSize}" height="${holeSize}" rx="3" fill="#0a0a0a"/>`;
    holes += `<rect x="${w - sideMargin / 2 - holeSize / 2}" y="${y}" width="${holeSize}" height="${holeSize}" rx="3" fill="#0a0a0a"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="#1a1a1a"/>
    <rect x="0" y="0" width="${sideMargin}" height="${h}" fill="#262626"/>
    <rect x="${w - sideMargin}" y="0" width="${sideMargin}" height="${h}" fill="#262626"/>
    ${holes}
  </svg>`;
  return Buffer.from(svg);
}

// ── Per-style preprocessing ────────────────────────────────────────────────

export interface PreprocessCtx {
  src: string;
  w: number;
  h: number;
  index: number;
  workDir: string;
}

async function ppCinematic(ctx: PreprocessCtx): Promise<string> {
  const { src, w, h, index, workDir } = ctx;
  const dst = path.join(workDir, `norm_${String(index).padStart(4, "0")}.jpg`);
  const backdrop = await sharp(src)
    .rotate()
    .resize(w, h, { fit: "cover" })
    .blur(28)
    .modulate({ brightness: 0.7, saturation: 0.9 })
    .toBuffer();
  const fg = await sharp(src)
    .rotate()
    .resize(w, h, { fit: "inside" })
    .toBuffer();
  const m = await sharp(fg).metadata();
  const left = Math.round((w - (m.width || w)) / 2);
  const top = Math.round((h - (m.height || h)) / 2);
  await sharp(backdrop)
    .composite([{ input: fg, left, top }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dst);
  return dst;
}

async function ppPolaroid(ctx: PreprocessCtx): Promise<string> {
  const { src, w, h, index, workDir } = ctx;
  const dst = path.join(workDir, `norm_${String(index).padStart(4, "0")}.jpg`);
  // Polaroid card: white frame with bottom margin; tilt; soft drop shadow.
  const innerW = Math.round(w * 0.72);
  const innerH = Math.round(innerW * 1.0); // square photo
  const bottomPad = Math.round(innerH * 0.18);
  const cardW = innerW + 40;
  const cardH = innerH + 40 + bottomPad;

  const photoBuf = await sharp(src)
    .rotate()
    .resize(innerW, innerH, { fit: "cover", position: "attention" })
    .toBuffer();

  const cardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}">
    <rect width="${cardW}" height="${cardH}" rx="6" fill="#fafafa"/>
  </svg>`;
  const card = await sharp(Buffer.from(cardSvg))
    .composite([{ input: photoBuf, left: 20, top: 20 }])
    .png()
    .toBuffer();

  // Slight rotation (alternating)
  const rotation = index % 2 === 0 ? -3 : 3;
  const rotated = await sharp(card)
    .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const rMeta = await sharp(rotated).metadata();
  const rw = rMeta.width || cardW;
  const rh = rMeta.height || cardH;

  const backdrop = await sharp(makeWoodBackdrop(w, h), {
    raw: undefined,
  } as never)
    .jpeg({ quality: 90 })
    .toBuffer();

  await sharp(backdrop)
    .composite([
      {
        input: rotated,
        left: Math.round((w - rw) / 2),
        top: Math.round((h - rh) / 2),
      },
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dst);
  return dst;
}

async function ppFilmstrip(ctx: PreprocessCtx): Promise<string> {
  const { src, w, h, index, workDir } = ctx;
  const dst = path.join(workDir, `norm_${String(index).padStart(4, "0")}.jpg`);
  const sideMargin = Math.round(w * 0.06);
  const inset = Math.round(w * 0.04);
  const photoW = w - sideMargin * 2 - inset * 2;
  const photoH = Math.round(h * 0.78);
  const photoBuf = await sharp(src)
    .rotate()
    .resize(photoW, photoH, { fit: "cover" })
    .toBuffer();
  const backdrop = await sharp(makeFilmstripBackdrop(w, h))
    .jpeg()
    .toBuffer();
  const top = Math.round((h - photoH) / 2);
  const left = sideMargin + inset;
  await sharp(backdrop)
    .composite([{ input: photoBuf, left, top }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dst);
  return dst;
}

async function ppBollywood(ctx: PreprocessCtx): Promise<string> {
  const { src, w, h, index, workDir } = ctx;
  const dst = path.join(workDir, `norm_${String(index).padStart(4, "0")}.jpg`);
  const backdrop = await sharp(makeBollywoodBackdrop(w, h, index)).jpeg().toBuffer();
  const fg = await sharp(src)
    .rotate()
    .resize(Math.round(w * 0.92), Math.round(h * 0.85), { fit: "inside" })
    .modulate({ saturation: 1.25, brightness: 1.05 })
    .toBuffer();
  const m = await sharp(fg).metadata();
  // Add a thin white border around the photo for a poster feel
  const fw = (m.width || 0) + 16;
  const fh = (m.height || 0) + 16;
  const framed = await sharp({
    create: {
      width: fw,
      height: fh,
      channels: 3,
      background: "#ffffff",
    },
  })
    .composite([{ input: fg, left: 8, top: 8 }])
    .jpeg()
    .toBuffer();
  await sharp(backdrop)
    .composite([
      {
        input: framed,
        left: Math.round((w - fw) / 2),
        top: Math.round((h - fh) / 2),
      },
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dst);
  return dst;
}

async function ppVintage(ctx: PreprocessCtx): Promise<string> {
  const { src, w, h, index, workDir } = ctx;
  const dst = path.join(workDir, `norm_${String(index).padStart(4, "0")}.jpg`);
  // Sepia tone via tint + desaturate; add slight vignette.
  const backdrop = await sharp(src)
    .rotate()
    .resize(w, h, { fit: "cover" })
    .blur(20)
    .modulate({ brightness: 0.55, saturation: 0.4 })
    .tint({ r: 175, g: 130, b: 90 })
    .toBuffer();
  const fg = await sharp(src)
    .rotate()
    .resize(w, h, { fit: "inside" })
    .modulate({ brightness: 1.0, saturation: 0.55 })
    .tint({ r: 220, g: 188, b: 140 })
    .toBuffer();
  const m = await sharp(fg).metadata();
  const left = Math.round((w - (m.width || w)) / 2);
  const top = Math.round((h - (m.height || h)) / 2);
  await sharp(backdrop)
    .composite([{ input: fg, left, top }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dst);
  return dst;
}

async function ppStorybook(ctx: PreprocessCtx): Promise<string> {
  const { src, w, h, index, workDir } = ctx;
  const dst = path.join(workDir, `norm_${String(index).padStart(4, "0")}.jpg`);
  const innerW = Math.round(w * 0.78);
  const innerH = Math.round(h * 0.6);
  const photo = await sharp(src)
    .rotate()
    .resize(innerW, innerH, { fit: "cover" })
    .modulate({ saturation: 1.05, brightness: 1.02 })
    .toBuffer();
  const cardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${innerW + 40}" height="${innerH + 40}">
    <rect width="${innerW + 40}" height="${innerH + 40}" rx="10" fill="#fffaf0" stroke="#7a5a2a" stroke-width="3"/>
  </svg>`;
  const card = await sharp(Buffer.from(cardSvg))
    .composite([{ input: photo, left: 20, top: 20 }])
    .png()
    .toBuffer();
  const backdrop = await sharp(makeParchmentBackdrop(w, h)).jpeg().toBuffer();
  const cm = await sharp(card).metadata();
  await sharp(backdrop)
    .composite([
      {
        input: card,
        left: Math.round((w - (cm.width || 0)) / 2),
        top: Math.round((h - (cm.height || 0)) / 2),
      },
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dst);
  return dst;
}

export async function preprocessForStyle(
  style: MemoryStyle,
  ctx: PreprocessCtx
): Promise<string> {
  switch (style) {
    case "polaroid":
      return ppPolaroid(ctx);
    case "filmstrip":
      return ppFilmstrip(ctx);
    case "bollywood":
      return ppBollywood(ctx);
    case "vintage":
      return ppVintage(ctx);
    case "storybook":
      return ppStorybook(ctx);
    case "cinematic":
    default:
      return ppCinematic(ctx);
  }
}

// ── Per-style ffmpeg filter chunks (after [N:v]setsar=1,fps=30,) ───────────

const ZOOM_BANK: ((i: number, frames: number, w: number, h: number) => string)[] = [
  // 0: zoom-in
  (_i, _f, w, h) =>
    `zoompan=z='min(1+0.0009*on,1.18)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
  // 1: zoom-out
  (_i, _f, w, h) =>
    `zoompan=z='if(eq(on,0),1.18,max(zoom-0.0009,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
  // 2: pan right
  (_i, f, w, h) =>
    `zoompan=z='1.12':x='(iw-iw/zoom)*on/${f}':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
  // 3: pan left
  (_i, f, w, h) =>
    `zoompan=z='1.12':x='(iw-iw/zoom)*(1-on/${f})':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
  // 4: diag
  (_i, f, w, h) =>
    `zoompan=z='min(1+0.0008*on,1.16)':x='(iw-iw/zoom)*on/${f}':y='(ih-ih/zoom)*on/${f}':d=1:s=${w}x${h}:fps=30`,
];

/** Bollywood: sharper, faster zoom punches. */
const BOLLYWOOD_ZOOM_BANK: ((i: number, frames: number, w: number, h: number) => string)[] = [
  (_i, _f, w, h) =>
    `zoompan=z='min(1+0.0018*on,1.32)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
  (_i, _f, w, h) =>
    `zoompan=z='if(eq(on,0),1.32,max(zoom-0.0018,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
  (_i, f, w, h) =>
    `zoompan=z='1.22':x='(iw-iw/zoom)*on/${f}':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
];

/** Polaroid: very subtle motion (the photo card itself is the focus). */
const POLAROID_ZOOM_BANK: ((i: number, frames: number, w: number, h: number) => string)[] = [
  (_i, _f, w, h) =>
    `zoompan=z='min(1+0.0004*on,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
  (_i, _f, w, h) =>
    `zoompan=z='if(eq(on,0),1.07,max(zoom-0.0004,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
];

/** Vintage: slow, gentle. */
const VINTAGE_ZOOM_BANK: ((i: number, frames: number, w: number, h: number) => string)[] = [
  (_i, _f, w, h) =>
    `zoompan=z='min(1+0.0006*on,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
  (_i, f, w, h) =>
    `zoompan=z='1.08':x='(iw-iw/zoom)*on/${f}':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
];

export function kenBurnsForStyle(
  style: MemoryStyle,
  i: number,
  frames: number,
  w: number,
  h: number
): string {
  let bank = ZOOM_BANK;
  if (style === "polaroid" || style === "storybook") bank = POLAROID_ZOOM_BANK;
  else if (style === "bollywood") bank = BOLLYWOOD_ZOOM_BANK;
  else if (style === "vintage") bank = VINTAGE_ZOOM_BANK;
  return bank[i % bank.length](i, frames, w, h);
}

// ── Per-style xfade transitions ────────────────────────────────────────────

const TRANSITIONS: Record<MemoryStyle, string[]> = {
  cinematic: ["fade"],
  polaroid: ["slidedown", "slideup", "fade"],
  filmstrip: ["slideleft", "slideright"],
  bollywood: ["circleopen", "radial", "pixelize", "circleclose", "fade"],
  vintage: ["fadeblack"],
  storybook: ["wipeleft", "wiperight", "horzclose"],
};

export function transitionForStyle(style: MemoryStyle, i: number): string {
  const list = TRANSITIONS[style] || TRANSITIONS.cinematic;
  return list[i % list.length];
}

/** Optional video-wide post-processing filter (e.g., film grain for vintage). */
export function postFilterForStyle(style: MemoryStyle): string | null {
  if (style === "vintage") {
    // Film grain via noise + slight curves.
    return `noise=alls=8:allf=t+u,eq=contrast=1.05:saturation=0.9`;
  }
  if (style === "bollywood") {
    return `eq=saturation=1.12:contrast=1.05`;
  }
  return null;
}
