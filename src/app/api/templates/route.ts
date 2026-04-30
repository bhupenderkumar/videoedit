import { NextRequest, NextResponse } from "next/server";
import { EVENT_TEMPLATES, getTemplatesByCategory } from "@/lib/templates";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const templates = category
    ? getTemplatesByCategory(category)
    : EVENT_TEMPLATES;

  return NextResponse.json({ templates });
}
