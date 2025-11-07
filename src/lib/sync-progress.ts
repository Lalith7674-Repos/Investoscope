// Simple in-memory progress store
// In production, use Redis or a database for multi-instance deployments

export type Progress = {
  jobId: string;
  total: number;
  processed: number;
  current: string;
  status: "running" | "completed" | "error";
  error?: string;
};

const progressStore = new Map<string, Progress>();

export function setProgress(jobId: string, progress: Partial<Progress>) {
  const existing = progressStore.get(jobId) || {
    jobId,
    total: 0,
    processed: 0,
    current: "",
    status: "running" as const,
  };
  
  progressStore.set(jobId, {
    ...existing,
    ...progress,
  });
}

export function getProgress(jobId: string): Progress | null {
  return progressStore.get(jobId) || null;
}

export function clearProgress(jobId: string) {
  progressStore.delete(jobId);
}

// Note: Progress is cleared manually or on new job start
// For production, implement proper TTL with Redis or database

