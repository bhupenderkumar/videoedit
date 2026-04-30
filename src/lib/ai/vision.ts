// Vision-based per-photo description using Groq's llama-4-scout model.
// We feed each photo as a base64 data URL and ask for a one-line caption
// describing what's actually in the frame so the downstream caption writer
// can produce captions tailored to the real images.

import groqClient, { MODELS } from "./groq-client";

const SYSTEM = `You describe family photographs in one short, evocative sentence
(under 12 words).  Focus on people's expressions, action, and mood.
Never invent names.  Never use markdown.  Reply with the sentence only.`;

export async function describePhoto(
  base64DataUrl: string,
  hint?: string
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }
  const userText = hint
    ? `Context: ${hint}.  Describe this photo in one short sentence.`
    : "Describe this photo in one short sentence.";

  const completion = await groqClient.chat.completions.create({
    model: MODELS.VISION,
    temperature: 0.4,
    max_tokens: 80,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: base64DataUrl } },
        ],
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}
