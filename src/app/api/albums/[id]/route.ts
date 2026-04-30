import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await import("@/lib/db");

    const album = await db.getAlbum(id);
    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const projectLinks = await db.getAlbumProjects(id);
    const projects = [];
    for (const link of projectLinks) {
      const project = await db.getProject(link.project_id);
      if (project) projects.push(project);
    }

    return NextResponse.json({ ...album, projects });
  } catch (error) {
    console.error("[album] Error:", error);
    return NextResponse.json({ error: "Failed to get album" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await import("@/lib/db");

    await db.updateAlbum(id, body);
    const updated = await db.getAlbum(id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[album] Error:", error);
    return NextResponse.json({ error: "Failed to update album" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await import("@/lib/db");
    await db.deleteAlbum(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[album] Error:", error);
    return NextResponse.json({ error: "Failed to delete album" }, { status: 500 });
  }
}
