// In-memory job index for memory-video renders.
// Lives for the lifetime of the Node process; rendered files persist on disk.

export type JobStatus = "queued" | "rendering" | "completed" | "failed";

export interface JobRecord {
  id: string;
  status: JobStatus;
  outputPath?: string;
  duration?: number;
  error?: string;
  createdAt: number;
  completedAt?: number;
  title?: string;
}

const G = globalThis as unknown as { __memoryVideoJobs?: Map<string, JobRecord> };
const jobs: Map<string, JobRecord> = G.__memoryVideoJobs || new Map();
G.__memoryVideoJobs = jobs;

export function getJob(id: string): JobRecord | undefined {
  return jobs.get(id);
}

export function setJob(rec: JobRecord): void {
  jobs.set(rec.id, rec);
}

export function listJobs(limit = 50): JobRecord[] {
  return Array.from(jobs.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
