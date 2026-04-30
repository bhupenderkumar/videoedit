import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import { renderMemoryVideo, type Aspect, type MemoryPhoto } from "@/lib/video/memory-video";
import type { MemoryStyle } from "@/lib/video/memory-video-styles";
import { STYLE_META } from "@/lib/video/memory-video-styles";
import { MUSIC_LIBRARY } from "@/lib/audio/processor";
import {
  AI_MUSIC_PRESETS,
  generateAndDownload,
  isSonautoConfigured,
} from "@/lib/audio/sonauto";
import { listJobs, setJob, type JobRecord } from "@/lib/video/memory-video-jobs";

export const runtime = "nodejs";
export const maxDuration = 300; // seconds — render can take a while for many photos

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "./output";
const TMP_DIR = process.env.TEMP_DIR || "./tmp";

async function downloadToFile(url: string, dst: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Music download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.writeFile(dst, buf);
}

export async function GET() {
  return NextResponse.json({ jobs: listJobs(50) });
}

export async function POST(req: NextRequest) {
  const id = uuid();
  const jobDir = path.join(TMP_DIR, "memory", id);
  const photosDir = path.join(jobDir, "photos");
  const outDir = path.join(OUTPUT_DIR, "memory");
  const outputPath = path.join(outDir, `${id}.mp4`);

  try {
    const form = await req.formData();
    const files = form.getAll("photos").filter((f) => f instanceof File) as File[];

    if (!files.length) {
      return NextResponse.json({ error: "Upload at least one photo" }, { status: 400 });
    }
    if (files.length > 60) {
      return NextResponse.json({ error: "Maximum 60 photos per video" }, { status: 400 });
    }

    const title = (form.get("title") as string | null)?.toString().trim() || "";
    const subtitle = (form.get("subtitle") as string | null)?.toString().trim() || "";
    const aspect = ((form.get("aspect") as string | null) || "9:16") as Aspect;
    const photoDuration = parseFloat((form.get("photoDuration") as string | null) || "3.5");
    const transitionDuration = parseFloat((form.get("transitionDuration") as string | null) || "1.0");
    const musicVolume = parseFloat((form.get("musicVolume") as string | null) || "0.6");
    const musicTrackId = (form.get("musicTrackId") as string | null) || "";
    const captionsRaw = (form.get("captions") as string | null) || "[]";
    const styleRaw = (form.get("style") as string | null) || "cinematic";
    const aiMusicPrompt = (form.get("aiMusicPrompt") as string | null)?.toString().trim() || "";
    const aiMusicPresetId = (form.get("aiMusicPresetId") as string | null)?.toString().trim() || "";
    const aiMusicTrackId = (form.get("aiMusicTrackId") as string | null)?.toString().trim() || "";
    const titlePositionRaw = (form.get("titlePosition") as string | null) || "bottom";
    const titlePosition: "top" | "center" | "bottom" =
      titlePositionRaw === "top" || titlePositionRaw === "center" ? titlePositionRaw : "bottom";

    let effects: { vignette?: boolean; filmBorders?: boolean; lightLeak?: boolean; filmGrain?: boolean } = {};
    try {
      const raw = form.get("effects") as string | null;
      if (raw) effects = JSON.parse(raw) || {};
    } catch {}

    let endCard: { title?: string; subtitle?: string; duration?: number; background?: string } | undefined;
    try {
      const raw = form.get("endCard") as string | null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.title || parsed.subtitle)) endCard = parsed;
      }
    } catch {}

    const validStyles: MemoryStyle[] = [
      "cinematic", "polaroid", "filmstrip", "bollywood", "vintage", "storybook",
    ];
    const style: MemoryStyle = validStyles.includes(styleRaw as MemoryStyle)
      ? (styleRaw as MemoryStyle)
      : "cinematic";

    let captions: string[] = [];
    try {
      const parsed = JSON.parse(captionsRaw);
      if (Array.isArray(parsed)) captions = parsed.map((c) => String(c || ""));
    } catch {
      captions = [];
    }

    if (!["9:16", "16:9", "1:1"].includes(aspect)) {
      return NextResponse.json({ error: "Invalid aspect ratio" }, { status: 400 });
    }

    await fsp.mkdir(photosDir, { recursive: true });
    await fsp.mkdir(outDir, { recursive: true });
    await fsp.mkdir(UPLOAD_DIR, { recursive: true });

    // Persist uploaded photos in the order received (the client sends them in
    // their chosen sort order).
    const photos: MemoryPhoto[] = [];
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!allowed.includes(f.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)) {
        continue;
      }
      if (f.size > 25 * 1024 * 1024) continue;
      const ext = (path.extname(f.name) || ".jpg").toLowerCase();
      const dst = path.join(photosDir, `p_${String(i).padStart(4, "0")}${ext}`);
      const buf = Buffer.from(await f.arrayBuffer());
      await fsp.writeFile(dst, buf);
      photos.push({ path: dst, caption: captions[i]?.trim() || undefined });
    }

    if (!photos.length) {
      return NextResponse.json({ error: "No valid images uploaded" }, { status: 400 });
    }

    // Resolve music in priority:
    //   uploaded file → already-generated AI track (preview) → fresh AI generation → library track.
    let musicPath: string | undefined;
    let musicSource: "upload" | "ai" | "library" | "none" = "none";
    const uploadedMusic = form.get("music");
    if (uploadedMusic instanceof File && uploadedMusic.size > 0) {
      const mext = (path.extname(uploadedMusic.name) || ".mp3").toLowerCase();
      const mp = path.join(jobDir, `music${mext}`);
      const mbuf = Buffer.from(await uploadedMusic.arrayBuffer());
      await fsp.writeFile(mp, mbuf);
      musicPath = mp;
      musicSource = "upload";
    } else if (aiMusicTrackId && /^[a-f0-9-]{8,}$/i.test(aiMusicTrackId)) {
      const cached = path.join(
        process.env.OUTPUT_DIR || "./output",
        "ai-music",
        `${aiMusicTrackId}.mp3`
      );
      if (fs.existsSync(cached)) {
        musicPath = cached;
        musicSource = "ai";
      } else {
        console.warn("[memory-video] aiMusicTrackId not found:", aiMusicTrackId);
      }
    } else if ((aiMusicPrompt || aiMusicPresetId) && isSonautoConfigured()) {
      const preset = aiMusicPresetId
        ? AI_MUSIC_PRESETS.find((p) => p.id === aiMusicPresetId)
        : undefined;
      const styleMeta = STYLE_META.find((s) => s.id === style);
      const finalPrompt =
        aiMusicPrompt ||
        preset?.prompt ||
        styleMeta?.defaultMusicPrompt ||
        "A warm instrumental piece for a family memory video";
      const finalTags = preset?.tags;
      const aiMusicPath = path.join(jobDir, "music_ai.mp3");
      try {
        console.log(`[memory-video] generating Sonauto music: "${finalPrompt}"`);
        const out = await generateAndDownload({
          prompt: finalPrompt,
          tags: finalTags,
          instrumental: true,
          outputFormat: "mp3",
          bitrateKbps: 192,
          outputPath: aiMusicPath,
          pollOptions: {
            timeoutMs: 240_000,
            intervalMs: 4000,
            onStatus: (s) => console.log(`[memory-video] sonauto: ${s}`),
          },
        });
        if (out) {
          musicPath = out;
          musicSource = "ai";
        }
      } catch (err) {
        console.warn("[memory-video] Sonauto failed, falling back:", err);
      }
    }

    // Library fallback if nothing else picked.
    if (!musicPath && musicTrackId) {
      const track = MUSIC_LIBRARY.find((t) => t.id === musicTrackId);
      if (track) {
        const mp = path.join(jobDir, "music.mp3");
        try {
          await downloadToFile(track.url, mp);
          musicPath = mp;
          musicSource = "library";
        } catch (err) {
          console.warn("[memory-video] music download failed:", err);
        }
      }
    }

    const rec: JobRecord = {
      id,
      status: "rendering",
      createdAt: Date.now(),
      title: title || undefined,
    };
    setJob(rec);

    // Render synchronously — Next.js API routes can hold long-running work up to maxDuration.
    const result = await renderMemoryVideo({
      photos,
      title,
      subtitle,
      titlePosition,
      effects,
      endCard,
      aspect,
      style,
      photoDuration: Math.max(1.5, Math.min(8, photoDuration || 3.5)),
      transitionDuration: Math.max(0.3, Math.min(2.0, transitionDuration || 1.0)),
      musicPath,
      musicVolume: Math.max(0, Math.min(1, musicVolume || 0.6)),
      outputPath,
      workDir: jobDir,
    });

    rec.status = "completed";
    rec.completedAt = Date.now();
    rec.outputPath = outputPath;
    rec.duration = result.duration;
    setJob(rec);

    // Best-effort cleanup of normalized frames; keep music + source for debug.
    fsp.rm(path.join(jobDir, "frames"), { recursive: true, force: true }).catch(() => {});

    const stat = await fsp.stat(outputPath);
    return NextResponse.json({
      id,
      status: "completed",
      duration: result.duration,
      file_size: stat.size,
      url: `/api/memory-video/${id}`,
      title: title || undefined,
      style,
      music_source: musicSource,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Render failed";
    console.error("[memory-video] failed:", msg);
    setJob({
      id,
      status: "failed",
      error: msg,
      createdAt: Date.now(),
      completedAt: Date.now(),
    });
    // Best-effort cleanup
    fsp.rm(jobDir, { recursive: true, force: true }).catch(() => {});
    if (fs.existsSync(outputPath)) fsp.rm(outputPath, { force: true }).catch(() => {});
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
