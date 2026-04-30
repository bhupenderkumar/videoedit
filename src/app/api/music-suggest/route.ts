import { NextRequest, NextResponse } from "next/server";

const IS_VERCEL = !!process.env.VERCEL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, language = "hindi", mood_override, genre_override } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Fetch project data for context
    const { db } = await import("@/lib/db");
    const project = await db.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const transcript = project.transcript ? JSON.parse(project.transcript) : null;
    const frameAnalysis = project.frame_analysis ? JSON.parse(project.frame_analysis) : null;
    const profile = await db.getProfile(project.profile_id || "default");

    // Build AI prompt
    const transcriptText = transcript?.text?.slice(0, 1000) || "No transcript available";
    const scenes = frameAnalysis?.slice(0, 5)?.map((f: { description: string; emotion: string; action: string }) =>
      `${f.description} (${f.emotion}, ${f.action})`
    ).join("; ") || "No scene analysis";

    const systemPrompt = `You are a music curator specializing in Indian and Bollywood music for school and event videos.
You understand the emotional context of videos and suggest appropriate songs.
For school events, you know popular Hindi songs used at:
- Annual days (celebration songs)
- Farewell/graduation (emotional farewell songs)
- Sports day (motivational/energetic songs)
- Cultural programs (classical/folk songs)
- Republic/Independence day (patriotic songs)
- Teacher's day (appreciation songs)
Always return valid JSON.`;

    const userPrompt = `Analyze this video content and suggest ${language === "hindi" ? "Hindi/Bollywood" : "English"} songs for background music.

Video Context:
- Business/School: ${profile?.business_name || "School"} (${profile?.industry || "education"})
- Transcript: ${transcriptText}
- Visual scenes: ${scenes}
- Platform: ${project.target_platform}
- Duration: ${project.target_duration}s
${mood_override ? `- Preferred mood: ${mood_override}` : ""}
${genre_override ? `- Preferred genre: ${genre_override}` : ""}

Return ONLY this JSON:
{
  "suggestions": [
    {
      "title": "Song Name",
      "artist": "Artist Name",
      "language": "${language}",
      "mood": "happy/emotional/energetic/patriotic/romantic/peaceful",
      "genre": "bollywood/pop/classical/folk/patriotic/rock",
      "tempo": "slow/medium/fast",
      "why": "Brief reason why this fits the video",
      "search_query": "YouTube search query to find this song",
      "instrumental_available": true
    }
  ],
  "detected_event_type": "annual_day/sports_day/farewell/cultural/republic_day/teachers_day/general",
  "overall_mood": "The overall mood detected in the video",
  "reasoning": "Why these songs were chosen"
}

Rules:
- Suggest exactly 5 songs
- Mix popular and lesser-known songs
- Include at least 1 instrumental option
- For school events, prefer family-friendly songs
- Consider the emotional arc of the video
- Include songs from different decades for variety`;

    let suggestions;

    if (IS_VERCEL || process.env.GROQ_API_KEY) {
      const OpenAI = (await import("openai")).default;
      const groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY || "",
        baseURL: "https://api.groq.com/openai/v1",
      });

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content || "{}";
      suggestions = JSON.parse(content);
    } else {
      // Fallback: rule-based suggestions
      suggestions = getFallbackSuggestions(language, transcriptText);
    }

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("[music-suggest] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate music suggestions" },
      { status: 500 }
    );
  }
}

function getFallbackSuggestions(language: string, transcript: string) {
  const lowerTranscript = transcript.toLowerCase();

  // Detect event type from transcript
  let eventType = "general";
  let mood = "happy";
  if (lowerTranscript.includes("farewell") || lowerTranscript.includes("goodbye") || lowerTranscript.includes("alvida")) {
    eventType = "farewell"; mood = "emotional";
  } else if (lowerTranscript.includes("sports") || lowerTranscript.includes("race") || lowerTranscript.includes("winner")) {
    eventType = "sports_day"; mood = "energetic";
  } else if (lowerTranscript.includes("republic") || lowerTranscript.includes("independence") || lowerTranscript.includes("flag")) {
    eventType = "republic_day"; mood = "patriotic";
  } else if (lowerTranscript.includes("dance") || lowerTranscript.includes("cultural") || lowerTranscript.includes("sangeet")) {
    eventType = "cultural"; mood = "festive";
  } else if (lowerTranscript.includes("teacher") || lowerTranscript.includes("guru")) {
    eventType = "teachers_day"; mood = "warm";
  } else if (lowerTranscript.includes("annual") || lowerTranscript.includes("celebration") || lowerTranscript.includes("function")) {
    eventType = "annual_day"; mood = "celebratory";
  }

  const songDB: Record<string, Array<{ title: string; artist: string; why: string; search_query: string }>> = {
    farewell: [
      { title: "Kal Ho Naa Ho", artist: "Sonu Nigam", why: "Classic emotional farewell song", search_query: "Kal Ho Naa Ho title track" },
      { title: "Tum Hi Ho", artist: "Arijit Singh", why: "Emotional and widely loved", search_query: "Tum Hi Ho Arijit Singh" },
      { title: "Yeh Jawaani Hai Deewani - Kabira", artist: "Arijit Singh", why: "Bittersweet farewell feeling", search_query: "Kabira Yeh Jawaani Hai Deewani" },
      { title: "Phir Le Aaaya Dil", artist: "Arijit Singh", why: "Nostalgic and emotional", search_query: "Phir Le Aaaya Dil Barfi" },
      { title: "Yaariyan (Piano Instrumental)", artist: "Various", why: "Instrumental for background", search_query: "Yaariyan piano instrumental" },
    ],
    sports_day: [
      { title: "Chak De India", artist: "Sukhwinder Singh", why: "Ultimate sports motivation anthem", search_query: "Chak De India full song" },
      { title: "Ziddi Dil", artist: "Vishal Dadlani", why: "Energetic and motivational", search_query: "Ziddi Dil Mary Kom" },
      { title: "Kar Har Maidaan Fateh", artist: "Sukhwinder Singh", why: "Victory and determination theme", search_query: "Kar Har Maidaan Fateh Sanju" },
      { title: "Sultan Title Track", artist: "Sukhwinder Singh", why: "High energy sports anthem", search_query: "Sultan title track Salman Khan" },
      { title: "Brothers Anthem", artist: "Vishal Dadlani", why: "Athletic energy instrumental", search_query: "Brothers Anthem instrumental" },
    ],
    annual_day: [
      { title: "Badtameez Dil", artist: "Benny Dayal", why: "Fun celebration energy", search_query: "Badtameez Dil Yeh Jawaani" },
      { title: "Gallan Goodiyaan", artist: "Various", why: "Group celebration song", search_query: "Gallan Goodiyaan Dil Dhadakne Do" },
      { title: "Ainvayi Ainvayi", artist: "Salim Merchant", why: "Fun school function energy", search_query: "Ainvayi Ainvayi Band Baaja" },
      { title: "London Thumakda", artist: "Labh Janjua", why: "Celebratory dance number", search_query: "London Thumakda Queen" },
      { title: "Celebration Instrumental", artist: "Various", why: "Upbeat background music", search_query: "Bollywood celebration instrumental" },
    ],
    republic_day: [
      { title: "Ae Watan", artist: "Arijit Singh", why: "Patriotic and emotional", search_query: "Ae Watan Raazi Arijit Singh" },
      { title: "Maa Tujhe Salaam", artist: "A.R. Rahman", why: "Iconic patriotic song", search_query: "Maa Tujhe Salaam AR Rahman" },
      { title: "Rang De Basanti", artist: "Daler Mehndi", why: "Patriotic youth anthem", search_query: "Rang De Basanti title song" },
      { title: "Aye Mere Watan Ke Logon", artist: "Lata Mangeshkar", why: "Classic patriotic song", search_query: "Aye Mere Watan Ke Logon" },
      { title: "Vande Mataram Instrumental", artist: "Various", why: "Instrumental patriotic background", search_query: "Vande Mataram instrumental" },
    ],
    cultural: [
      { title: "Nagada Sang Dhol", artist: "Shreya Ghoshal", why: "Cultural celebration energy", search_query: "Nagada Sang Dhol Goliyon Ki" },
      { title: "Dola Re Dola", artist: "Kavita Krishnamurthy", why: "Classical dance performance", search_query: "Dola Re Dola Devdas" },
      { title: "Ghoomar", artist: "Shreya Ghoshal", why: "Traditional dance anthem", search_query: "Ghoomar Padmaavat" },
      { title: "Pinga", artist: "Shreya Ghoshal", why: "Energetic traditional dance", search_query: "Pinga Bajirao Mastani" },
      { title: "Classical Fusion Instrumental", artist: "Various", why: "Background for cultural acts", search_query: "Indian classical fusion instrumental" },
    ],
    teachers_day: [
      { title: "Aye Khuda", artist: "Adnan Sami", why: "Gratitude and respect", search_query: "Aye Khuda Paathshaala" },
      { title: "Hum Honge Kamyab", artist: "Various", why: "Inspirational school classic", search_query: "Hum Honge Kamyab" },
      { title: "Taare Zameen Par", artist: "Shankar Mahadevan", why: "Teacher-student bond", search_query: "Taare Zameen Par title track" },
      { title: "Aashayein", artist: "KK", why: "Hopeful and aspirational", search_query: "Aashayein Iqbal KK" },
      { title: "Guru Brahma Instrumental", artist: "Various", why: "Peaceful background", search_query: "Guru Brahma shloka instrumental" },
    ],
    general: [
      { title: "Kal Ho Naa Ho", artist: "Sonu Nigam", why: "Universally loved, fits any event", search_query: "Kal Ho Naa Ho title track" },
      { title: "Yeh Dosti", artist: "Kishore Kumar", why: "Classic friendship song", search_query: "Yeh Dosti Hum Nahi Todenge Sholay" },
      { title: "Lakdi Ki Kaathi", artist: "Vanita Mishra", why: "Fun children's classic", search_query: "Lakdi Ki Kaathi Masoom" },
      { title: "Hum Honge Kamyab", artist: "Various", why: "Inspirational classic", search_query: "Hum Honge Kamyab Hindi" },
      { title: "Soft Piano Bollywood Medley", artist: "Various", why: "Gentle instrumental background", search_query: "Bollywood piano medley instrumental" },
    ],
  };

  const songs = songDB[eventType] || songDB.general;

  return {
    suggestions: songs.map(s => ({
      ...s,
      language: language === "hindi" ? "hindi" : "english",
      mood,
      genre: "bollywood",
      tempo: "medium",
      instrumental_available: s.title.toLowerCase().includes("instrumental"),
    })),
    detected_event_type: eventType,
    overall_mood: mood,
    reasoning: `Based on transcript analysis, this appears to be a ${eventType.replace("_", " ")} event with a ${mood} mood.`,
  };
}
