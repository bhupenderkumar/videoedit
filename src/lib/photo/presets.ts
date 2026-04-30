// ── Photo Enhancement Presets ──────────────────────────────────────────────
// Reusable sharp pipelines that turn an arbitrary uploaded photo into a
// stylized variant.  Each preset is a single `apply(buffer) → Buffer` function
// that returns JPEG output ready to be written to disk or inlined as base64.

import sharp, { type Sharp } from "sharp";

export interface PresetMeta {
  id: string;
  label: string;
  description: string;
  category: "essential" | "tone" | "creative";
}

export const PHOTO_PRESETS: PresetMeta[] = [
  // Essentials
  { id: "auto", label: "Auto Enhance", description: "Upscale + sharpen + balance", category: "essential" },
  { id: "upscale", label: "Upscale 2×", description: "Double the resolution", category: "essential" },
  { id: "color_correct", label: "Color Correct", description: "Fix exposure & balance", category: "essential" },
  { id: "sharpen", label: "Sharpen", description: "Boost crispness", category: "essential" },
  // Tone
  { id: "golden_hour", label: "Golden Hour", description: "Warm sunset glow", category: "tone" },
  { id: "cool_morning", label: "Cool Morning", description: "Crisp blue-cyan tones", category: "tone" },
  { id: "soft_portrait", label: "Soft Portrait", description: "Smooth skin, gentle warmth", category: "tone" },
  { id: "dramatic", label: "Dramatic", description: "High contrast, punchy color", category: "tone" },
  // Creative
  { id: "vintage_film", label: "Vintage Film", description: "Sepia + grain + soft fade", category: "creative" },
  { id: "bw_classic", label: "B&W Classic", description: "Rich monochrome", category: "creative" },
  { id: "vignette", label: "Vignette", description: "Soft dark corners", category: "creative" },
  { id: "polaroid", label: "Polaroid Card", description: "White frame & shadow", category: "creative" },
];

// Apply a circular vignette by compositing a radial-gradient SVG.
async function applyVignette(buf: Buffer, strength = 0.55): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const w = meta.width || 1000;
  const h = meta.height || 1000;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="v" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,${strength})"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#v)"/>
  </svg>`;
  return sharp(buf)
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .toBuffer();
}

// Add a faint film-grain overlay.  Sharp's composite has no `opacity`
// option, so we modulate the noise intensity at creation time.
async function applyGrain(buf: Buffer, opacity = 0.12): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const w = meta.width || 1000;
  const h = meta.height || 1000;
  // Sigma scales with desired opacity — gives a perceptually similar effect.
  const sigma = Math.round(opacity * 90);
  const grain = await sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
      noise: { type: "gaussian", mean: 0, sigma },
    },
  } as never)
    .png()
    .toBuffer()
    .catch(async () => {
      // Older sharp versions don't support `noise` in create — fall back to
      // generating uncorrelated noise via random rects.
      const dots = Array.from({ length: 4000 })
        .map(() => {
          const x = Math.floor(Math.random() * w);
          const y = Math.floor(Math.random() * h);
          const v = Math.floor(Math.random() * 255);
          return `<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${v},${v},${v})"/>`;
        })
        .join("");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="rgb(128,128,128)"/>${dots}</svg>`;
      return sharp(Buffer.from(svg)).png().toBuffer();
    });
  return sharp(buf)
    .composite([{ input: grain, blend: "soft-light" }])
    .toBuffer();
}

export async function applyPreset(
  inputBuf: Buffer,
  presetId: string
): Promise<Buffer> {
  const meta = await sharp(inputBuf).metadata();
  const w = meta.width || 1500;
  const h = meta.height || 1500;
  let pipe: Sharp;

  switch (presetId) {
    case "upscale":
      pipe = sharp(inputBuf)
        .rotate()
        .resize(w * 2, h * 2, { fit: "fill", kernel: "lanczos3" })
        .sharpen({ sigma: 0.8 });
      return pipe.jpeg({ quality: 95, mozjpeg: true }).toBuffer();

    case "color_correct":
      pipe = sharp(inputBuf)
        .rotate()
        .normalise()
        .modulate({ brightness: 1.05, saturation: 1.18 });
      return pipe.jpeg({ quality: 95, mozjpeg: true }).toBuffer();

    case "sharpen":
      pipe = sharp(inputBuf)
        .rotate()
        .sharpen({ sigma: 1.8, m1: 1.0, m2: 0.5 });
      return pipe.jpeg({ quality: 95, mozjpeg: true }).toBuffer();

    case "golden_hour": {
      const base = await sharp(inputBuf)
        .rotate()
        .modulate({ brightness: 1.06, saturation: 1.18 })
        .tint({ r: 255, g: 200, b: 140 })
        .toBuffer();
      const v = await applyVignette(base, 0.32);
      return sharp(v).jpeg({ quality: 94, mozjpeg: true }).toBuffer();
    }

    case "cool_morning": {
      const base = await sharp(inputBuf)
        .rotate()
        .modulate({ brightness: 1.04, saturation: 1.05 })
        .tint({ r: 190, g: 215, b: 255 })
        .linear(1.05, -8)
        .toBuffer();
      return sharp(base).jpeg({ quality: 94, mozjpeg: true }).toBuffer();
    }

    case "soft_portrait": {
      // Smooth skin via blur+sharpen sandwich, slight warm tone.
      const blurred = await sharp(inputBuf)
        .rotate()
        .blur(2)
        .toBuffer();
      const blended = await sharp(inputBuf)
        .rotate()
        .composite([{ input: blurred, blend: "soft-light" }])
        .modulate({ brightness: 1.04, saturation: 1.05 })
        .tint({ r: 255, g: 230, b: 210 })
        .sharpen({ sigma: 1 })
        .toBuffer();
      return sharp(blended).jpeg({ quality: 95, mozjpeg: true }).toBuffer();
    }

    case "dramatic": {
      const base = await sharp(inputBuf)
        .rotate()
        .linear(1.18, -18) // contrast boost
        .modulate({ saturation: 1.35, brightness: 1.0 })
        .sharpen({ sigma: 1.4 })
        .toBuffer();
      const v = await applyVignette(base, 0.45);
      return sharp(v).jpeg({ quality: 94, mozjpeg: true }).toBuffer();
    }

    case "vintage_film": {
      const base = await sharp(inputBuf)
        .rotate()
        .modulate({ saturation: 0.6, brightness: 0.98 })
        .tint({ r: 220, g: 188, b: 140 })
        .linear(1.08, -10)
        .toBuffer();
      const grained = await applyGrain(base, 0.18);
      const v = await applyVignette(grained, 0.4);
      return sharp(v).jpeg({ quality: 93, mozjpeg: true }).toBuffer();
    }

    case "bw_classic": {
      const base = await sharp(inputBuf)
        .rotate()
        .grayscale()
        .linear(1.15, -12)
        .sharpen({ sigma: 1.1 })
        .toBuffer();
      const v = await applyVignette(base, 0.4);
      return sharp(v).jpeg({ quality: 94, mozjpeg: true }).toBuffer();
    }

    case "vignette": {
      const base = await sharp(inputBuf).rotate().toBuffer();
      const v = await applyVignette(base, 0.5);
      return sharp(v).jpeg({ quality: 95, mozjpeg: true }).toBuffer();
    }

    case "polaroid": {
      const innerW = Math.min(900, w);
      const ratio = innerW / w;
      const innerH = Math.round(h * ratio);
      const photo = await sharp(inputBuf)
        .rotate()
        .resize(innerW, innerH, { fit: "cover" })
        .modulate({ saturation: 1.05, brightness: 1.02 })
        .toBuffer();
      const cardW = innerW + 60;
      const cardH = innerH + 60 + 100; // bottom padding for caption space
      const card = await sharp({
        create: {
          width: cardW,
          height: cardH,
          channels: 3,
          background: "#fafafa",
        },
      })
        .composite([{ input: photo, left: 30, top: 30 }])
        .jpeg({ quality: 94, mozjpeg: true })
        .toBuffer();
      return card;
    }

    case "auto":
    default:
      pipe = sharp(inputBuf)
        .rotate()
        .resize(w * 2, null, { withoutEnlargement: false, kernel: "lanczos3" })
        .sharpen({ sigma: 1.4 })
        .normalise()
        .modulate({ brightness: 1.03, saturation: 1.15 });
      return pipe.jpeg({ quality: 95, mozjpeg: true }).toBuffer();
  }
}
