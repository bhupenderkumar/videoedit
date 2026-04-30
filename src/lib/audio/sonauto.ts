// ── Sonauto AI music generation client ─────────────────────────────────────
// Docs: https://sonauto.ai/developers/docs
//
// Free fallback: when SONAUTO_API_KEY is not set we return null and the caller
// falls back to the curated Pixabay library or no music at all.

import fsp from "fs/promises";
import path from "path";

const BASE = "https://api.sonauto.ai/v1";

export class SonautoError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "SonautoError";
    this.status = status;
  }
}

function getKey(): string | null {
  const k = process.env.SONAUTO_API_KEY?.trim();
  return k && k.length > 8 ? k : null;
}

export function isSonautoConfigured(): boolean {
  return getKey() !== null;
}

interface GenerationStartResponse {
  task_id: string;
}

export interface GenerationOptions {
  /** Free-form prompt — Sonauto recommends prompt-only for best results. */
  prompt: string;
  /** Optional style tags. Provide ≥3 if used; otherwise omit. */
  tags?: string[];
  /** Default: true — we want music for slideshows, not vocals. */
  instrumental?: boolean;
  /** Default mp3 (most compatible with browsers + ffmpeg). */
  outputFormat?: "mp3" | "ogg" | "wav" | "flac" | "m4a";
  /** Default 192. */
  bitrateKbps?: 128 | 192 | 256 | 320;
}

async function postStartV3(opts: GenerationOptions): Promise<string> {
  const key = getKey();
  if (!key) throw new SonautoError("SONAUTO_API_KEY not configured");

  const body: Record<string, unknown> = {
    prompt: opts.prompt,
    instrumental: opts.instrumental ?? true,
    output_format: opts.outputFormat || "mp3",
  };
  if (opts.outputFormat === "mp3" || opts.outputFormat === "m4a" || !opts.outputFormat) {
    body.output_bit_rate = opts.bitrateKbps || 192;
  }
  if (opts.tags && opts.tags.length >= 3) body.tags = opts.tags;

  const res = await fetch(`${BASE}/generations/v3`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SonautoError(
      `Sonauto generation request failed: ${res.status} ${text.slice(0, 300)}`,
      res.status
    );
  }
  const data = (await res.json()) as GenerationStartResponse;
  if (!data.task_id) throw new SonautoError("Sonauto: missing task_id");
  return data.task_id;
}

async function getStatus(taskId: string): Promise<string> {
  const key = getKey();
  if (!key) throw new SonautoError("SONAUTO_API_KEY not configured");
  const res = await fetch(`${BASE}/generations/status/${taskId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new SonautoError(`Sonauto status check failed: ${res.status}`, res.status);
  }
  const txt = (await res.text()).trim();
  // The endpoint returns either a quoted string ("SUCCESS") or a JSON object
  // when include_alignment=true. Strip surrounding quotes.
  return txt.replace(/^"+|"+$/g, "");
}

interface GenerationResult {
  song_paths: string[];
  status: string;
  error_message: string | null;
}

async function getGeneration(taskId: string): Promise<GenerationResult> {
  const key = getKey();
  if (!key) throw new SonautoError("SONAUTO_API_KEY not configured");
  const res = await fetch(`${BASE}/generations/${taskId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new SonautoError(`Sonauto fetch failed: ${res.status}`, res.status);
  const data = (await res.json()) as GenerationResult;
  return data;
}

export interface PollOptions {
  /** Max time to wait in ms. Default 240_000 (4 min). */
  timeoutMs?: number;
  /** Poll interval in ms. Default 4000. */
  intervalMs?: number;
  /** Optional callback for status updates. */
  onStatus?: (status: string) => void;
}

async function pollUntilDone(taskId: string, opts: PollOptions = {}): Promise<GenerationResult> {
  const timeoutMs = opts.timeoutMs ?? 240_000;
  const intervalMs = opts.intervalMs ?? 4000;
  const start = Date.now();
  let lastStatus = "";
  while (Date.now() - start < timeoutMs) {
    const status = await getStatus(taskId);
    if (status !== lastStatus) {
      lastStatus = status;
      opts.onStatus?.(status);
    }
    if (status === "SUCCESS") {
      return await getGeneration(taskId);
    }
    if (status === "FAILURE") {
      const detail = await getGeneration(taskId).catch(() => null);
      throw new SonautoError(
        `Sonauto generation failed: ${detail?.error_message || "unknown"}`
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new SonautoError(`Sonauto generation timed out after ${timeoutMs}ms`);
}

/**
 * Generate a song with Sonauto v3 and download the first song to a local file.
 * Returns the absolute output path on success, or null when Sonauto is not
 * configured (caller should fall back to the curated library).
 */
export async function generateAndDownload(
  opts: GenerationOptions & { outputPath: string; pollOptions?: PollOptions }
): Promise<string | null> {
  if (!isSonautoConfigured()) return null;

  const taskId = await postStartV3({
    prompt: opts.prompt,
    tags: opts.tags,
    instrumental: opts.instrumental,
    outputFormat: opts.outputFormat || "mp3",
    bitrateKbps: opts.bitrateKbps,
  });

  const result = await pollUntilDone(taskId, opts.pollOptions);
  const url = result.song_paths?.[0];
  if (!url) throw new SonautoError("Sonauto returned no song_paths");

  const audioRes = await fetch(url);
  if (!audioRes.ok) {
    throw new SonautoError(`Failed to download Sonauto audio: ${audioRes.status}`);
  }
  const buf = Buffer.from(await audioRes.arrayBuffer());
  await fsp.mkdir(path.dirname(opts.outputPath), { recursive: true });
  await fsp.writeFile(opts.outputPath, buf);
  return opts.outputPath;
}

export async function getCreditBalance(): Promise<{
  num_credits: number;
  num_credits_payg: number;
} | null> {
  const key = getKey();
  if (!key) return null;
  const res = await fetch(`${BASE}/credits/balance`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as { num_credits: number; num_credits_payg: number };
}

// ── Suggested prompt library by mood/event ─────────────────────────────────

export const AI_MUSIC_PRESETS: { id: string; label: string; prompt: string; tags: string[] }[] = [
  {
    id: "warm_family",
    label: "Warm Family Memories",
    prompt: "A warm, heartfelt instrumental piano piece with soft strings, perfect for family memories and emotional photo montages",
    tags: ["piano", "ambient", "emotional"],
  },
  {
    id: "kids_playful",
    label: "Playful Kids Adventure",
    prompt: "Cheerful upbeat instrumental with ukulele, glockenspiel and light percussion, perfect for kids playing and family fun",
    tags: ["children", "happy", "instrumental"],
  },
  {
    id: "school_celebration",
    label: "School Celebration",
    prompt: "Uplifting orchestral instrumental with strings, brass and triumphant percussion for a school annual day celebration",
    tags: ["orchestral", "uplifting", "instrumental"],
  },
  {
    id: "indian_traditional",
    label: "Indian Traditional",
    prompt: "Beautiful peaceful Indian classical instrumental with bansuri flute, sitar and tabla, calm and devotional mood",
    tags: ["indian", "classical", "instrumental"],
  },
  {
    id: "cinematic_emotional",
    label: "Cinematic & Emotional",
    prompt: "Cinematic emotional instrumental with rising strings, soft piano, and gentle percussion building to a hopeful peak",
    tags: ["cinematic", "orchestral", "emotional"],
  },
  {
    id: "wedding_romantic",
    label: "Romantic Wedding",
    prompt: "Romantic instrumental love song with acoustic guitar, soft piano, and warm strings, dreamy and tender",
    tags: ["romantic", "acoustic", "instrumental"],
  },
  {
    id: "sports_energetic",
    label: "Sports Day Energy",
    prompt: "High-energy upbeat instrumental rock anthem with driving drums, electric guitars, and powerful build-ups for sports highlights",
    tags: ["rock", "energetic", "instrumental"],
  },
  {
    id: "lofi_chill",
    label: "Chill Lofi",
    prompt: "A cozy chill lofi hip-hop instrumental beat with mellow piano and warm vinyl crackle, perfect for relaxed photo memories",
    tags: ["lofi", "chill", "instrumental"],
  },
];
