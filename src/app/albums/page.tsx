"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Plus,
  Loader2,
  Calendar,
  Film,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Album {
  id: string;
  name: string;
  event_type: string;
  event_date: string | null;
  created_at: string;
  projects?: { id: string; title: string; status: string }[];
}

const eventTypes = [
  { id: "annual_day", label: "Annual Day" },
  { id: "sports_day", label: "Sports Day" },
  { id: "farewell", label: "Farewell" },
  { id: "cultural_program", label: "Cultural Program" },
  { id: "republic_independence", label: "Republic/Independence Day" },
  { id: "teachers_day", label: "Teachers Day" },
  { id: "science_fair", label: "Science Fair" },
  { id: "corporate_event", label: "Corporate Event" },
  { id: "wedding", label: "Wedding" },
  { id: "other", label: "Other" },
];

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEventType, setNewEventType] = useState("");
  const [newEventDate, setNewEventDate] = useState("");

  useEffect(() => {
    fetchAlbums();
  }, []);

  async function fetchAlbums() {
    try {
      const res = await fetch("/api/albums");
      if (res.ok) {
        const data = await res.json();
        setAlbums(data.albums || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          event_type: newEventType || undefined,
          event_date: newEventDate || undefined,
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewEventType("");
        setNewEventDate("");
        setShowCreate(false);
        fetchAlbums();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(albumId: string) {
    if (!confirm("Delete this album?")) return;
    try {
      await fetch(`/api/albums/${albumId}`, { method: "DELETE" });
      setAlbums(albums.filter((a) => a.id !== albumId));
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between lg:mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Albums</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Organize your event videos into albums
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Album
        </button>
      </div>

      {/* Create Album Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Album</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Album Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Annual Day 2026" className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Event Type</label>
                <select value={newEventType} onChange={(e) => setNewEventType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Select type</option>
                  {eventTypes.map((evt) => (
                    <option key={evt.id} value={evt.id}>{evt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Event Date</label>
                <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button onClick={handleCreate} disabled={creating || !newName.trim()}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {creating ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating...</span> : "Create Album"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Albums Grid */}
      {albums.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No albums yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first album to organize event videos</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Create Album
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <div key={album.id} className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30">
              <div className="flex items-start justify-between">
                <Link href={`/albums/${album.id}`} className="flex-1">
                  <h3 className="text-base font-semibold group-hover:text-primary">{album.name}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {album.event_type && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                        {eventTypes.find((e) => e.id === album.event_type)?.label || album.event_type}
                      </span>
                    )}
                    {album.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(album.event_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Film className="h-3 w-3" />
                    {album.projects?.length || 0} videos
                  </div>
                </Link>
                <button onClick={() => handleDelete(album.id)}
                  className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
