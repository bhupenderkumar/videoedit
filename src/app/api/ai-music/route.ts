import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import path from "path";
import fsp from "fs/promises";
import {
  AI_MUSIC_PRESETS,
  generateAndDownload,
  getCreditBalance,
  isSonautoConfigured,
} from "@/lib/audio/sonauto";
import { STYLE_META } from "@/lib/video/memory-video-styles";

export const runtime = "nodejs";
export const maxDuration = 300;

const TMP_DIR = process.env.TEMP_DIR || "./tmp";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "./output";

export async function GET() {
  const balance = await getCreditBalance().catch(() => null);
  return NextResponse.json({
    configured: isSonautoConfigured(),
    balance,
    presets: AI_MUSIC_PRESETS,
    styles: STYLE_META,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!isSonautoConfigured()) {
      return NextResponse.json(
        {
          error: "AI music is not configured. Set SONAUTO_API_KEY in .env.local.",
        },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      prompt?: string;
      presetId?: string;
      tags?: string[];
      instrumental?: boolean;
    };

    let prompt = body.prompt?.trim() || "";
    let tags: string[] | undefined = body.tags;
    if (!prompt && body.presetId) {
      const preset = AI_MUSIC_PRESETS.find((p) => p.id === body.presetId);
      if (preset) {
        prompt = preset.prompt;
        tags = preset.tags;
      }
    }
    if (!prompt) {
      return NextResponse.json({ error: "prompt or presetId is required" }, { status: 400 });
    }

    const id = uuid();
    const dir = path.join(TMP_DIR, "ai-music", id);
    await fsp.mkdir(dir, { recursive: true });
    const outPath = path.join(OUTPUT_DIR, "ai-music", `${id}.mp3`);

    const out = await generateAndDownload({
      prompt,
      tags,
      instrumental: body.instrumental ?? true,
      outputFormat: "mp3",
      bitrateKbps: 192,
      outputPath: outPath,
      pollOptions: {
        timeoutMs: 240_000,
        intervalMs: 4000,
        onStatus: (s) => console.log(`[ai-music] ${id} ${s}`),
      },
    });
    if (!out) throw new Error("AI music generation returned no result");

    return NextResponse.json({
      id,
      url: `/api/ai-music/${id}`,
      prompt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI music generation failed";
    console.error("[ai-music] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
