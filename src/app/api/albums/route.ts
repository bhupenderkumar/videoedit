import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const albums = await db.listAlbums();
    return NextResponse.json(albums);
  } catch (error) {
    console.error("[albums] Error:", error);
    return NextResponse.json({ error: "Failed to list albums" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, profile_id = "default", event_type = "general", event_date, shared_config } = body;

    if (!name) {
      return NextResponse.json({ error: "Album name is required" }, { status: 400 });
    }

    const { db } = await import("@/lib/db");
    const id = uuid();

    await db.createAlbum({
      id,
      profile_id,
      name,
      event_type,
      event_date,
      shared_config: shared_config ? JSON.stringify(shared_config) : undefined,
    });

    return NextResponse.json({ id, name, event_type, status: "draft" });
  } catch (error) {
    console.error("[albums] Error:", error);
    return NextResponse.json({ error: "Failed to create album" }, { status: 500 });
  }
}
