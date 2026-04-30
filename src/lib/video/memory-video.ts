// ── Memory Video Renderer ──────────────────────────────────────────────────
// Multi-style server-side renderer.  Each photo is preprocessed via sharp
// according to the chosen style, then composited via FFmpeg with style-aware
// Ken Burns motion + xfade transitions, optional title, optional music.

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import {
  type MemoryStyle,
  preprocessForStyle,
  kenBurnsForStyle,
  transitionForStyle,
  postFilterForStyle,
} from "./memory-video-styles";

const execFileP = promisify(execFile);

export type Aspect = "9:16" | "16:9" | "1:1";

export interface MemoryPhoto {
  /** Absolute path to the source image (jpg/png/webp). */
  path: string;
  /** Optional caption shown on this slide. */
  caption?: string;
}

export interface MemoryEffects {
  /** Soft dark corners around the whole video. */
  vignette?: boolean;
  /** Cinematic black bars top & bottom (16:9 letterbox over vertical). */
  filmBorders?: boolean;
  /** Warm light flare at start + end of video. */
  lightLeak?: boolean;
  /** Persistent subtle film grain (independent of the vintage style). */
  filmGrain?: boolean;
}

export interface EndCardOptions {
  /** Big closing line, e.g. "Made with love". */
  title?: string;
  /** Smaller line beneath. */
  subtitle?: string;
  /** Background color, default "#000000". */
  background?: string;
  /** Seconds the end card stays on screen. Default 3. */
  duration?: number;
}

export interface MemoryVideoOptions {
  photos: MemoryPhoto[];
  /** Local file path to background music (mp3/wav/m4a). Optional. */
  musicPath?: string;
  /** 0..1, default 0.6 */
  musicVolume?: number;
  /** Seconds per photo (excluding crossfade). Default 3.5. */
  photoDuration?: number;
  /** Crossfade duration in seconds. Default 1.0. */
  transitionDuration?: number;
  /** Aspect ratio of the output. Default 9:16. */
  aspect?: Aspect;
  /** Optional title shown over the first slide. */
  title?: string;
  /** Optional subtitle (date / occasion) shown below the title. */
  subtitle?: string;
  /**
   * Where to place the title/subtitle overlay.  When the title is empty the
   * overlay is skipped regardless.  Default "bottom" (lower-third bar).
   */
  titlePosition?: "top" | "center" | "bottom";
  /** Visual extras layered after the slide chain. */
  effects?: MemoryEffects;
  /** Optional outro / end-card slide appended after the last photo. */
  endCard?: EndCardOptions;
  /** Where to write the rendered .mp4. */
  outputPath: string;
  /** Working dir for normalized frames. Will be created. */
  workDir: string;
  /** Frames per second. Default 30. */
  fps?: number;
  /** Visual style. Default "cinematic". */
  style?: MemoryStyle;
}

const ASPECT_DIMS: Record<Aspect, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "16:9": { w: 1920, h: 1080 },
  "1:1": { w: 1080, h: 1080 },
};

async function preprocessAll(
  photos: MemoryPhoto[],
  style: MemoryStyle,
  w: number,
  h: number,
  workDir: string
): Promise<string[]> {
  await fsp.mkdir(workDir, { recursive: true });
  const out: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const dst = await preprocessForStyle(style, {
      src: photos[i].path,
      w,
      h,
      index: i,
      workDir,
    });
    out.push(dst);
  }
  return out;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Stamp a centered text "card" onto a slide image using sharp+SVG.  Avoids
// dependency on ffmpeg's drawtext (libfreetype) which is missing in some
// builds.  `band` controls the y position of the text band.
async function bakeTextBand(
  slidePath: string,
  w: number,
  h: number,
  text: string,
  band: "top" | "center" | "bottom" | "caption-top" | "caption-bottom",
  options: { subtitle?: string; titleSize?: number; subSize?: number } = {}
): Promise<void> {
  const sharp = (await import("sharp")).default;
  const titleSize = options.titleSize || Math.round(Math.min(w, h) * 0.055);
  const subSize = options.subSize || Math.round(Math.min(w, h) * 0.032);
  const padX = 24;
  const padY = 16;
  const safeText = escapeXml(text);
  const safeSub = options.subtitle ? escapeXml(options.subtitle) : "";

  const titleW = Math.min(w - 80, Math.round(text.length * titleSize * 0.55) + padX * 2);
  const subW = safeSub
    ? Math.min(w - 80, Math.round(safeSub.length * subSize * 0.55) + padX * 2)
    : 0;
  const cardW = Math.max(titleW, subW);
  const titleH = titleSize + padY * 2;
  const subH = safeSub ? subSize + padY : 0;
  const gap = safeSub ? 8 : 0;
  const totalH = titleH + gap + subH;

  let bandY: number;
  switch (band) {
    case "top":
      bandY = Math.round(h * 0.08);
      break;
    case "bottom":
      bandY = h - totalH - Math.round(h * 0.12);
      break;
    case "caption-top":
      bandY = Math.round(h * 0.06);
      break;
    case "caption-bottom":
      bandY = h - totalH - Math.round(h * 0.12);
      break;
    case "center":
    default:
      bandY = Math.round((h - totalH) / 2);
  }
  const bandX = Math.round((w - cardW) / 2);

  const titleY = bandY + titleSize + padY * 0.6;
  const subY = bandY + titleH + gap + subSize;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="${bandX}" y="${bandY}" width="${cardW}" height="${titleH}" rx="10" ry="10" fill="rgba(0,0,0,0.55)"/>
    <text x="${w / 2}" y="${titleY}" text-anchor="middle"
          font-family="Helvetica, Arial, sans-serif" font-size="${titleSize}" font-weight="700" fill="#ffffff">${safeText}</text>
    ${
      safeSub
        ? `<rect x="${Math.round((w - subW) / 2)}" y="${bandY + titleH + gap}" width="${subW}" height="${subH}" rx="8" ry="8" fill="rgba(0,0,0,0.42)"/>
           <text x="${w / 2}" y="${subY}" text-anchor="middle"
                 font-family="Helvetica, Arial, sans-serif" font-size="${subSize}" fill="rgba(255,255,255,0.95)">${safeSub}</text>`
        : ""
    }
  </svg>`;

  const overlay = await sharp(Buffer.from(svg)).png().toBuffer();
  const composed = await sharp(slidePath)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();
  await fsp.writeFile(slidePath, composed);
}

// Render an end-card PNG using sharp.  Returns the file path.
async function renderEndCard(
  workDir: string,
  w: number,
  h: number,
  opts: EndCardOptions
): Promise<string> {
  const sharp = (await import("sharp")).default;
  const bg = opts.background || "#0a0a0a";
  const title = escapeXml(opts.title || "Thanks for watching");
  const subtitle = opts.subtitle ? escapeXml(opts.subtitle) : "";
  const titleSize = Math.round(Math.min(w, h) * 0.075);
  const subSize = Math.round(Math.min(w, h) * 0.04);
  const heartY = h / 2 - titleSize - 20;
  const titleY = h / 2 + 12;
  const subY = h / 2 + titleSize * 0.9 + 12;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="g" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="${bg}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="${heartY}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${titleSize}" fill="#ff6b9d">♥</text>
    <text x="50%" y="${titleY}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="${titleSize}" font-weight="700" fill="#ffffff">${title}</text>
    ${subtitle ? `<text x="50%" y="${subY}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${subSize}" fill="rgba(255,255,255,0.78)">${subtitle}</text>` : ""}
  </svg>`;
  const out = path.join(workDir, "endcard.png");
  await sharp(Buffer.from(svg)).png().toFile(out);
  return out;
}

// A horizontal warm flare PNG used for the optional light-leak effect.
async function renderLightLeak(workDir: string, w: number, h: number): Promise<string> {
  const sharp = (await import("sharp")).default;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="leak" cx="80%" cy="20%" r="80%">
        <stop offset="0%" stop-color="#ffd6a0" stop-opacity="0.9"/>
        <stop offset="40%" stop-color="#ff9a5a" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#leak)"/>
  </svg>`;
  const out = path.join(workDir, "lightleak.png");
  await sharp(Buffer.from(svg)).png().toFile(out);
  return out;
}

export async function renderMemoryVideo(
  opts: MemoryVideoOptions
): Promise<{ duration: number }> {
  const photos = opts.photos;
  if (!photos.length) throw new Error("At least one photo is required");

  const aspect = opts.aspect || "9:16";
  const { w, h } = ASPECT_DIMS[aspect];
  const fps = opts.fps || 30;
  const segDur = opts.photoDuration ?? 3.5;
  const fade = opts.transitionDuration ?? 1.0;
  const clipDur = segDur + fade;
  const photoTotal = photos.length * segDur + fade;
  const style: MemoryStyle = opts.style || "cinematic";
  const titlePosition = opts.titlePosition || "bottom";
  const effects: MemoryEffects = opts.effects || {};

  const framesDir = path.join(opts.workDir, "frames");
  const normalized = await preprocessAll(photos, style, w, h, framesDir);

  // Bake per-photo captions and title/subtitle directly into the slide PNGs
  // (FFmpeg's drawtext is not available in all builds).
  const captionBand: "caption-top" | "caption-bottom" =
    titlePosition === "bottom" ? "caption-top" : "caption-bottom";
  for (let i = 0; i < normalized.length; i++) {
    const cap = photos[i].caption?.trim();
    if (cap) {
      await bakeTextBand(normalized[i], w, h, cap, captionBand, {
        titleSize: Math.round(Math.min(w, h) * 0.038),
      });
    }
  }
  const titleStr = opts.title?.trim() || "";
  if (titleStr) {
    await bakeTextBand(normalized[0], w, h, titleStr, titlePosition, {
      subtitle: opts.subtitle?.trim() || undefined,
      titleSize: Math.round(Math.min(w, h) * 0.07),
      subSize: Math.round(Math.min(w, h) * 0.038),
    });
  }

  // Optional end-card image as an extra clip.
  const endCardEnabled = !!(opts.endCard && (opts.endCard.title || opts.endCard.subtitle));
  const endDur = endCardEnabled ? Math.max(1.5, Math.min(8, opts.endCard?.duration || 3)) : 0;
  const endCardPath = endCardEnabled
    ? await renderEndCard(opts.workDir, w, h, opts.endCard!)
    : null;

  // Optional light-leak overlay image.
  const leakEnabled = !!effects.lightLeak;
  const leakPath = leakEnabled ? await renderLightLeak(opts.workDir, w, h) : null;

  const totalDur = photoTotal + endDur;

  const args: string[] = ["-y", "-hide_banner", "-loglevel", "error"];
  for (const p of normalized) {
    args.push("-loop", "1", "-t", String(clipDur), "-i", p);
  }
  // Inputs after the photos: [endcard?] [music?] [lightleak?]
  let endCardIdx = -1;
  if (endCardPath) {
    args.push("-loop", "1", "-t", String(endDur + fade), "-i", endCardPath);
    endCardIdx = normalized.length;
  }

  const hasMusic = !!opts.musicPath && fs.existsSync(opts.musicPath!);
  let musicIdx = -1;
  if (hasMusic) {
    args.push("-stream_loop", "-1", "-i", opts.musicPath!);
    musicIdx = (endCardIdx >= 0 ? endCardIdx + 1 : normalized.length);
  }

  let leakIdx = -1;
  if (leakPath) {
    args.push("-loop", "1", "-t", String(totalDur), "-i", leakPath);
    const base = normalized.length + (endCardIdx >= 0 ? 1 : 0) + (hasMusic ? 1 : 0);
    leakIdx = base;
  }

  const totalFrames = Math.round(clipDur * fps);
  const filters: string[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const kb = kenBurnsForStyle(style, i, totalFrames, w, h);
    filters.push(`[${i}:v]setsar=1,fps=${fps},${kb},format=yuv420p[v${i}]`);
  }

  // Slide segment labels — text is already baked into the source PNGs.
  const slideOuts: string[] = [];
  for (let i = 0; i < normalized.length; i++) {
    slideOuts.push(`v${i}`);
  }

  // Title text is baked into the first slide image during preprocessing.


  // Chain xfade transitions (style-aware).
  let chainOut: string;
  if (slideOuts.length === 1) {
    filters.push(`[${slideOuts[0]}]copy[vchain]`);
    chainOut = "vchain";
  } else {
    let prev = slideOuts[0];
    let offset = segDur;
    for (let i = 1; i < slideOuts.length; i++) {
      const last = i === slideOuts.length - 1;
      const out = last && !endCardEnabled ? "vchain" : `xf${i}`;
      const trans = transitionForStyle(style, i - 1);
      filters.push(
        `[${prev}][${slideOuts[i]}]xfade=transition=${trans}:duration=${fade}:offset=${offset.toFixed(3)}[${out}]`
      );
      prev = out;
      offset += segDur;
    }
    chainOut = endCardEnabled ? prev : "vchain";
  }

  // Append the end card via a final xfade.
  if (endCardEnabled && endCardIdx >= 0) {
    filters.push(
      `[${endCardIdx}:v]setsar=1,fps=${fps},scale=${w}:${h}:force_original_aspect_ratio=disable,format=yuv420p[ve]`
    );
    const offset = (photoTotal - fade).toFixed(3);
    filters.push(
      `[${chainOut}][ve]xfade=transition=fade:duration=${fade}:offset=${offset}[vchain]`
    );
    chainOut = "vchain";
  }

  // Optional style-wide post filter (vintage grain, bollywood color punch, …).
  let videoOut = chainOut;
  const post = postFilterForStyle(style);
  if (post) {
    filters.push(`[${chainOut}]${post}[vpost]`);
    videoOut = "vpost";
  }

  // Effects layer.
  const fxFilters: string[] = [];
  if (effects.filmGrain) fxFilters.push("noise=alls=8:allf=t+u");
  if (effects.vignette) fxFilters.push("vignette=PI/4");
  if (effects.filmBorders) {
    const barH = Math.round(h * 0.08);
    fxFilters.push(`drawbox=x=0:y=0:w=iw:h=${barH}:color=black:t=fill`);
    fxFilters.push(`drawbox=x=0:y=ih-${barH}:w=iw:h=${barH}:color=black:t=fill`);
  }
  if (fxFilters.length) {
    filters.push(`[${videoOut}]${fxFilters.join(",")}[vfx]`);
    videoOut = "vfx";
  }

  // Light leak overlay (bookend warm flares).
  if (leakEnabled && leakIdx >= 0) {
    const fadeOutStart = Math.max(0, totalDur - 2.0);
    filters.push(
      `[${leakIdx}:v]setsar=1,fps=${fps},scale=${w}:${h},format=yuva420p,` +
        `fade=t=in:st=0:d=2.0:alpha=1,` +
        `fade=t=out:st=${fadeOutStart.toFixed(3)}:d=2.0:alpha=1[leak]`
    );
    filters.push(`[${videoOut}][leak]overlay=0:0:format=auto[vleak]`);
    videoOut = "vleak";
  }

  // Audio (music only — no original audio in photo slideshow).
  let audioMap: string | null = null;
  if (hasMusic && musicIdx >= 0) {
    const musicVol = Math.max(0, Math.min(1, opts.musicVolume ?? 0.6));
    const fadeOutStart = Math.max(0, totalDur - 2.5);
    filters.push(
      `[${musicIdx}:a]volume=${musicVol},` +
        `afade=t=in:st=0:d=1.5,` +
        `afade=t=out:st=${fadeOutStart.toFixed(3)}:d=2.5,` +
        `atrim=duration=${totalDur.toFixed(3)},` +
        `aresample=44100[aout]`
    );
    audioMap = "aout";
  }

  args.push("-filter_complex", filters.join(";"));
  args.push("-map", `[${videoOut}]`);
  if (audioMap) args.push("-map", `[${audioMap}]`);

  args.push(
    "-r", String(fps),
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-level", "4.1",
    "-movflags", "+faststart",
  );
  if (audioMap) {
    args.push("-c:a", "aac", "-b:a", "192k", "-ar", "44100");
  } else {
    args.push("-an");
  }
  args.push("-t", totalDur.toFixed(3), opts.outputPath);

  await fsp.mkdir(path.dirname(opts.outputPath), { recursive: true });

  try {
    await execFileP("ffmpeg", args, { maxBuffer: 200 * 1024 * 1024 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stderr = (err as { stderr?: string }).stderr || "";
    throw new Error(`FFmpeg render failed: ${msg}\n${stderr.slice(-2000)}`);
  }

  return { duration: totalDur };
}
