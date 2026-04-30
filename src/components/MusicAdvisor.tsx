"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Music,
  Sparkles,
  Loader2,
  ExternalLink,
  ThumbsUp,
  RefreshCw,
} from "lucide-react";

interface Suggestion {
  name: string;
  artist: string;
  reason: string;
  mood: string;
  genre: string;
}

interface MusicSuggestionsResponse {
  suggestions: Suggestion[];
  detected_event_type: string;
  overall_mood: string;
  reasoning: string;
}

interface MusicAdvisorProps {
  projectId: string;
}

export default function MusicAdvisor({ projectId }: MusicAdvisorProps) {
  const [data, setData] = useState<MusicSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/music-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      const json: MusicSuggestionsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Analyzing your video and finding the perfect music…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Music className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={fetchSuggestions}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-400">
        <Music className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          AI suggests songs based on your video content. You need to upload your
          own licensed music files.
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">Music Suggestions</h3>
        </div>
        <button
          onClick={() => {
            setSelectedIndex(null);
            fetchSuggestions();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Mood & Event */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Mood: {data.overall_mood}
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Event: {data.detected_event_type.replace(/_/g, " ")}
        </span>
      </div>

      {/* AI reasoning */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {data.reasoning}
      </p>

      {/* Suggestions list */}
      <div className="space-y-2">
        {data.suggestions.map((song, i) => {
          const isSelected = selectedIndex === i;
          const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
            `${song.name} ${song.artist}`
          )}`;

          return (
            <div
              key={i}
              className={cn(
                "rounded-lg bg-secondary/50 p-3 transition-colors",
                isSelected && "ring-2 ring-primary bg-primary/5"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-bold truncate">{song.name}</p>
                  <p className="text-xs text-muted-foreground">{song.artist}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {song.reason}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {song.mood}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {song.genre}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => setSelectedIndex(isSelected ? null : i)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    {isSelected ? "Selected" : "Select"}
                  </button>
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    YouTube
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
