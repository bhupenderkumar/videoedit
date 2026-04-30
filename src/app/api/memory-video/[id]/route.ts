import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getJob } from "@/lib/video/memory-video-jobs";

export const runtime = "nodejs";

const OUTPUT_DIR = process.env.OUTPUT_DIR || "./output";

function safeId(id: string): string | null {
  if (!/^[a-f0-9-]{8,}$/i.test(id)) return null;
  return id;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: raw } = await params;
  const id = safeId(raw);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const filePath = path.join(OUTPUT_DIR, "memory", `${id}.mp4`);
  if (!fs.existsSync(filePath)) {
    const job = getJob(id);
    if (job) {
      return NextResponse.json(
        { id, status: job.status, error: job.error },
        { status: job.status === "failed" ? 500 : 202 }
      );
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const url = new URL(req.url);
  const wantsJson = url.searchParams.get("info") === "1";
  if (wantsJson) {
    const job = getJob(id);
    return NextResponse.json({
      id,
      status: "completed",
      file_size: stat.size,
      duration: job?.duration,
      url: `/api/memory-video/${id}`,
    });
  }

  const range = req.headers.get("range");
  if (range) {
    const match = /bytes=(\d+)-(\d+)?/.exec(range);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      return new NextResponse(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": "video/mp4",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  }

  const stream = fs.createReadStream(filePath);
  const isDownload = url.searchParams.get("download") === "1";
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
      ...(isDownload
        ? { "Content-Disposition": `attachment; filename="memory-${id}.mp4"` }
        : {}),
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: raw } = await params;
  const id = safeId(raw);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const filePath = path.join(OUTPUT_DIR, "memory", `${id}.mp4`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return NextResponse.json({ ok: true });
}
