// AI-powered caption / title / subtitle suggestions for memory videos.
// Uses Groq (llama-3.3-70b) — fast & free — to turn a short user-supplied
// brief into a polished title, subtitle, and optional per-photo captions.

import groqClient, { MODELS } from "./groq-client";

export interface CaptionRequest {
  /** What this video is about — e.g. "School annual day 2026". */
  brief: string;
  /** Visual style id (cinematic / polaroid / bollywood …). */
  style?: string;
  /** Number of photos in the timeline — for caption arrays. */
  photoCount?: number;
  /** "en" | "hi" | "hinglish" — default en. */
  language?: string;
  /** Whether the user wants per-photo captions too. */
  includeCaptions?: boolean;
  /** Tone hint — "warm", "playful", "formal", "nostalgic". */
  tone?: string;
  /**
   * Optional one-line description per photo (vision-derived).  When provided,
   * `photoCount` is implied and per-photo captions will reflect each photo.
   */
  photoDescriptions?: string[];
}

export interface CaptionResult {
  title: string;
  subtitle: string;
  captions: string[];
  endCardLine?: string;
}

const SYSTEM_PROMPT = `You are a thoughtful copywriter for short family memory videos
that parents love sharing on WhatsApp and Instagram.  You craft concise,
heart-warm copy.  Always reply with valid JSON only — no markdown fences,
no commentary.`;

function buildUserPrompt(req: CaptionRequest): string {
  const lang = req.language || "en";
  const tone = req.tone || "warm and heartfelt";
  const styleHint = req.style ? ` Visual style: ${req.style}.` : "";
  const count = req.photoDescriptions?.length || req.photoCount || 0;
  const photoLine = count ? ` There are ${count} photos in the video.` : "";
  const capLine = req.includeCaptions && count
    ? ` Also produce ${count} short per-photo captions (3-7 words each), in array order.`
    : " The captions array can be empty.";

  const descBlock = req.photoDescriptions?.length
    ? `\nPhoto descriptions (in order):\n${req.photoDescriptions
        .map((d, i) => `${i + 1}. ${d}`)
        .join("\n")}\nMake each per-photo caption resonate with its description.`
    : "";

  return `Brief: "${req.brief}".
Tone: ${tone}.
Language: ${lang === "hinglish" ? "casual Hinglish (Hindi + English mix in Latin script)" : lang === "hi" ? "Hindi (Devanagari)" : "English"}.
${styleHint}${photoLine}${capLine}${descBlock}

Return JSON exactly in this shape:
{
  "title": "string — max 6 words, evocative",
  "subtitle": "string — max 10 words, supportive of the title",
  "captions": ["short caption 1", "..."],
  "endCardLine": "string — closing line, max 6 words, e.g. 'Made with love'"
}`;
}

export async function generateCaptions(
  req: CaptionRequest
): Promise<CaptionResult> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }
  const user = buildUserPrompt(req);
  const completion = await groqClient.chat.completions.create({
    model: MODELS.LLM,
    temperature: 0.85,
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "{}";
  let parsed: Partial<CaptionResult>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // last-ditch: try to grab the first JSON object out of the response.
    const m = raw.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }

  const captions = Array.isArray(parsed.captions)
    ? parsed.captions.map((c) => String(c || "").trim())
    : [];

  return {
    title: String(parsed.title || "").trim(),
    subtitle: String(parsed.subtitle || "").trim(),
    captions: req.photoDescriptions?.length
      ? captions.slice(0, req.photoDescriptions.length)
      : req.photoCount
        ? captions.slice(0, req.photoCount)
        : captions,
    endCardLine: parsed.endCardLine ? String(parsed.endCardLine).trim() : undefined,
  };
}
