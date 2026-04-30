import { NextRequest, NextResponse } from "next/server";
import { generateCaptions } from "@/lib/ai/captions";
import { describePhoto } from "@/lib/ai/vision";

export const runtime = "nodejs";
export const maxDuration = 120;

interface JsonPayload {
  brief?: string;
  style?: string;
  photoCount?: number;
  language?: string;
  includeCaptions?: boolean;
  tone?: string;
}

const MAX_VISION_PHOTOS = 12;
const MAX_VISION_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let payload: JsonPayload;
    let photoDescriptions: string[] | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      payload = {
        brief: (form.get("brief") as string | null)?.toString() || "",
        style: (form.get("style") as string | null)?.toString() || undefined,
        photoCount: form.get("photoCount")
          ? parseInt(String(form.get("photoCount")), 10)
          : undefined,
        language: (form.get("language") as string | null)?.toString() || undefined,
        includeCaptions: form.get("includeCaptions") !== "false",
        tone: (form.get("tone") as string | null)?.toString() || undefined,
      };

      const files = form
        .getAll("photos")
        .filter((f) => f instanceof File) as File[];
      if (files.length) {
        // Cap to avoid runaway vision cost / latency.
        const subset = files.slice(0, MAX_VISION_PHOTOS);
        photoDescriptions = await Promise.all(
          subset.map(async (f, i) => {
            try {
              if (f.size > MAX_VISION_BYTES) return "";
              const buf = Buffer.from(await f.arrayBuffer());
              const dataUrl = `data:${f.type || "image/jpeg"};base64,${buf.toString("base64")}`;
              return await describePhoto(dataUrl, payload.brief);
            } catch (err) {
              console.warn(`[ai-captions] vision failed for photo ${i}:`, err);
              return "";
            }
          })
        );
      }
    } else {
      payload = (await req.json().catch(() => ({}))) as JsonPayload;
    }

    if (!payload.brief?.trim()) {
      return NextResponse.json({ error: "brief is required" }, { status: 400 });
    }

    const result = await generateCaptions({
      brief: payload.brief.trim(),
      style: payload.style,
      photoCount: payload.photoCount,
      language: payload.language,
      includeCaptions: payload.includeCaptions !== false,
      tone: payload.tone,
      photoDescriptions,
    });
    return NextResponse.json({
      ...result,
      photoDescriptions: photoDescriptions || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Caption generation failed";
    console.error("[ai-captions] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
