import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await import("@/lib/db");
    const project = await db.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const audioSettings = project.audio_settings ? JSON.parse(project.audio_settings as string) : null;
    return NextResponse.json({ audio_settings: audioSettings });
  } catch (error) {
    console.error("[audio] Error:", error);
    return NextResponse.json({ error: "Failed to get audio settings" }, { status: 500 });
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

    await db.updateProject(id, {
      audio_settings: JSON.stringify(body),
    });

    return NextResponse.json({ ok: true, audio_settings: body });
  } catch (error) {
    console.error("[audio] Error:", error);
    return NextResponse.json({ error: "Failed to update audio settings" }, { status: 500 });
  }
}
