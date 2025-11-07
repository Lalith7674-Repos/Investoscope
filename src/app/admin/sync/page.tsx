"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Progress = {
  total: number;
  processed: number;
  current: string;
  status: "running" | "completed" | "error";
};

export default function SyncPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const progressIntervalRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Check admin status on mount
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/admin/check");
        const data = await res.json();
        if (data.ok && data.isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.push("/admin/login?callbackUrl=/admin/sync");
        }
      } catch (e) {
        setIsAdmin(false);
        router.push("/admin/login?callbackUrl=/admin/sync");
      }
    }
    checkAdmin();
  }, [router]);

  const jobs = [
    {
      id: "sync-catalogue",
      name: "Sync Catalogue (Stocks, ETFs & Mutual Funds)",
      desc: "Discovers new stocks, ETFs, and mutual funds from NSE & AMFI (takes 5-10 minutes)",
      category: "catalogue",
    },
    {
      id: "sync-prices",
      name: "Update Stock/ETF Prices",
      desc: "Fetches current prices for all stocks/ETFs (takes 5-10 minutes)",
      category: "prices",
    },
    {
      id: "sync-mf-nav",
      name: "Update MF NAVs",
      desc: "Updates latest NAVs for all mutual funds (takes 2-3 minutes)",
      category: "prices",
    },
    {
      id: "run-maintenance",
      name: "Run Full Maintenance",
      desc: "Runs both price sync and catalogue sync (takes 10-15 minutes)",
      category: "maintenance",
    },
    // Legacy jobs (kept for backward compatibility)
    {
      id: "sync-nse-universe",
      name: "Sync NSE Stocks & ETFs (Legacy)",
      desc: "Legacy: Use 'Sync Catalogue' instead (takes 2-5 minutes)",
      category: "legacy",
    },
    {
      id: "sync-mf-universe",
      name: "Sync AMFI Mutual Funds (Legacy)",
      desc: "Legacy: Use 'Sync Catalogue' instead (takes 3-5 minutes)",
      category: "legacy",
    },
  ];

  function getJobDisplayName(jobId: string): string {
    const job = jobs.find(j => j.id === jobId);
    return job?.name || jobId;
  }

  function isRateLimitError(error: string): boolean {
    const lowerError = error.toLowerCase();
    return (
      lowerError.includes("rate limit") ||
      lowerError.includes("too many requests") ||
      lowerError.includes("429") ||
      lowerError.includes("quota exceeded") ||
      lowerError.includes("rate limit exceeded")
    );
  }

  // Poll for progress updates
  function startProgressPolling(job: string) {
    // Clear any existing interval first
    if (progressIntervalRef.current[job]) {
      clearInterval(progressIntervalRef.current[job]);
      delete progressIntervalRef.current[job];
    }

    const jobName = getJobDisplayName(job);
    let completionHandled = false; // Prevent duplicate completion toasts

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/progress/${job}`);
        const data = await res.json();
        
        if (data.ok && data.progress) {
          const currentStatus = data.progress.status;
          
          // Update progress state
          setProgress((prev) => ({ ...prev, [job]: data.progress }));
          
          // IMMEDIATELY stop polling if completed or error
          if (currentStatus === "completed" || currentStatus === "error") {
            // Clear interval immediately
            clearInterval(interval);
            delete progressIntervalRef.current[job];
            
            // Clear loading state
            setLoading((prev) => prev === job ? null : prev);
            
            // Show completion toast only once
            if (!completionHandled) {
              completionHandled = true;
              
              if (currentStatus === "completed") {
                const processed = data.progress.processed || 0;
                const total = data.progress.total || 0;
                toast.success(`✅ ${jobName} Completed!`, {
                  description: total > 0 
                    ? `Processed ${processed.toLocaleString()} of ${total.toLocaleString()} items`
                    : "Job completed successfully",
                  duration: 5000,
                });
              } else if (currentStatus === "error") {
                toast.error(`❌ ${jobName} Failed`, {
                  description: data.progress.error || "Job encountered an error",
                  duration: 6000,
                });
              }
            }
            
            // Exit early - don't continue polling
            return;
          }
        }
      } catch (e) {
        // Ignore polling errors, but log for debugging
        console.error(`Polling error for ${job}:`, e);
      }
    }, 1000); // Poll every second

    progressIntervalRef.current[job] = interval;
    
    // Safety timeout: stop polling after 30 minutes to prevent infinite polling
    setTimeout(() => {
      if (progressIntervalRef.current[job]) {
        clearInterval(progressIntervalRef.current[job]);
        delete progressIntervalRef.current[job];
        setLoading((prev) => prev === job ? null : prev);
        toast.warning(`⏱️ ${jobName} Timeout`, {
          description: "Polling stopped after 30 minutes. Job may still be running.",
          duration: 5000,
        });
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  // Load existing progress on mount (for resume detection)
  useEffect(() => {
    const jobIds = [
      "sync-catalogue",
      "sync-prices", 
      "sync-mf-nav",
      "run-maintenance",
      "sync-nse-universe",
      "sync-mf-universe",
    ];
    jobIds.forEach(async (jobId) => {
      try {
        const res = await fetch(`/api/admin/progress/${jobId}`);
        const data = await res.json();
        if (data.ok && data.progress && data.progress.processed > 0) {
          setProgress((prev) => ({ ...prev, [jobId]: data.progress }));
        }
      } catch (e) {
        // Ignore
      }
    });
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(progressIntervalRef.current).forEach(interval => clearInterval(interval));
    };
  }, []);

  async function runSync(job: string) {
    setLoading(job);
    const jobName = getJobDisplayName(job);
    
    // Start polling for progress immediately
    startProgressPolling(job);
    
    try {
      const res = await fetch(`/api/admin/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job }),
      });
      const data = await res.json();
      
      // Check for rate limit from HTTP status
      const isRateLimitStatus = res.status === 429;
      
      // Don't stop polling here - the job runs in the background
      // Polling will stop automatically when status becomes "completed" or "error"
      
      if (data.ok) {
        // Job was triggered successfully - it's running in the background
        // Don't clear loading yet - let polling handle it when job completes
        toast.info(`🚀 ${jobName} Started`, {
          description: "Job is running in the background. Check progress below.",
          duration: 3000,
        });
        setResults((prev) => ({ ...prev, [job]: data }));
        
        // Initialize progress state to show "Starting..." immediately
        setProgress((prev) => ({
          ...prev,
          [job]: {
            jobId: job,
            total: 0,
            processed: 0,
            current: "Starting job...",
            status: "running" as const,
          },
        }));
        
        // Note: Progress updates will come through polling
        // Completion will be handled by polling when status becomes "completed"
      } else {
        // Job failed to start - stop polling and clear loading
        if (progressIntervalRef.current[job]) {
          clearInterval(progressIntervalRef.current[job]);
          delete progressIntervalRef.current[job];
        }
        setLoading(null);
        
        const errorMsg = data.error || "Unknown error";
        const isRateLimit = isRateLimitStatus || isRateLimitError(errorMsg);
        
        if (isRateLimit) {
          toast.error(`⚠️ Rate Limit Error - ${jobName}`, {
            description: "API rate limit exceeded. Please wait a few minutes and try again.",
            duration: 8000,
            action: {
              label: "Retry in 5min",
              onClick: () => {
                setTimeout(() => runSync(job), 5 * 60 * 1000);
                toast.info("Retry scheduled in 5 minutes");
              },
            },
          });
        } else {
          toast.error(`❌ ${jobName} Failed to Start`, {
            description: errorMsg,
            duration: 6000,
          });
        }
        setResults((prev) => ({ ...prev, [job]: { ...data, error: errorMsg } }));
        setProgress((prev) => ({ ...prev, [job]: { ...prev[job], status: "error", error: errorMsg } }));
      }
    } catch (e: any) {
      // Network error - stop polling and clear loading
      if (progressIntervalRef.current[job]) {
        clearInterval(progressIntervalRef.current[job]);
        delete progressIntervalRef.current[job];
      }
      setLoading(null);
      
      const errorMsg = e.message || "Network error";
      
      if (isRateLimitError(errorMsg)) {
        toast.error(`⚠️ Rate Limit Error - ${jobName}`, {
          description: "API rate limit exceeded. Please wait a few minutes and try again.",
          duration: 8000,
        });
      } else {
        toast.error(`❌ ${jobName} Error`, {
          description: errorMsg,
          duration: 6000,
        });
      }
      setProgress((prev) => ({ ...prev, [job]: { ...prev[job], status: "error", error: errorMsg } }));
    }
    // Note: Don't clear loading in finally - let polling handle it when job completes
  }

  const [duplicateInfo, setDuplicateInfo] = useState<{ duplicates: number; totalDuplicateItems: number } | null>(null);

  // Check for duplicates on mount
  useEffect(() => {
    checkDuplicates();
  }, []);

  async function checkDuplicates() {
    try {
      const res = await fetch("/api/admin/duplicates");
      const data = await res.json();
      if (data.ok) {
        setDuplicateInfo({
          duplicates: data.duplicates,
          totalDuplicateItems: data.totalDuplicateItems,
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  async function cleanDuplicates() {
    if (!confirm(`This will deactivate ${duplicateInfo?.totalDuplicateItems || 0} duplicate items. Continue?`)) {
      return;
    }
    setLoading("clean-duplicates");
    try {
      const res = await fetch(`/api/admin/duplicates`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Duplicates cleaned!", {
          description: `Deactivated ${data.cleaned} duplicate items`,
        });
        setDuplicateInfo(null);
        await checkDuplicates(); // Refresh count
      } else {
        toast.error(`Clean failed: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`Clean error: ${e.message}`);
    } finally {
      setLoading(null);
    }
  }

  async function clearDB() {
    if (!confirm("Are you sure? This will delete ALL data (including real data if you have any).")) {
      return;
    }
    setLoading("clear-db");
    try {
      const res = await fetch(`/api/admin/clear-db`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Database cleared!", {
          description: "Now run sync jobs to get real data",
        });
        setDuplicateInfo(null);
      } else {
        toast.error(`Clear failed: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`Clear error: ${e.message}`);
    } finally {
      setLoading(null);
    }
  }

  // Show loading while checking admin status
  if (isAdmin === null) {
    return (
      <div className="space-y-8">
        <div className="card p-8 text-center">
          <p className="text-slate-400">Checking admin access...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized if not admin
  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-50 mb-2">Data Sync Dashboard</h1>
        <p className="text-slate-300 mb-2">
          Run sync jobs manually or let automated cron jobs handle it. Both work independently.
        </p>
        <p className="text-sm text-slate-400">
          <strong>Automated:</strong> Runs daily via cron (see vercel.json) • <strong>Manual:</strong> Click "Run Sync" anytime
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        {/* Duplicate Detection */}
        {duplicateInfo && duplicateInfo.duplicates > 0 && (
          <div className="card p-6 border-amber-500/30 bg-amber-500/10">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">⚠️ Duplicate Data Detected</h3>
            <p className="text-sm text-slate-300 mb-4">
              Found <strong>{duplicateInfo.duplicates}</strong> duplicate groups with <strong>{duplicateInfo.totalDuplicateItems}</strong> duplicate items.
              These duplicates can cause inconsistent counts and waste database space.
            </p>
            <button
              onClick={cleanDuplicates}
              disabled={loading === "clean-duplicates" || !!loading}
              className="btn-outline border-amber-500/50 text-amber-400 hover:bg-amber-500/10 w-full"
            >
              {loading === "clean-duplicates" ? "Cleaning..." : `Clean ${duplicateInfo.totalDuplicateItems} Duplicates`}
            </button>
          </div>
        )}

        <div className="card p-6 border-red-500/30 bg-red-500/10">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">⚠️ Clear Dummy Data First</h3>
          <p className="text-sm text-slate-300 mb-4">
            If you're seeing dummy/seed data, clear it first before running sync jobs.
          </p>
          <button
            onClick={clearDB}
            disabled={loading === "clear-db" || !!loading}
            className="btn-outline border-red-500/50 text-red-400 hover:bg-red-500/10 w-full"
          >
            {loading === "clear-db" ? "Clearing..." : "Clear All Data"}
          </button>
        </div>
      </div>

      {/* Group jobs by category */}
      <div className="space-y-6">
        {/* Primary Jobs */}
        <div>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Primary Jobs</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {jobs.filter(j => j.category !== "legacy").map((job) => (
              <div key={job.id} className="card p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-100 mb-1">{job.name}</h3>
                  <p className="text-sm text-slate-400">{job.desc}</p>
                </div>
                <div className="relative group">
                  <button
                    onClick={() => runSync(job.id)}
                    disabled={(loading === job.id || (progress[job.id] && progress[job.id].status === "running")) || (!!loading && loading !== job.id)}
                    className="btn-primary w-full"
                    title={
                      progress[job.id] && 
                      progress[job.id].processed && 
                      progress[job.id].total &&
                      progress[job.id].processed > 0 && 
                      progress[job.id].processed < progress[job.id].total &&
                      progress[job.id].status !== "completed"
                        ? `Resume from ${progress[job.id].processed} / ${progress[job.id].total}`
                        : "Run sync job"
                    }
                  >
                    {loading === job.id || (progress[job.id] && progress[job.id].status === "running")
                      ? "Running..." 
                      : progress[job.id] && 
                        progress[job.id].processed && 
                        progress[job.id].total &&
                        progress[job.id].processed > 0 && 
                        progress[job.id].processed < progress[job.id].total &&
                        progress[job.id].status !== "completed"
                      ? `Resume (${progress[job.id].processed}/${progress[job.id].total})`
                      : "Run Sync"}
                  </button>
                  {progress[job.id] && 
                   progress[job.id].processed && 
                   progress[job.id].total &&
                   progress[job.id].processed > 0 && 
                   progress[job.id].processed < progress[job.id].total &&
                   progress[job.id].status !== "completed" && 
                   !loading && (
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-slate-900/95 border border-slate-600/50 rounded-lg p-2 text-xs text-slate-200 z-10 whitespace-nowrap backdrop-blur-sm">
                      Resume from {progress[job.id].processed.toLocaleString()} / {progress[job.id].total.toLocaleString()}
                      <br />
                      <span className="text-slate-400">Will skip already updated items</span>
                    </div>
                  )}
                </div>
                
                {/* Progress indicator - show when loading OR when job is running (but NOT when completed/error) */}
                {(loading === job.id || (progress[job.id] && progress[job.id].status === "running")) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">
                        {(progress[job.id]?.processed ?? 0).toLocaleString()} / {(progress[job.id]?.total ?? 0).toLocaleString()}
                      </span>
                      <span className="text-slate-400">
                        {progress[job.id]?.total && progress[job.id].total > 0 
                          ? Math.round(((progress[job.id].processed ?? 0) / progress[job.id].total) * 100)
                          : progress[job.id]?.status === "running" ? "—" : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all duration-300"
                        style={{
                          width: progress[job.id]?.total && progress[job.id].total > 0
                            ? `${((progress[job.id].processed ?? 0) / progress[job.id].total) * 100}%`
                            : progress[job.id]?.status === "running" ? "10%" : "0%",
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {progress[job.id]?.current || (loading === job.id ? "Starting job..." : "Waiting for progress...")}
                    </p>
                  </div>
                )}
                
                {/* Show completion message briefly */}
                {progress[job.id] && progress[job.id].status === "completed" && !loading && (
                  <div className="text-xs text-green-400 p-2 bg-green-500/10 rounded border border-green-500/30">
                    ✓ Completed: {progress[job.id].processed.toLocaleString()} / {progress[job.id].total.toLocaleString()} items
                  </div>
                )}
                
                {/* Show error message */}
                {progress[job.id] && progress[job.id].status === "error" && !loading && (
                  <div className="text-xs text-red-400 p-2 bg-red-500/10 rounded border border-red-500/30">
                    ✗ Failed: {(progress[job.id] as any).error || "Unknown error"}
                  </div>
                )}
                
                {results[job.id] && !loading && progress[job.id]?.status !== "running" && (
                  <div className="text-xs text-slate-400 p-2 bg-slate-800/40 rounded border border-slate-700/50">
                    {JSON.stringify(results[job.id], null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legacy Jobs (collapsed by default) */}
        {jobs.filter(j => j.category === "legacy").length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-400 mb-4">Legacy Jobs (Deprecated)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {jobs.filter(j => j.category === "legacy").map((job) => (
                <div key={job.id} className="card p-6 space-y-4 opacity-60">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-100 mb-1">{job.name}</h3>
                    <p className="text-sm text-slate-400">{job.desc}</p>
                  </div>
                  <div className="relative group">
                    <button
                      onClick={() => runSync(job.id)}
                      disabled={loading === job.id || !!loading}
                      className="btn-primary w-full"
                    >
                      {loading === job.id ? "Running..." : "Run Sync"}
                    </button>
                  </div>
                  
                  {(loading === job.id || (progress[job.id] && progress[job.id].status === "running")) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">
                          {(progress[job.id]?.processed ?? 0).toLocaleString()} / {(progress[job.id]?.total ?? 0).toLocaleString()}
                        </span>
                        <span className="text-slate-400">
                          {progress[job.id]?.total && progress[job.id].total > 0 
                            ? Math.round(((progress[job.id].processed ?? 0) / progress[job.id].total) * 100)
                            : progress[job.id]?.status === "running" ? "—" : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all duration-300"
                          style={{
                            width: progress[job.id]?.total && progress[job.id].total > 0
                              ? `${((progress[job.id].processed ?? 0) / progress[job.id].total) * 100}%`
                              : progress[job.id]?.status === "running" ? "10%" : "0%",
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {progress[job.id]?.current || (loading === job.id ? "Starting job..." : "Waiting for progress...")}
                      </p>
                    </div>
                  )}
                  
                  {/* Show completion message for legacy jobs */}
                  {progress[job.id] && progress[job.id].status === "completed" && !loading && (
                    <div className="text-xs text-green-400 p-2 bg-green-500/10 rounded border border-green-500/30">
                      ✓ Completed: {progress[job.id].processed.toLocaleString()} / {progress[job.id].total.toLocaleString()} items
                    </div>
                  )}
                  
                  {/* Show error message for legacy jobs */}
                  {progress[job.id] && progress[job.id].status === "error" && !loading && (
                    <div className="text-xs text-red-400 p-2 bg-red-500/10 rounded border border-red-500/30">
                      ✗ Failed: {(progress[job.id] as any).error || "Unknown error"}
                    </div>
                  )}
                  
                  {results[job.id] && !loading && progress[job.id]?.status !== "running" && (
                    <div className="text-xs text-slate-400 p-2 bg-slate-800/40 rounded border border-slate-700/50">
                      {JSON.stringify(results[job.id], null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6 border-amber-500/30 bg-amber-500/10">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">⚠️ Important</h3>
        <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
          <li>Make sure <code className="bg-white/10 px-1 rounded">CRON_SECRET</code> is set in <code className="bg-white/10 px-1 rounded">.env.local</code></li>
          <li>Sync jobs take time - be patient (especially NSE sync can take 5+ minutes)</li>
          <li><strong>Recommended order:</strong> Sync Catalogue → Update Prices → Update NAVs (or use "Run Full Maintenance" for all)</li>
          <li><strong>Automated cron jobs:</strong> Run daily at 3 AM (prices) and weekly Monday 2 AM (catalogue)</li>
          <li>Check <a href="/api/debug/counts" className="text-blue-400 underline">/api/debug/counts</a> to verify data</li>
        </ul>
      </div>
    </div>
  );
}

