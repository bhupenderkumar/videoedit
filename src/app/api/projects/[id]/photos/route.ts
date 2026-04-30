import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await import("@/lib/db");
    const photos = await db.getProjectPhotos(id);
    return NextResponse.json({ photos });
  } catch (error) {
    console.error("[photos] Error:", error);
    return NextResponse.json({ error: "Failed to list photos" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No photos provided" }, { status: 400 });
    }

    const { db } = await import("@/lib/db");
    const project = await db.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const photosDir = path.join(UPLOAD_DIR, "photos", projectId);
    await fs.mkdir(photosDir, { recursive: true });

    const existingPhotos = await db.getProjectPhotos(projectId);
    let sortOrder = existingPhotos.length;
    const addedPhotos = [];

    for (const file of files) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) continue;
      if (file.size > 20 * 1024 * 1024) continue; // 20MB limit per photo

      const photoId = uuid();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${photoId}.${ext}`;
      const filePath = path.join(photosDir, fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      await db.addPhoto({
        id: photoId,
        project_id: projectId,
        file_path: filePath,
        sort_order: sortOrder++,
        duration: 5,
        animation: "ken_burns",
      });

      addedPhotos.push({ id: photoId, file_path: filePath, sort_order: sortOrder - 1 });
    }

    return NextResponse.json({ photos: addedPhotos, total: sortOrder });
  } catch (error) {
    console.error("[photos] Error:", error);
    return NextResponse.json({ error: "Failed to upload photos" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json({ error: "photoId required" }, { status: 400 });
    }

    const { db } = await import("@/lib/db");
    await db.deletePhoto(photoId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[photos] Error:", error);
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { photos } = body;

    if (!Array.isArray(photos)) {
      return NextResponse.json({ error: "photos array required" }, { status: 400 });
    }

    const { db } = await import("@/lib/db");
    await db.updatePhotoOrder(photos);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[photos] Error:", error);
    return NextResponse.json({ error: "Failed to reorder photos" }, { status: 500 });
  }
}
