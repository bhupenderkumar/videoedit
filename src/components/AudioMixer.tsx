"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX, Music, Mic, AudioWaveform, Loader2 } from "lucide-react";
import { AudioSettings, DEFAULT_AUDIO_SETTINGS, AUDIO_PRESETS } from "@/lib/audio/processor";
import { cn } from "@/lib/utils";

interface AudioMixerProps {
  projectId: string;
  audioSettings: AudioSettings | null;
  onSettingsChange: (settings: AudioSettings) => void;
}

export default function AudioMixer({ projectId, audioSettings, onSettingsChange }: AudioMixerProps) {
  const [settings, setSettings] = useState<AudioSettings>(audioSettings ?? DEFAULT_AUDIO_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (audioSettings) setSettings(audioSettings);
  }, [audioSettings]);

  useEffect(() => {
    const match = Object.entries(AUDIO_PRESETS).find(
      ([, p]) => JSON.stringify(p.settings) === JSON.stringify(settings)
    );
    setActivePreset(match ? match[0] : null);
  }, [settings]);

  function update(patch: Partial<AudioSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function applyPreset(key: string) {
    const preset = AUDIO_PRESETS[key as keyof typeof AUDIO_PRESETS];
    if (preset) {
      setSettings({ ...DEFAULT_AUDIO_SETTINGS, ...preset.settings } as AudioSettings);
      setActivePreset(key);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/audio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSettingsChange(settings);
    } catch (err) {
      console.error("Save audio settings failed:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Presets */}
      <div>
        <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
          <AudioWaveform className="w-4 h-4" /> Presets
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(AUDIO_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={cn(
                "rounded-lg border p-2 text-left transition-colors",
                activePreset === key
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="text-sm font-medium">{preset.label}</div>
              <div className="text-xs text-muted-foreground">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Voice */}
      <div>
        <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
          <Mic className="w-4 h-4" /> Voice
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["original", "suppress", "enhance", "remove"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => update({ voice_mode: mode })}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  settings.voice_mode === mode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {mode === "original" ? "Keep" : mode === "suppress" ? "Suppress" : mode === "enhance" ? "Enhance" : "Remove"}
              </button>
            ))}
          </div>

          {settings.voice_mode !== "remove" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Voice Volume</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(settings.voice_volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.voice_volume * 100)}
                onChange={(e) => update({ voice_volume: Number(e.target.value) / 100 })}
                className="w-full accent-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Music */}
      <div>
        <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
          <Music className="w-4 h-4" /> Music
        </h3>
        <div className="space-y-3">
          <button
            onClick={() => update({ music_enabled: !settings.music_enabled })}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors w-full",
              settings.music_enabled
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            )}
          >
            {settings.music_enabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            {settings.music_enabled ? "Music On" : "Music Off"}
          </button>

          {settings.music_enabled && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Music Volume</span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(settings.music_volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.music_volume * 100)}
                  onChange={(e) => update({ music_volume: Number(e.target.value) / 100 })}
                  className="w-full accent-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Fade In</span>
                    <span className="text-xs text-muted-foreground">
                      {settings.music_fade_in.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={Math.round(settings.music_fade_in * 10)}
                    onChange={(e) => update({ music_fade_in: Number(e.target.value) / 10 })}
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Fade Out</span>
                    <span className="text-xs text-muted-foreground">
                      {settings.music_fade_out.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={Math.round(settings.music_fade_out * 10)}
                    onChange={(e) => update({ music_fade_out: Number(e.target.value) / 10 })}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Advanced (collapsible) */}
      <div>
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="text-sm font-medium flex items-center gap-1.5 w-full"
        >
          <span className={cn("transition-transform", advancedOpen && "rotate-90")}>▶</span>
          Advanced
        </button>

        {advancedOpen && (
          <div className="mt-2 space-y-3 pl-4 border-l border-border">
            {/* Auto-duck */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Auto-duck</div>
                <div className="text-xs text-muted-foreground">
                  Lower music when speech is detected
                </div>
              </div>
              <button
                onClick={() => update({ auto_duck: !settings.auto_duck })}
                className={cn(
                  "rounded-lg border px-3 py-1 text-xs transition-colors",
                  settings.auto_duck
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {settings.auto_duck ? "On" : "Off"}
              </button>
            </div>

            {settings.auto_duck && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Duck Ratio</span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(settings.duck_ratio * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.duck_ratio * 100)}
                  onChange={(e) => update({ duck_ratio: Number(e.target.value) / 100 })}
                  className="w-full accent-primary"
                />
              </div>
            )}

            {/* Noise reduction */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Noise Reduction</div>
                <div className="text-xs text-muted-foreground">
                  Reduce background noise
                </div>
              </div>
              <button
                onClick={() => update({ noise_reduction: !settings.noise_reduction })}
                className={cn(
                  "rounded-lg border px-3 py-1 text-xs transition-colors",
                  settings.noise_reduction
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {settings.noise_reduction ? "On" : "Off"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className={cn(
          "w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
          saving ? "opacity-60 cursor-not-allowed" : "hover:bg-primary/90"
        )}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Saving…
          </span>
        ) : (
          "Save Audio Settings"
        )}
      </button>
    </div>
  );
}
