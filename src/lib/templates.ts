// ── Event Templates System ─────────────────────────────────────────────────
// Pre-built configurations for common school/business events

import type { SlideStyle } from "./slides";

export interface EventTemplate {
  id: string;
  name: string;
  category: "school" | "business" | "personal";
  description: string;
  icon: string;
  intro_style: SlideStyle;
  outro_style: SlideStyle;
  intro_color: string;
  outro_color: string;
  color_grade: string;
  music_mood: string;
  music_genre: string;
  default_transitions: string[];
  effects: { brightness: number; contrast: number; saturation: number };
  animation_pool: string[];
  intro_animation: "typewriter" | "fade_up" | "scale_in" | "slide_left";
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  // ── School Events ────────────────────────────────────────────────────────
  {
    id: "annual_day",
    name: "Annual Day",
    category: "school",
    description: "School annual day celebrations with colorful performances",
    icon: "🎭",
    intro_style: "school_festive",
    outro_style: "school_festive",
    intro_color: "#ff6b35",
    outro_color: "#7c4dff",
    color_grade: "vibrant",
    music_mood: "celebratory",
    music_genre: "festive",
    default_transitions: ["crossfade", "flash", "circle_reveal"],
    effects: { brightness: 1.05, contrast: 1.05, saturation: 1.15 },
    animation_pool: ["zoom_in", "ken_burns", "bounce_zoom", "slide_in_left", "fade_in_zoom", "sway"],
    intro_animation: "scale_in",
  },
  {
    id: "sports_day",
    name: "Sports Day",
    category: "school",
    description: "Energetic sports events and athletic competitions",
    icon: "⚽",
    intro_style: "school_sports",
    outro_style: "school_sports",
    intro_color: "#ff4444",
    outro_color: "#ff4444",
    color_grade: "dramatic",
    music_mood: "energetic",
    music_genre: "rock",
    default_transitions: ["flash", "wipe_left", "slide_push"],
    effects: { brightness: 1.0, contrast: 1.15, saturation: 1.1 },
    animation_pool: ["dramatic_zoom", "shake", "slide_in_left", "slide_in_right", "zoom_in", "pan_left"],
    intro_animation: "slide_left",
  },
  {
    id: "farewell",
    name: "Farewell / Graduation",
    category: "school",
    description: "Emotional farewell and graduation ceremonies",
    icon: "🎓",
    intro_style: "school_graduation",
    outro_style: "school_graduation",
    intro_color: "#1a2744",
    outro_color: "#1a2744",
    color_grade: "warm",
    music_mood: "emotional",
    music_genre: "acoustic",
    default_transitions: ["crossfade", "fade_black"],
    effects: { brightness: 1.02, contrast: 1.0, saturation: 1.05 },
    animation_pool: ["ken_burns", "zoom_in", "drift_left", "drift_right", "focus_pull", "float"],
    intro_animation: "fade_up",
  },
  {
    id: "cultural_program",
    name: "Cultural Program",
    category: "school",
    description: "Dance, music, and cultural performances",
    icon: "🎵",
    intro_style: "school_cultural",
    outro_style: "school_cultural",
    intro_color: "#8B0000",
    outro_color: "#8B4513",
    color_grade: "golden",
    music_mood: "traditional",
    music_genre: "indian_classical",
    default_transitions: ["crossfade", "dissolve", "circle_reveal"],
    effects: { brightness: 1.05, contrast: 1.05, saturation: 1.2 },
    animation_pool: ["ken_burns", "zoom_in", "pan_left", "pan_right", "parallax", "glide"],
    intro_animation: "typewriter",
  },
  {
    id: "republic_independence",
    name: "Republic / Independence Day",
    category: "school",
    description: "Patriotic celebrations and flag hoisting",
    icon: "🇮🇳",
    intro_style: "school_modern",
    outro_style: "school_modern",
    intro_color: "#138808",
    outro_color: "#FF9933",
    color_grade: "natural",
    music_mood: "patriotic",
    music_genre: "patriotic",
    default_transitions: ["crossfade", "wipe_right"],
    effects: { brightness: 1.05, contrast: 1.05, saturation: 1.1 },
    animation_pool: ["zoom_in", "pan_right", "ken_burns", "drift_right", "glide"],
    intro_animation: "scale_in",
  },
  {
    id: "teachers_day",
    name: "Teacher's Day",
    category: "school",
    description: "Honoring teachers with performances and speeches",
    icon: "👩‍🏫",
    intro_style: "school_modern",
    outro_style: "minimal",
    intro_color: "#3b82f6",
    outro_color: "#3b82f6",
    color_grade: "warm",
    music_mood: "warm",
    music_genre: "acoustic",
    default_transitions: ["crossfade", "fade_black"],
    effects: { brightness: 1.02, contrast: 1.0, saturation: 1.05 },
    animation_pool: ["ken_burns", "zoom_in", "drift_left", "focus_pull", "float", "parallax"],
    intro_animation: "fade_up",
  },
  {
    id: "science_fair",
    name: "Science Fair / Exhibition",
    category: "school",
    description: "Student projects and scientific demonstrations",
    icon: "🔬",
    intro_style: "school_modern",
    outro_style: "school_modern",
    intro_color: "#06b6d4",
    outro_color: "#06b6d4",
    color_grade: "cool",
    music_mood: "curious",
    music_genre: "electronic",
    default_transitions: ["zoom_blur", "wipe_right", "dissolve"],
    effects: { brightness: 1.05, contrast: 1.05, saturation: 1.0 },
    animation_pool: ["zoom_in", "zoom_out", "focus_pull", "dramatic_zoom", "glide", "parallax"],
    intro_animation: "scale_in",
  },
  {
    id: "ptm",
    name: "Parent-Teacher Meeting",
    category: "school",
    description: "Professional documentation of PTM events",
    icon: "🤝",
    intro_style: "minimal",
    outro_style: "minimal",
    intro_color: "#6d28d9",
    outro_color: "#6d28d9",
    color_grade: "natural",
    music_mood: "professional",
    music_genre: "ambient",
    default_transitions: ["crossfade", "fade_black"],
    effects: { brightness: 1.0, contrast: 1.0, saturation: 1.0 },
    animation_pool: ["ken_burns", "drift_right", "zoom_in", "pan_left"],
    intro_animation: "fade_up",
  },

  // ── Business Events ──────────────────────────────────────────────────────
  {
    id: "corporate_event",
    name: "Corporate Event",
    category: "business",
    description: "Professional corporate events and seminars",
    icon: "💼",
    intro_style: "minimal",
    outro_style: "minimal",
    intro_color: "#1a1a2e",
    outro_color: "#1a1a2e",
    color_grade: "film",
    music_mood: "professional",
    music_genre: "corporate",
    default_transitions: ["crossfade", "fade_black"],
    effects: { brightness: 1.0, contrast: 1.05, saturation: 0.95 },
    animation_pool: ["ken_burns", "zoom_in", "drift_right", "glide", "parallax"],
    intro_animation: "fade_up",
  },
  {
    id: "product_launch",
    name: "Product Launch",
    category: "business",
    description: "Energetic product reveals and launches",
    icon: "🚀",
    intro_style: "bold",
    outro_style: "bold",
    intro_color: "#6d28d9",
    outro_color: "#ec4899",
    color_grade: "vibrant",
    music_mood: "exciting",
    music_genre: "electronic",
    default_transitions: ["flash", "zoom_blur", "slide_push"],
    effects: { brightness: 1.05, contrast: 1.1, saturation: 1.15 },
    animation_pool: ["dramatic_zoom", "bounce_zoom", "slide_in_left", "zoom_in_rotate", "reveal_scale"],
    intro_animation: "scale_in",
  },
  {
    id: "wedding",
    name: "Wedding / Celebration",
    category: "personal",
    description: "Beautiful wedding and celebration videos",
    icon: "💒",
    intro_style: "gradient",
    outro_style: "gradient",
    intro_color: "#b91c1c",
    outro_color: "#b91c1c",
    color_grade: "golden",
    music_mood: "romantic",
    music_genre: "bollywood",
    default_transitions: ["crossfade", "dissolve", "circle_reveal"],
    effects: { brightness: 1.05, contrast: 1.0, saturation: 1.1 },
    animation_pool: ["ken_burns", "zoom_in", "drift_left", "float", "parallax", "focus_pull"],
    intro_animation: "fade_up",
  },
];

export function getTemplate(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): EventTemplate[] {
  return EVENT_TEMPLATES.filter(t => t.category === category);
}
