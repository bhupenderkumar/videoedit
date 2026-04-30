// ── Audio Processing Utilities ──────────────────────────────────────────────

export interface AudioSettings {
  voice_mode: "original" | "suppress" | "enhance" | "remove";
  voice_volume: number;
  music_enabled: boolean;
  music_volume: number;
  music_fade_in: number;
  music_fade_out: number;
  auto_duck: boolean;
  duck_ratio: number;
  noise_reduction: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  voice_mode: "original",
  voice_volume: 1.0,
  music_enabled: false,
  music_volume: 0.3,
  music_fade_in: 2,
  music_fade_out: 3,
  auto_duck: true,
  duck_ratio: 0.2,
  noise_reduction: false,
};

export type AudioPresetKey = "original" | "music_only" | "voice_bg_music" | "cinematic" | "music_video";

export const AUDIO_PRESETS: Record<AudioPresetKey, { label: string; description: string; settings: Partial<AudioSettings> }> = {
  original: {
    label: "Original",
    description: "Raw video audio, no changes",
    settings: { voice_mode: "original", voice_volume: 1.0, music_enabled: false },
  },
  music_only: {
    label: "Music Only",
    description: "Suppress voice, play background music",
    settings: { voice_mode: "suppress", voice_volume: 0.1, music_enabled: true, music_volume: 0.8, auto_duck: false },
  },
  voice_bg_music: {
    label: "Voice + Music",
    description: "Full voice with low background music, auto-ducking",
    settings: { voice_mode: "original", voice_volume: 1.0, music_enabled: true, music_volume: 0.25, auto_duck: true, duck_ratio: 0.15 },
  },
  cinematic: {
    label: "Cinematic",
    description: "Enhanced voice with medium music and ducking",
    settings: { voice_mode: "enhance", voice_volume: 1.0, music_enabled: true, music_volume: 0.4, auto_duck: true, duck_ratio: 0.25, noise_reduction: true },
  },
  music_video: {
    label: "Music Video",
    description: "Remove voice entirely, full music",
    settings: { voice_mode: "remove", voice_volume: 0, music_enabled: true, music_volume: 1.0, auto_duck: false },
  },
};

// ── Expanded Royalty-Free Music Library ─────────────────────────────────────

export interface MusicTrack {
  id: string;
  name: string;
  mood: string;
  genre: string;
  tempo: string;
  language: string;
  category: string;
  url: string;
  duration?: number;
}

export const MUSIC_LIBRARY: MusicTrack[] = [
  // Celebration
  { id: "uplifting", name: "Uplifting Journey", mood: "happy", genre: "pop", tempo: "medium", language: "instrumental", category: "celebration", url: "https://cdn.pixabay.com/audio/2024/11/29/audio_7e3dfe6f72.mp3" },
  { id: "celebration", name: "Celebration Time", mood: "festive", genre: "pop", tempo: "fast", language: "instrumental", category: "celebration", url: "https://cdn.pixabay.com/audio/2022/10/30/audio_f2bd5bfbd6.mp3" },
  { id: "fun", name: "Fun & Playful", mood: "cheerful", genre: "pop", tempo: "fast", language: "instrumental", category: "celebration", url: "https://cdn.pixabay.com/audio/2024/02/14/audio_8e5e7cf05d.mp3" },
  // Professional
  { id: "corporate", name: "Corporate Inspire", mood: "professional", genre: "corporate", tempo: "medium", language: "instrumental", category: "professional", url: "https://cdn.pixabay.com/audio/2024/09/10/audio_6e1ebc2e5e.mp3" },
  { id: "cinematic", name: "Cinematic Emotional", mood: "dramatic", genre: "orchestral", tempo: "slow", language: "instrumental", category: "emotional", url: "https://cdn.pixabay.com/audio/2024/07/23/audio_ba3e8e0db1.mp3" },
  // Relaxed
  { id: "chill", name: "Chill Lo-Fi", mood: "relaxed", genre: "lofi", tempo: "slow", language: "instrumental", category: "relaxed", url: "https://cdn.pixabay.com/audio/2024/04/15/audio_62b01623a7.mp3" },
  // Energetic
  { id: "energetic_beat", name: "Energetic Beat", mood: "energetic", genre: "electronic", tempo: "fast", language: "instrumental", category: "energetic", url: "https://cdn.pixabay.com/audio/2024/01/10/audio_d0f97c6db3.mp3" },
  // Emotional
  { id: "piano_gentle", name: "Gentle Piano", mood: "emotional", genre: "piano", tempo: "slow", language: "instrumental", category: "emotional", url: "https://cdn.pixabay.com/audio/2024/03/22/audio_3dff04fa35.mp3" },
  // Indian / Traditional
  { id: "indian_flute", name: "Indian Flute", mood: "peaceful", genre: "indian", tempo: "slow", language: "instrumental", category: "traditional", url: "https://cdn.pixabay.com/audio/2023/08/07/audio_e12fcc1faf.mp3" },
  // Children
  { id: "kids_play", name: "Kids Playtime", mood: "playful", genre: "children", tempo: "medium", language: "instrumental", category: "children", url: "https://cdn.pixabay.com/audio/2023/06/01/audio_c0c62d9b0a.mp3" },
  // Documentary
  { id: "ambient_doc", name: "Documentary Ambient", mood: "thoughtful", genre: "ambient", tempo: "slow", language: "instrumental", category: "documentary", url: "https://cdn.pixabay.com/audio/2024/05/20/audio_b04402eaef.mp3" },
  // Patriotic (generic, royalty-free)
  { id: "triumphant", name: "Triumphant March", mood: "patriotic", genre: "orchestral", tempo: "medium", language: "instrumental", category: "patriotic", url: "https://cdn.pixabay.com/audio/2023/10/12/audio_4b6058c5e4.mp3" },
];

export function getTracksByCategory(category: string): MusicTrack[] {
  return MUSIC_LIBRARY.filter(t => t.category === category);
}

export function getTracksByMood(mood: string): MusicTrack[] {
  return MUSIC_LIBRARY.filter(t => t.mood === mood || t.genre === mood);
}

export function findBestTrack(mood: string, genre?: string): MusicTrack | undefined {
  if (genre) {
    const match = MUSIC_LIBRARY.find(t => t.genre === genre && t.mood === mood);
    if (match) return match;
  }
  return MUSIC_LIBRARY.find(t => t.mood === mood) || MUSIC_LIBRARY[0];
}

// ── FFmpeg Audio Filter Builder (Server-Side) ──────────────────────────────

export function buildAudioFilters(settings: AudioSettings, videoDuration: number): string[] {
  const filters: string[] = [];

  // Voice processing
  if (settings.voice_mode === "suppress") {
    filters.push(`volume=${settings.voice_volume}`);
    filters.push("highpass=f=200");
    filters.push("lowpass=f=3000");
  } else if (settings.voice_mode === "enhance") {
    filters.push("acompressor=threshold=-20dB:ratio=4:attack=5:release=50");
    filters.push("equalizer=f=2500:t=q:w=1:g=3");
  } else if (settings.voice_mode === "remove") {
    filters.push("volume=0");
  } else {
    filters.push(`volume=${settings.voice_volume}`);
  }

  // Noise reduction
  if (settings.noise_reduction) {
    filters.push("anlmdn=s=7:p=0.002");
  }

  // Audio normalization
  filters.push("loudnorm=I=-16:LRA=11:TP=-1.5");

  return filters;
}

export function buildMusicMixCommand(
  videoInput: string,
  musicInput: string,
  output: string,
  settings: AudioSettings,
  videoDuration: number
): string[] {
  const args: string[] = [
    "-i", videoInput,
    "-i", musicInput,
    "-filter_complex",
  ];

  const voiceFilters = buildAudioFilters(settings, videoDuration).join(",");
  const fadeIn = settings.music_fade_in;
  const fadeOut = settings.music_fade_out;
  const fadeOutStart = Math.max(0, videoDuration - fadeOut);

  let filterComplex = `[0:a]${voiceFilters}[voice];`;
  filterComplex += `[1:a]volume=${settings.music_volume},afade=t=in:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}[music];`;

  if (settings.auto_duck) {
    filterComplex += `[voice][music]sidechaincompress=threshold=0.02:ratio=${1 / settings.duck_ratio}:attack=100:release=500[mixed]`;
  } else {
    filterComplex += `[voice][music]amix=inputs=2:duration=first:weights=1 ${settings.music_volume}[mixed]`;
  }

  args.push(filterComplex, "-map", "0:v", "-map", "[mixed]");
  return args;
}
