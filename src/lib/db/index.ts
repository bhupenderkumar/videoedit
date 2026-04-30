import path from "path";
import fs from "fs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const IS_VERCEL = !!process.env.VERCEL;

// ── Types ───────────────────────────────────────────────────────────────────

export type ProjectRow = {
  id: string;
  profile_id: string | null;
  title: string;
  status: string;
  original_path: string;
  output_path: string | null;
  target_platform: string;
  target_duration: number;
  transcript: string | null;
  frame_analysis: string | null;
  edit_plan: string | null;
  duration: number | null;
  resolution: string | null;
  file_size: number | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  event_type: string | null;
  audio_settings: string | null;
  music_track_id: string | null;
  custom_music_path: string | null;
  album_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  business_name: string;
  industry: string;
  brand_description: string;
  target_audience: string;
  brand_tone: string;
  preferred_platforms: string;
  school_name: string | null;
  school_motto: string | null;
  school_logo_url: string | null;
  school_colors: string | null;
  school_type: string | null;
  established_year: string | null;
  created_at: string;
  updated_at: string;
};

// ── Supabase client (Vercel) ────────────────────────────────────────────────

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are required on Vercel");
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ── SQLite (local only) ─────────────────────────────────────────────────────

let _sqliteDb: any = null;

function getSqliteDb() {
  if (!_sqliteDb) {
    const Database = require("better-sqlite3");
    const DATA_DIR = process.env.DATA_DIR || "./data";
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const dbPath = path.join(DATA_DIR, "videoedit.db");
    _sqliteDb = new Database(dbPath);
    _sqliteDb.pragma("journal_mode = WAL");
    _sqliteDb.pragma("foreign_keys = ON");
    _sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS business_profiles (
        id TEXT PRIMARY KEY, business_name TEXT NOT NULL, industry TEXT DEFAULT '',
        brand_description TEXT DEFAULT '', target_audience TEXT DEFAULT '',
        brand_tone TEXT DEFAULT 'professional', preferred_platforms TEXT DEFAULT '["instagram_reels"]',
        school_name TEXT, school_motto TEXT, school_logo_url TEXT,
        school_colors TEXT, school_type TEXT, established_year INTEGER,
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, profile_id TEXT REFERENCES business_profiles(id),
        title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'uploaded',
        original_path TEXT NOT NULL, output_path TEXT,
        target_platform TEXT DEFAULT 'instagram_reels', target_duration INTEGER DEFAULT 30,
        transcript TEXT, frame_analysis TEXT, edit_plan TEXT,
        duration REAL, resolution TEXT, file_size INTEGER,
        event_type TEXT, audio_settings TEXT, music_track_id TEXT,
        custom_music_path TEXT, album_id TEXT,
        processing_started_at TEXT, processing_completed_at TEXT, error_message TEXT,
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS albums (
        id TEXT PRIMARY KEY,
        profile_id TEXT REFERENCES business_profiles(id),
        name TEXT NOT NULL,
        event_type TEXT DEFAULT 'general',
        event_date TEXT,
        shared_config TEXT,
        status TEXT DEFAULT 'draft',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS album_projects (
        album_id TEXT REFERENCES albums(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        sort_order INTEGER DEFAULT 0,
        PRIMARY KEY (album_id, project_id)
      );
      CREATE TABLE IF NOT EXISTS project_photos (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        duration REAL DEFAULT 5,
        animation TEXT DEFAULT 'ken_burns',
        caption TEXT,
        enhanced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS music_suggestions (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        suggestions TEXT NOT NULL,
        reasoning TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    const count = _sqliteDb.prepare("SELECT COUNT(*) as cnt FROM business_profiles").get() as { cnt: number };
    if (count.cnt === 0) {
      _sqliteDb.prepare(
        "INSERT INTO business_profiles (id, business_name, industry, brand_description, target_audience, brand_tone) VALUES (?, ?, ?, ?, ?, ?)"
      ).run("default", "My Business", "general", "We are a small business passionate about what we do.", "Local customers", "professional");
    }
  }
  return _sqliteDb;
}

// ── Unified DB Interface ────────────────────────────────────────────────────

export const db = {
  // Profile
  async getProfile(id: string = "default"): Promise<ProfileRow | undefined> {
    if (IS_VERCEL) {
      const { data } = await getSupabase().from("business_profiles").select("*").eq("id", id).single();
      return data ?? undefined;
    }
    return getSqliteDb().prepare("SELECT * FROM business_profiles WHERE id = ?").get(id) as ProfileRow | undefined;
  },

  async updateProfile(id: string, data: Partial<ProfileRow>): Promise<ProfileRow | undefined> {
    if (IS_VERCEL) {
      const { data: updated } = await getSupabase()
        .from("business_profiles")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      return updated ?? undefined;
    }
    getSqliteDb().prepare(
      `UPDATE business_profiles SET business_name=?, industry=?, brand_description=?, target_audience=?, brand_tone=?, preferred_platforms=?, updated_at=datetime('now') WHERE id=?`
    ).run(data.business_name || "My Business", data.industry || "", data.brand_description || "", data.target_audience || "", data.brand_tone || "professional", data.preferred_platforms || '["instagram_reels"]', id);
    return getSqliteDb().prepare("SELECT * FROM business_profiles WHERE id = ?").get(id) as ProfileRow;
  },

  // Projects
  async createProject(project: Omit<ProjectRow, "created_at" | "updated_at" | "transcript" | "frame_analysis" | "edit_plan" | "duration" | "resolution" | "processing_started_at" | "processing_completed_at" | "error_message" | "event_type" | "audio_settings" | "music_track_id" | "custom_music_path" | "album_id"> & Partial<Pick<ProjectRow, "event_type" | "audio_settings" | "music_track_id" | "custom_music_path" | "album_id">>) {
    if (IS_VERCEL) {
      await getSupabase().from("projects").insert({
        id: project.id,
        profile_id: project.profile_id,
        title: project.title,
        status: project.status,
        original_path: project.original_path,
        target_platform: project.target_platform,
        target_duration: project.target_duration,
        file_size: project.file_size,
      });
      return;
    }
    getSqliteDb().prepare(
      `INSERT INTO projects (id, profile_id, title, status, original_path, target_platform, target_duration, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(project.id, project.profile_id, project.title, project.status, project.original_path, project.target_platform, project.target_duration, project.file_size);
  },

  async getProject(id: string): Promise<ProjectRow | undefined> {
    if (IS_VERCEL) {
      const { data } = await getSupabase().from("projects").select("*").eq("id", id).single();
      return data ?? undefined;
    }
    return getSqliteDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  },

  async listProjects(): Promise<ProjectRow[]> {
    if (IS_VERCEL) {
      const { data } = await getSupabase()
        .from("projects")
        .select("id, title, status, target_platform, target_duration, duration, resolution, file_size, output_path, error_message, created_at, updated_at")
        .order("created_at", { ascending: false });
      return (data ?? []) as ProjectRow[];
    }
    return getSqliteDb().prepare(
      "SELECT id, title, status, target_platform, target_duration, duration, resolution, file_size, output_path, error_message, created_at, updated_at FROM projects ORDER BY created_at DESC"
    ).all() as ProjectRow[];
  },

  async updateProject(id: string, data: Partial<ProjectRow>) {
    if (IS_VERCEL) {
      await getSupabase()
        .from("projects")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      return;
    }
    const sets = Object.entries(data).map(([k]) => `${k} = ?`).join(", ");
    const vals = Object.values(data);
    getSqliteDb().prepare(`UPDATE projects SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...vals, id);
  },

  async deleteProject(id: string) {
    if (IS_VERCEL) {
      await getSupabase().from("projects").delete().eq("id", id);
      return;
    }
    getSqliteDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
  },

  // ── Albums ──────────────────────────────────────────────────────────────

  async createAlbum(album: { id: string; profile_id: string; name: string; event_type: string; event_date?: string; shared_config?: string }) {
    if (IS_VERCEL) {
      await getSupabase().from("albums").insert(album);
      return;
    }
    getSqliteDb().prepare(
      "INSERT INTO albums (id, profile_id, name, event_type, event_date, shared_config) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(album.id, album.profile_id, album.name, album.event_type, album.event_date || null, album.shared_config || null);
  },

  async getAlbum(id: string) {
    if (IS_VERCEL) {
      const { data } = await getSupabase().from("albums").select("*").eq("id", id).single();
      return data ?? undefined;
    }
    return getSqliteDb().prepare("SELECT * FROM albums WHERE id = ?").get(id);
  },

  async listAlbums() {
    if (IS_VERCEL) {
      const { data } = await getSupabase().from("albums").select("*").order("created_at", { ascending: false });
      return data ?? [];
    }
    return getSqliteDb().prepare("SELECT * FROM albums ORDER BY created_at DESC").all();
  },

  async updateAlbum(id: string, data: Record<string, unknown>) {
    if (IS_VERCEL) {
      await getSupabase().from("albums").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
      return;
    }
    const sets = Object.entries(data).map(([k]) => `${k} = ?`).join(", ");
    const vals = Object.values(data);
    getSqliteDb().prepare(`UPDATE albums SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...vals, id);
  },

  async deleteAlbum(id: string) {
    if (IS_VERCEL) {
      await getSupabase().from("albums").delete().eq("id", id);
      return;
    }
    getSqliteDb().prepare("DELETE FROM albums WHERE id = ?").run(id);
  },

  async addProjectToAlbum(albumId: string, projectId: string, sortOrder: number = 0) {
    if (IS_VERCEL) {
      await getSupabase().from("album_projects").insert({ album_id: albumId, project_id: projectId, sort_order: sortOrder });
      return;
    }
    getSqliteDb().prepare("INSERT OR REPLACE INTO album_projects (album_id, project_id, sort_order) VALUES (?, ?, ?)").run(albumId, projectId, sortOrder);
  },

  async getAlbumProjects(albumId: string) {
    if (IS_VERCEL) {
      const { data } = await getSupabase()
        .from("album_projects")
        .select("project_id, sort_order")
        .eq("album_id", albumId)
        .order("sort_order", { ascending: true });
      return data ?? [];
    }
    return getSqliteDb().prepare("SELECT project_id, sort_order FROM album_projects WHERE album_id = ? ORDER BY sort_order").all(albumId);
  },

  // ── Project Photos ──────────────────────────────────────────────────────

  async addPhoto(photo: { id: string; project_id: string; file_path: string; sort_order: number; duration?: number; animation?: string; caption?: string }) {
    if (IS_VERCEL) {
      await getSupabase().from("project_photos").insert(photo);
      return;
    }
    getSqliteDb().prepare(
      "INSERT INTO project_photos (id, project_id, file_path, sort_order, duration, animation, caption) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(photo.id, photo.project_id, photo.file_path, photo.sort_order, photo.duration || 5, photo.animation || "ken_burns", photo.caption || null);
  },

  async getProjectPhotos(projectId: string) {
    if (IS_VERCEL) {
      const { data } = await getSupabase()
        .from("project_photos")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      return data ?? [];
    }
    return getSqliteDb().prepare("SELECT * FROM project_photos WHERE project_id = ? ORDER BY sort_order").all(projectId);
  },

  async deletePhoto(id: string) {
    if (IS_VERCEL) {
      await getSupabase().from("project_photos").delete().eq("id", id);
      return;
    }
    getSqliteDb().prepare("DELETE FROM project_photos WHERE id = ?").run(id);
  },

  async updatePhotoOrder(photos: { id: string; sort_order: number }[]) {
    if (IS_VERCEL) {
      for (const p of photos) {
        await getSupabase().from("project_photos").update({ sort_order: p.sort_order }).eq("id", p.id);
      }
      return;
    }
    const stmt = getSqliteDb().prepare("UPDATE project_photos SET sort_order = ? WHERE id = ?");
    for (const p of photos) {
      stmt.run(p.sort_order, p.id);
    }
  },

  // ── Music Suggestions ───────────────────────────────────────────────────

  async saveMusicSuggestion(data: { id: string; project_id: string; suggestions: string; reasoning: string }) {
    if (IS_VERCEL) {
      await getSupabase().from("music_suggestions").insert(data);
      return;
    }
    getSqliteDb().prepare(
      "INSERT INTO music_suggestions (id, project_id, suggestions, reasoning) VALUES (?, ?, ?, ?)"
    ).run(data.id, data.project_id, data.suggestions, data.reasoning);
  },
};

// Legacy support
export function getDb() {
  if (IS_VERCEL) {
    throw new Error("SQLite not available on Vercel — use db.* methods instead");
  }
  return getSqliteDb();
}
