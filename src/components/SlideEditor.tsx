"use client";

import { useState } from "react";
import { SLIDE_STYLES, SlideStyle, IntroSlide } from "@/lib/slides";
import { EVENT_TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { Paintbrush, Type, Calendar, School, Sparkles } from "lucide-react";

const PRESET_COLORS = [
  "#6d28d9",
  "#1e40af",
  "#dc2626",
  "#059669",
  "#d97706",
  "#be185d",
];

const ANIMATIONS = ["typewriter", "fade_up", "scale_in", "slide_left"] as const;

interface SlideEditorProps {
  slide: IntroSlide;
  onChange: (slide: IntroSlide) => void;
  label?: string;
}

export default function SlideEditor({
  slide,
  onChange,
  label = "Intro Slide",
}: SlideEditorProps) {
  const update = (patch: Partial<IntroSlide>) => {
    onChange({ ...slide, ...patch });
  };

  const applyTemplate = (templateId: string) => {
    const tpl = EVENT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    update({
      style: tpl.intro_style as SlideStyle,
      color: tpl.intro_color ?? slide.color,
      animation: tpl.intro_animation ?? slide.animation,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-5">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        {label}
      </h3>

      {/* Template quick-apply */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Quick Template</label>
        <select
          className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          value=""
          onChange={(e) => applyTemplate(e.target.value)}
        >
          <option value="" disabled>
            Apply a template…
          </option>
          {EVENT_TEMPLATES.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name}
            </option>
          ))}
        </select>
      </div>

      {/* Style picker */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Paintbrush className="h-3.5 w-3.5" />
          Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SLIDE_STYLES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => update({ style: s.key })}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                slide.style === s.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-secondary/50 hover:bg-secondary"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text inputs */}
      <div className="space-y-3">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Type className="h-3.5 w-3.5" />
          Text Fields
        </label>

        {(
          [
            { key: "title", placeholder: "Title" },
            { key: "subtitle", placeholder: "Subtitle" },
            { key: "event_name", placeholder: "Event Name" },
            { key: "tagline", placeholder: "Tagline" },
          ] as const
        ).map(({ key, placeholder }) => (
          <input
            key={key}
            type="text"
            placeholder={placeholder}
            value={(slide as any)[key] ?? ""}
            onChange={(e) => update({ [key]: e.target.value })}
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        ))}

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Event Date
            </label>
            <input
              type="text"
              placeholder="e.g. June 2025"
              value={slide.event_date ?? ""}
              onChange={(e) => update({ event_date: e.target.value })}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <School className="h-3 w-3" />
              School Name
            </label>
            <input
              type="text"
              placeholder="School / Org"
              value={slide.school_name ?? ""}
              onChange={(e) => update({ school_name: e.target.value })}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </div>

      {/* Color picker */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Paintbrush className="h-3.5 w-3.5" />
          Accent Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="#6d28d9"
            value={slide.color ?? ""}
            onChange={(e) => update({ color: e.target.value })}
            className="w-28 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update({ color: c })}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                  slide.color === c
                    ? "border-primary scale-110"
                    : "border-transparent"
                )}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Animation picker */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Animation</label>
        <select
          value={slide.animation ?? "fade_up"}
          onChange={(e) => update({ animation: e.target.value as "typewriter" | "fade_up" | "scale_in" | "slide_left" })}
          className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        >
          {ANIMATIONS.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Duration slider */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          Duration:{" "}
          <span className="font-medium text-foreground">
            {slide.duration ?? 4}s
          </span>
        </label>
        <input
          type="range"
          min={2}
          max={8}
          step={0.5}
          value={slide.duration ?? 4}
          onChange={(e) => update({ duration: parseFloat(e.target.value) })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>2s</span>
          <span>8s</span>
        </div>
      </div>
    </div>
  );
}
