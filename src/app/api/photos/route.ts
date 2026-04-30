import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import sharp from "sharp";
import { applyPreset, PHOTO_PRESETS } from "@/lib/photo/presets";

const IS_VERCEL = !!process.env.VERCEL;
const UPLOAD_DIR = IS_VERCEL ? "/tmp/uploads" : (process.env.UPLOAD_DIR || "./uploads");
const OUTPUT_DIR = IS_VERCEL ? "/tmp/output" : (process.env.OUTPUT_DIR || "./output");

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ presets: PHOTO_PRESETS });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File;
    const enhancementType =
      (formData.get("enhancement_type") as string) || "auto";

    if (!file) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    await mkdir(path.join(UPLOAD_DIR, "photos"), { recursive: true });
    await mkdir(path.join(OUTPUT_DIR, "photos"), { recursive: true });

    const jobId = uuid();
    const ext = path.extname(file.name) || ".jpg";
    const inputPath = path.join(UPLOAD_DIR, "photos", `${jobId}${ext}`);
    const outputPath = path.join(OUTPUT_DIR, "photos", `${jobId}_${enhancementType}.jpg`);

    const bytes = await file.arrayBuffer();
    const inputBuf = Buffer.from(bytes);
    await writeFile(inputPath, inputBuf);

    const inputMeta = await sharp(inputBuf).metadata();

    let outputBuf: Buffer;
    try {
      outputBuf = await applyPreset(inputBuf, enhancementType);
    } catch (err) {
      console.error("[photo] preset failed, falling back to auto:", err);
      outputBuf = await applyPreset(inputBuf, "auto");
    }
    await writeFile(outputPath, outputBuf);

    const outputMeta = await sharp(outputBuf).metadata();
    const base64 = outputBuf.toString("base64");

    return NextResponse.json({
      id: jobId,
      status: "completed",
      original: {
        width: inputMeta.width,
        height: inputMeta.height,
        size: inputBuf.length,
      },
      enhanced: {
        width: outputMeta.width,
        height: outputMeta.height,
        size: outputBuf.length,
        path: `/api/photos/${jobId}`,
        dataUrl: `data:image/jpeg;base64,${base64}`,
      },
      enhancement_type: enhancementType,
    });
  } catch (err) {
    console.error("Photo enhancement error:", err);
    return NextResponse.json({ error: "Enhancement failed" }, { status: 500 });
  }
}
