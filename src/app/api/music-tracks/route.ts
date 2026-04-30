import { NextRequest, NextResponse } from "next/server";
import { MUSIC_LIBRARY, getTracksByCategory, getTracksByMood } from "@/lib/audio/processor";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const mood = searchParams.get("mood");

  let tracks = MUSIC_LIBRARY;

  if (category) {
    tracks = getTracksByCategory(category);
  } else if (mood) {
    tracks = getTracksByMood(mood);
  }

  return NextResponse.json({ tracks });
}
