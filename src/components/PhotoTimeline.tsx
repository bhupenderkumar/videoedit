"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ImagePlus, X, GripVertical, Loader2, Upload, Clock } from "lucide-react";

interface Photo {
  id: string;
  file_path: string;
  sort_order: number;
  duration: number;
  animation: string;
}

interface PhotoTimelineProps {
  projectId: string;
}

export default function PhotoTimeline({ projectId }: PhotoTimelineProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPhotos();
  }, [projectId]);

  async function fetchPhotos() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/photos`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch photos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("photos", file));

      const res = await fetch(`/api/projects/${projectId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchPhotos();
      }
    } catch (err) {
      console.error("Failed to upload photos:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(photoId: string) {
    setDeletingId(photoId);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      }
    } catch (err) {
      console.error("Failed to delete photo:", err);
    } finally {
      setDeletingId(null);
    }
  }

  const totalDuration = photos.reduce((sum, p) => sum + (p.duration || 5), 0);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading photos…</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImagePlus className="h-4 w-4" />
          <span>
            {photos.length} photo{photos.length !== 1 && "s"}
          </span>
          {photos.length > 0 && (
            <>
              <span className="text-border">·</span>
              <Clock className="h-3.5 w-3.5" />
              <span>{totalDuration}s total</span>
            </>
          )}
        </div>

        <label
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            uploading && "opacity-50 pointer-events-none"
          )}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? "Uploading…" : "Add Photos"}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Timeline strip */}
      {photos.length === 0 ? (
        <label className="border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col items-center gap-2 text-muted-foreground">
          <ImagePlus className="h-8 w-8" />
          <span className="text-sm">Click to add photos to your slideshow</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="rounded-lg border border-border bg-secondary/50 p-2 relative flex-shrink-0 w-28 group"
            >
              {/* Drag handle */}
              <div className="absolute top-1 left-1 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                <GripVertical className="h-3.5 w-3.5" />
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deletingId === photo.id}
                className="absolute top-1 right-1 rounded-full bg-destructive/80 hover:bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                {deletingId === photo.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>

              {/* Thumbnail */}
              <div className="w-full aspect-video rounded bg-muted flex items-center justify-center overflow-hidden">
                <img
                  src={photo.file_path}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>

              {/* Duration badge */}
              <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                <span>{photo.duration || 5}s</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
