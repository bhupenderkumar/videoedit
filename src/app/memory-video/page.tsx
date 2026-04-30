"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImagePlus,
  Loader2,
  Music2,
  X,
  ArrowUp,
  ArrowDown,
  Download,
  Share2,
  Sparkles,
  Smartphone,
  Square,
  Monitor,
  Heart,
  Upload,
  Play,
  Trash2,
  Image as ImageIcon,
  Palette,
  Type as TypeIcon,
  Settings2,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";

interface MusicTrack {
  id: string;
  name: string;
  mood: string;
  genre: string;
  category: string;
  url: string;
}

interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
}

interface StyleMeta {
  id: string;
  label: string;
  description: string;
  defaultMusicPrompt: string;
}

interface AiPreset {
  id: string;
  label: string;
  prompt: string;
  tags: string[];
}

type MusicMode = "none" | "library" | "upload" | "ai";

const aspectOptions = [
  { id: "9:16", label: "Vertical", desc: "Best for WhatsApp / Stories", icon: Smartphone },
  { id: "1:1", label: "Square", desc: "Instagram feed", icon: Square },
  { id: "16:9", label: "Landscape", desc: "YouTube / TV", icon: Monitor },
];

export default function MemoryVideoPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [aspect, setAspect] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [photoDuration, setPhotoDuration] = useState(3.5);
  const [transitionDuration, setTransitionDuration] = useState(1.0);
  const [musicVolume, setMusicVolume] = useState(0.6);

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [customMusic, setCustomMusic] = useState<File | null>(null);
  const [previewTrack, setPreviewTrack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Style + AI music state
  const [style, setStyle] = useState<string>("cinematic");
  const [styleList, setStyleList] = useState<StyleMeta[]>([]);
  const [aiPresets, setAiPresets] = useState<AiPreset[]>([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPresetId, setAiPresetId] = useState("");
  const [musicMode, setMusicMode] = useState<MusicMode>("library");

  // AI music preview cache
  const [aiPreviewBusy, setAiPreviewBusy] = useState(false);
  const [aiPreviewTrackId, setAiPreviewTrackId] = useState("");
  const [aiPreviewUrl, setAiPreviewUrl] = useState("");
  const [aiPreviewLabel, setAiPreviewLabel] = useState("");

  // Title placement + AI caption brief
  const [titlePosition, setTitlePosition] = useState<"top" | "center" | "bottom">("bottom");
  const [aiBrief, setAiBrief] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiLang, setAiLang] = useState<"en" | "hi" | "hinglish">("en");
  const [useVisionCaptions, setUseVisionCaptions] = useState(true);

  // Effects
  const [fxVignette, setFxVignette] = useState(false);
  const [fxFilmBorders, setFxFilmBorders] = useState(false);
  const [fxLightLeak, setFxLightLeak] = useState(false);
  const [fxFilmGrain, setFxFilmGrain] = useState(false);

  // End card
  const [endCardEnabled, setEndCardEnabled] = useState(false);
  const [endCardTitle, setEndCardTitle] = useState("Made with love");
  const [endCardSubtitle, setEndCardSubtitle] = useState("");

  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; url: string; duration: number; file_size: number } | null>(null);

  // Load music library
  useEffect(() => {
    fetch("/api/music-tracks")
      .then((r) => r.json())
      .then((d) => setTracks(d.tracks || []))
      .catch(() => setTracks([]));
  }, []);

  // Load styles + AI music presets/config
  useEffect(() => {
    fetch("/api/ai-music")
      .then((r) => r.json())
      .then((d) => {
        setStyleList(d.styles || []);
        setAiPresets(d.presets || []);
        setAiConfigured(!!d.configured);
      })
      .catch(() => {});
  }, []);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalDuration = useMemo(() => {
    if (!photos.length) return 0;
    return photos.length * photoDuration + transitionDuration;
  }, [photos.length, photoDuration, transitionDuration]);

  // Auto-scroll to result when render finishes (esp. on mobile)
  useEffect(() => {
    if (result) {
      requestAnimationFrame(() => {
        document.getElementById("sec-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [result]);

  function handleFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    const next: PhotoItem[] = [];
    for (const f of arr) {
      if (!/^image\//.test(f.type)) continue;
      if (f.size > 25 * 1024 * 1024) continue;
      next.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        caption: "",
      });
    }
    setPhotos((prev) => [...prev, ...next].slice(0, 60));
    setResult(null);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function move(id: string, dir: -1 | 1) {
    setPhotos((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  function setCaption(id: string, caption: string) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  async function handleGenerateMusicPreview() {
    if (!aiPrompt.trim() && !aiPresetId) return;
    setAiPreviewBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ai-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt.trim() || undefined,
          presetId: aiPresetId || undefined,
          instrumental: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Music generation failed");
      setAiPreviewTrackId(data.id);
      setAiPreviewUrl(data.url);
      const presetLabel = aiPresets.find((p) => p.id === aiPresetId)?.label;
      setAiPreviewLabel(aiPrompt.trim() || presetLabel || "AI track");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Music generation failed");
    } finally {
      setAiPreviewBusy(false);
    }
  }

  async function handleSuggest() {
    if (!aiBrief.trim()) return;
    setAiBusy(true);
    setError("");
    try {
      let res: Response;
      if (useVisionCaptions && photos.length) {
        const fd = new FormData();
        fd.append("brief", aiBrief.trim());
        fd.append("style", style);
        fd.append("photoCount", String(photos.length));
        fd.append("language", aiLang);
        fd.append("includeCaptions", "true");
        for (const p of photos) fd.append("photos", p.file, p.file.name);
        res = await fetch("/api/ai-captions", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/ai-captions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: aiBrief.trim(),
            style,
            photoCount: photos.length,
            language: aiLang,
            includeCaptions: true,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI suggestion failed");
      if (data.title) setTitle(data.title);
      if (data.subtitle) setSubtitle(data.subtitle);
      if (data.endCardLine) {
        setEndCardEnabled(true);
        setEndCardTitle(data.endCardLine);
      }
      if (Array.isArray(data.captions) && data.captions.length) {
        setPhotos((prev) =>
          prev.map((p, i) => ({
            ...p,
            caption: (data.captions[i] as string) || p.caption,
          }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI suggestion failed");
    } finally {
      setAiBusy(false);
    }
  }

  function clearAll() {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setResult(null);
  }

  function onPreviewTrack(trackId: string, url: string) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (previewTrack === trackId) {
      setPreviewTrack(null);
      return;
    }
    const a = new Audio(url);
    a.volume = 0.5;
    a.play().catch(() => {});
    a.onended = () => setPreviewTrack(null);
    audioRef.current = a;
    setPreviewTrack(trackId);
  }

  async function handleGenerate() {
    if (photos.length < 1) {
      setError("Add at least one photo");
      return;
    }
    setError("");
    setResult(null);
    setRendering(true);

    try {
      const fd = new FormData();
      for (const p of photos) fd.append("photos", p.file, p.file.name);
      fd.append("title", title);
      fd.append("subtitle", subtitle);
      fd.append("aspect", aspect);
      fd.append("photoDuration", String(photoDuration));
      fd.append("transitionDuration", String(transitionDuration));
      fd.append("musicVolume", String(musicVolume));
      fd.append("captions", JSON.stringify(photos.map((p) => p.caption || "")));
      fd.append("style", style);
      fd.append("titlePosition", titlePosition);
      fd.append(
        "effects",
        JSON.stringify({
          vignette: fxVignette,
          filmBorders: fxFilmBorders,
          lightLeak: fxLightLeak,
          filmGrain: fxFilmGrain,
        })
      );
      if (endCardEnabled && (endCardTitle.trim() || endCardSubtitle.trim())) {
        fd.append(
          "endCard",
          JSON.stringify({
            title: endCardTitle.trim(),
            subtitle: endCardSubtitle.trim(),
            duration: 3,
          })
        );
      }
      if (musicMode === "upload" && customMusic) {
        fd.append("music", customMusic, customMusic.name);
      } else if (musicMode === "ai") {
        if (aiPreviewTrackId) {
          fd.append("aiMusicTrackId", aiPreviewTrackId);
        } else {
          if (aiPrompt.trim()) fd.append("aiMusicPrompt", aiPrompt.trim());
          if (aiPresetId) fd.append("aiMusicPresetId", aiPresetId);
        }
      } else if (musicMode === "library" && selectedTrackId) {
        fd.append("musicTrackId", selectedTrackId);
      }

      const res = await fetch("/api/memory-video", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Render failed (${res.status})`);
      }
      const data = await res.json();
      setResult({ id: data.id, url: data.url, duration: data.duration, file_size: data.file_size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render failed");
    } finally {
      setRendering(false);
    }
  }

  async function handleShare() {
    if (!result) return;
    const fullUrl = `${location.origin}${result.url}`;
    const shareData = {
      title: title || "A memory video",
      text: title ? `${title} — made with love ❤️` : "A memory to share ❤️",
      url: fullUrl,
    };
    try {
      // Try Web Share API with file (where supported, e.g., mobile Safari/Chrome)
      const fileRes = await fetch(result.url);
      const blob = await fileRes.blob();
      const file = new File([blob], `memory-${result.id}.mp4`, { type: "video/mp4" });
      const navWithShare = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
        share?: (data: ShareData & { files?: File[] }) => Promise<void>;
      };
      if (navWithShare.canShare?.({ files: [file] }) && navWithShare.share) {
        await navWithShare.share({ ...shareData, files: [file] });
        return;
      }
      if (navWithShare.share) {
        await navWithShare.share(shareData);
        return;
      }
    } catch {
      // fallthrough to copy
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      alert("Link copied to clipboard");
    } catch {
      alert(fullUrl);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-40 lg:px-0 lg:pb-12">
      {/* Mobile sticky app bar */}
      <div
        className="sticky top-0 z-40 -mx-4 mb-4 flex items-center gap-3 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md lg:hidden"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md">
          <Heart className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">Memory Video</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {photos.length
              ? `${photos.length} photo${photos.length === 1 ? "" : "s"} • ~${Math.round(totalDuration)}s`
              : "Upload photos to begin"}
          </div>
        </div>
        {photos.length > 0 && (
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {aspect}
          </span>
        )}
      </div>

      {/* Desktop header */}
      <div className="mb-6 hidden items-start gap-3 lg:mb-8 lg:flex">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Memory Video for Parents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Upload photos, pick music, and we'll craft a beautiful video to share.
          </p>
        </div>
      </div>

      {/* Result panel */}
      {result && (
        <div id="sec-result" className="mb-6 overflow-hidden rounded-2xl border border-success/40 bg-gradient-to-br from-success/10 to-primary/5 p-5 shadow-lg scroll-mt-24">
          <div className="flex items-center gap-2 text-success">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Your video is ready</span>
          </div>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <video
                src={result.url}
                controls
                playsInline
                className="w-full rounded-xl bg-black"
                style={{
                  aspectRatio: aspect === "9:16" ? "9 / 16" : aspect === "1:1" ? "1 / 1" : "16 / 9",
                  maxHeight: aspect === "9:16" ? 520 : undefined,
                }}
              />
            </div>
            <div className="flex flex-col justify-center gap-3 lg:w-64">
              <div className="text-xs text-muted-foreground">
                {Math.round(result.duration)}s • {formatFileSize(result.file_size)}
              </div>
              <a
                href={`${result.url}?download=1`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" /> Download MP4
              </a>
              <button
                onClick={handleShare}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button
                onClick={() => setResult(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Make another
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-6">
          {/* Upload area */}
          <div
            id="sec-photos"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all scroll-mt-24",
              photos.length
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-secondary/30"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <div className="flex flex-col items-center py-6">
              <ImagePlus className="h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 text-base font-medium">
                {photos.length
                  ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected — click to add more`
                  : "Drop or click to add photos"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPEG / PNG / WebP — up to 60 photos, 25MB each
              </p>
            </div>
          </div>

          {/* Photo timeline */}
          {photos.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Photo order ({photos.length})
                </h2>
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Clear all
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((p, i) => (
                  <div
                    key={p.id}
                    className="group relative overflow-hidden rounded-lg border border-border bg-secondary/40"
                  >
                    <div className="relative aspect-square">
                      <img
                        src={p.previewUrl}
                        alt={`Photo ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        #{i + 1}
                      </div>
                      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            move(p.id, -1);
                          }}
                          disabled={i === 0}
                          className="rounded-md bg-black/70 p-1 text-white hover:bg-black disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            move(p.id, 1);
                          }}
                          disabled={i === photos.length - 1}
                          className="rounded-md bg-black/70 p-1 text-white hover:bg-black disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(p.id);
                          }}
                          className="rounded-md bg-destructive/90 p-1 text-white hover:bg-destructive"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <input
                      value={p.caption}
                      onChange={(e) => setCaption(p.id, e.target.value)}
                      placeholder="Caption (optional)"
                      className="w-full border-t border-border bg-transparent px-2 py-1.5 text-xs placeholder:text-muted-foreground/60 focus:bg-secondary/60 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Style picker */}
          {styleList.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4" /> Visual style
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {styleList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left text-xs transition-all",
                      style === s.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-secondary/40"
                    )}
                  >
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className="mt-0.5 text-muted-foreground">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title + subtitle */}
          <div id="sec-text" className="rounded-2xl border border-border bg-card p-4 space-y-3 scroll-mt-24">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Title slide (optional)</h2>
              <span className="text-[11px] text-muted-foreground">
                Leave blank to skip overlay
              </span>
            </div>

            {/* AI suggest */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Let AI write it for you</span>
              </div>
              <textarea
                value={aiBrief}
                onChange={(e) => setAiBrief(e.target.value)}
                placeholder="Describe the moment — e.g. 'Aarav's first day at school, 2026'"
                rows={2}
                className="w-full rounded-md border border-border bg-card px-2.5 py-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={aiLang}
                  onChange={(e) => setAiLang(e.target.value as typeof aiLang)}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                >
                  <option value="en">English</option>
                  <option value="hinglish">Hinglish</option>
                  <option value="hi">हिन्दी</option>
                </select>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={useVisionCaptions}
                    onChange={(e) => setUseVisionCaptions(e.target.checked)}
                    disabled={photos.length === 0}
                    className="h-3 w-3 accent-primary"
                  />
                  See photos {photos.length === 0 ? "(add photos first)" : `(${photos.length})`}
                </label>
                <button
                  onClick={handleSuggest}
                  disabled={!aiBrief.trim() || aiBusy}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {aiBusy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Suggest
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {useVisionCaptions && photos.length
                  ? "AI will look at each photo to write captions tailored to its contents."
                  : "Generates title, subtitle, end-card line and per-photo captions."}
              </p>
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g., Annual Day 2026)"
              maxLength={60}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Subtitle (e.g., A note for our parents)"
              maxLength={80}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            {/* Title position */}
            <div>
              <label className="mb-1 block text-xs font-medium">Position</label>
              <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
                {(["bottom", "center", "top"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setTitlePosition(p)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
                      titlePosition === p
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Effects */}
          <div id="sec-effects" className="rounded-2xl border border-border bg-card p-4 scroll-mt-24">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> Visual effects
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "vignette", label: "Vignette", desc: "Soft dark corners", state: fxVignette, set: setFxVignette },
                { id: "filmBorders", label: "Film bars", desc: "Cinematic letterbox", state: fxFilmBorders, set: setFxFilmBorders },
                { id: "lightLeak", label: "Light leak", desc: "Warm intro/outro flare", state: fxLightLeak, set: setFxLightLeak },
                { id: "filmGrain", label: "Film grain", desc: "Subtle texture", state: fxFilmGrain, set: setFxFilmGrain },
              ].map((fx) => (
                <button
                  key={fx.id}
                  onClick={() => fx.set(!fx.state)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-xs transition",
                    fx.state
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{fx.label}</span>
                    <span
                      className={cn(
                        "h-3.5 w-6 rounded-full transition",
                        fx.state ? "bg-primary" : "bg-secondary"
                      )}
                    >
                      <span
                        className={cn(
                          "block h-3.5 w-3.5 rounded-full bg-white shadow transition",
                          fx.state ? "translate-x-2.5" : "translate-x-0"
                        )}
                      />
                    </span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">{fx.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* End card */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Heart className="h-4 w-4" /> End card
              </h2>
              <button
                onClick={() => setEndCardEnabled((v) => !v)}
                className={cn(
                  "h-5 w-9 rounded-full transition",
                  endCardEnabled ? "bg-primary" : "bg-secondary"
                )}
                aria-label="Toggle end card"
              >
                <span
                  className={cn(
                    "block h-5 w-5 rounded-full bg-white shadow transition",
                    endCardEnabled ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
            {endCardEnabled && (
              <>
                <input
                  value={endCardTitle}
                  onChange={(e) => setEndCardTitle(e.target.value)}
                  placeholder="Closing line"
                  maxLength={40}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <input
                  value={endCardSubtitle}
                  onChange={(e) => setEndCardSubtitle(e.target.value)}
                  placeholder="Subtitle (optional)"
                  maxLength={60}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  A 3-second outro slide is appended after the last photo.
                </p>
              </>
            )}
          </div>

          {/* Music */}
          <div id="sec-music" className="rounded-2xl border border-border bg-card p-4 scroll-mt-24">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Music2 className="h-4 w-4" /> Background music
            </h2>

            {/* Mode tabs */}
            <div className="mb-3 inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
              {([
                { id: "library" as const, label: "Library" },
                { id: "upload" as const, label: "Upload" },
                { id: "ai" as const, label: "AI Generate" },
                { id: "none" as const, label: "None" },
              ]).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMusicMode(m.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition",
                    musicMode === m.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {musicMode === "upload" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => musicInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs font-medium hover:bg-secondary"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {customMusic ? customMusic.name.slice(0, 32) : "Choose audio file"}
                </button>
                {customMusic && (
                  <button
                    onClick={() => setCustomMusic(null)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={musicInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCustomMusic(f);
                  }}
                />
              </div>
            )}

            {musicMode === "ai" && (
              <div className="space-y-3">
                {!aiConfigured && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning">
                    AI music is not configured. Set <code>SONAUTO_API_KEY</code> in <code>.env.local</code>.
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium">Quick presets</label>
                  <div className="flex flex-wrap gap-1.5">
                    {aiPresets.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setAiPresetId(p.id);
                          setAiPrompt("");
                          setAiPreviewTrackId("");
                          setAiPreviewUrl("");
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition",
                          aiPresetId === p.id && !aiPrompt
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Or describe the music</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => {
                      setAiPrompt(e.target.value);
                      if (e.target.value) setAiPresetId("");
                      setAiPreviewTrackId("");
                      setAiPreviewUrl("");
                    }}
                    placeholder="e.g., a warm acoustic guitar piece with soft piano, nostalgic, family memory"
                    rows={3}
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Generate a preview first, then attach it to your video — or skip the preview and we'll generate during render.
                </p>

                {/* Preview generate / playback */}
                <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateMusicPreview}
                      disabled={
                        !aiConfigured ||
                        aiPreviewBusy ||
                        (!aiPrompt.trim() && !aiPresetId)
                      }
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {aiPreviewBusy ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          {aiPreviewTrackId ? "Regenerate preview" : "Generate preview"}
                        </>
                      )}
                    </button>
                    {aiPreviewTrackId && (
                      <button
                        onClick={() => {
                          setAiPreviewTrackId("");
                          setAiPreviewUrl("");
                          setAiPreviewLabel("");
                        }}
                        className="text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {aiPreviewUrl && (
                    <>
                      <audio controls src={aiPreviewUrl} className="w-full" />
                      <p className="text-[11px] text-muted-foreground">
                        ✓ Will use this track in your video — &ldquo;{aiPreviewLabel}&rdquo;
                      </p>
                    </>
                  )}
                  {aiPreviewBusy && !aiPreviewUrl && (
                    <p className="text-[11px] text-muted-foreground">
                      Sonauto is composing… typically 30–60 seconds.
                    </p>
                  )}
                </div>
              </div>
            )}

            {musicMode === "library" && (
              <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                <button
                  onClick={() => setSelectedTrackId("")}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all",
                    selectedTrackId === ""
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div>
                    <div className="font-medium">No music</div>
                    <div className="text-muted-foreground">Silent video</div>
                  </div>
                </button>
                {tracks.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all",
                      selectedTrackId === t.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <button
                      onClick={() => setSelectedTrackId(t.id)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium">{t.name}</div>
                      <div className="text-muted-foreground">
                        {t.mood} • {t.genre}
                      </div>
                    </button>
                    <button
                      onClick={() => onPreviewTrack(t.id, t.url)}
                      className="ml-2 rounded-md p-1.5 hover:bg-secondary"
                      title="Preview"
                    >
                      <Play
                        className={cn(
                          "h-3.5 w-3.5",
                          previewTrack === t.id && "text-primary"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {musicMode !== "none" && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium">
                  Music volume: {Math.round(musicVolume * 100)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Aspect */}
          <div id="sec-format" className="rounded-2xl border border-border bg-card p-4 scroll-mt-24">
            <h2 className="mb-3 text-sm font-semibold">Format</h2>
            <div className="space-y-2">
              {aspectOptions.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setAspect(o.id as typeof aspect)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all",
                    aspect === o.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <o.icon className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{o.label}</div>
                    <div className="text-xs text-muted-foreground">{o.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pacing */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <h2 className="text-sm font-semibold">Pacing</h2>
            <div>
              <label className="mb-1 flex items-center justify-between text-xs">
                <span>Per-photo duration</span>
                <span className="font-medium">{photoDuration.toFixed(1)}s</span>
              </label>
              <input
                type="range"
                min={2}
                max={6}
                step={0.5}
                value={photoDuration}
                onChange={(e) => setPhotoDuration(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between text-xs">
                <span>Crossfade</span>
                <span className="font-medium">{transitionDuration.toFixed(1)}s</span>
              </label>
              <input
                type="range"
                min={0.4}
                max={1.6}
                step={0.1}
                value={transitionDuration}
                onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs text-muted-foreground">
              Estimated total: <span className="font-medium text-foreground">{Math.round(totalDuration)}s</span>
              {totalDuration > 90 && (
                <span className="ml-1 text-warning">
                  • long videos take longer to render
                </span>
              )}
            </div>
          </div>

          {/* Generate */}
          <div className="sticky top-4 hidden space-y-3 lg:block">
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={rendering || photos.length === 0}
              className="w-full rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
            >
              {rendering ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Crafting your video…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" /> Generate Memory Video
                </span>
              )}
            </button>
            {rendering && (
              <p className="text-center text-xs text-muted-foreground">
                Rendering on the server with FFmpeg — this may take 30–90 seconds.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile fixed bottom bar (Generate + tab nav) */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {error && (
          <div className="mx-3 mb-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive shadow-lg">
            {error}
          </div>
        )}
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl">
          <div className="px-3 pt-2.5">
            <button
              onClick={handleGenerate}
              disabled={rendering || photos.length === 0}
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              {rendering ? (
                <span className="relative flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Crafting your video…
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {photos.length === 0 ? "Add photos to start" : "Generate Memory Video"}
                </span>
              )}
            </button>
          </div>
          <nav className="mt-1.5 flex items-stretch justify-around gap-0.5 px-1 pb-1">
            {[
              { id: "sec-photos", label: "Photos", icon: ImageIcon },
              { id: "sec-style", label: "Style", icon: Palette },
              { id: "sec-text", label: "Text", icon: TypeIcon },
              { id: "sec-effects", label: "Effects", icon: Sparkles },
              { id: "sec-music", label: "Music", icon: Music2 },
              { id: "sec-format", label: "Format", icon: Settings2 },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  document.getElementById(t.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium text-muted-foreground transition active:scale-95 active:bg-secondary"
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
