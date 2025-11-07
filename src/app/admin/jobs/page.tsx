'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, RefreshCw, AlertTriangle, PlayCircle, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

type SyncLog = {
  id: string;
  jobId: string;
  status: 'running' | 'completed' | 'error';
  startedAt: string;
  finishedAt?: string | null;
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  details?: any;
};

type Summary = {
  total: number;
  byStatus: Record<string, number>;
  byJob: Record<string, number>;
};

const JOB_DEFINITIONS = [
  { id: 'sync-prices', label: 'Sync Prices' },
  { id: 'sync-catalogue', label: 'Sync Catalogue' },
  { id: 'sync-mf-nav', label: 'Sync MF NAVs' },
  { id: 'run-maintenance', label: 'Run Maintenance' },
];

const STATUS_DEFINITIONS: Record<string, { label: string; icon: JSX.Element; className: string }> = {
  running: {
    label: 'Running',
    icon: <PlayCircle className="h-4 w-4" />,
    className: 'text-amber-400 bg-amber-500/10 border border-amber-500/30',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle className="h-4 w-4" />,
    className: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30',
  },
  error: {
    label: 'Error',
    icon: <XCircle className="h-4 w-4" />,
    className: 'text-rose-400 bg-rose-500/10 border border-rose-500/30',
  },
};

export default function AdminJobsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, byStatus: {}, byJob: {} });
  const [jobFilter, setJobFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/admin/check');
        const data = await res.json();
        if (data.ok && data.isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.push('/admin/login?callbackUrl=/admin/jobs');
        }
      } catch (error) {
        setIsAdmin(false);
        router.push('/admin/login?callbackUrl=/admin/jobs');
      }
    }
    checkAdmin();
  }, [router]);

  async function fetchLogs(signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (jobFilter !== 'all') params.set('jobId', jobFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/jobs/logs?${params.toString()}`, {
        cache: 'no-store',
        signal,
      });
      const data = await res.json();
      if (data.ok) {
        setLogs(data.logs || []);
        setSummary(data.summary || { total: 0, byStatus: {}, byJob: {} });
      }
    } catch (error: any) {
      // Ignore AbortError - it's expected when component unmounts or dependencies change
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        return;
      }
      console.error('Failed to fetch logs', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      const controller = new AbortController();
      fetchLogs(controller.signal);
      const interval = setInterval(() => fetchLogs(controller.signal), 60000);
      return () => {
        controller.abort();
        clearInterval(interval);
      };
    }
  }, [isAdmin, jobFilter, statusFilter]);

  const statusCards = useMemo(() => {
    return Object.entries(summary.byStatus).map(([status, count]) => {
      const definition = STATUS_DEFINITIONS[status] || {
        label: status,
        icon: <AlertTriangle className="h-4 w-4" />,
        className: 'text-slate-200 bg-white/10 border border-white/10',
      };
      return (
        <div key={status} className={`rounded-xl px-4 py-3 ${definition.className} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {definition.icon}
            <span className="text-sm font-medium">{definition.label}</span>
          </div>
          <span className="text-lg font-semibold">{count}</span>
        </div>
      );
    });
  }, [summary.byStatus]);

  if (isAdmin === null) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Job History</h1>
          <p className="text-white/60 text-sm">Monitor recent automation runs, outcomes, and runtime details.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition"
          onClick={() => fetchLogs()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Total Logs</p>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.total}</p>
          <p className="text-xs text-white/40 mt-2">
            Filtering limits results to the latest {logs.length} entries.
          </p>
        </div>
        {statusCards}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="text-xs text-white/50 block mb-1">Job</label>
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="input-field w-48"
          >
            <option value="all">All jobs</option>
            {JOB_DEFINITIONS.map((job) => (
              <option key={job.id} value={job.id}>
                {job.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-44"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
            <tr>
              <th className="px-4 py-3 text-left">Job</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Processed</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Updated</th>
              <th className="px-4 py-3 text-left hidden xl:table-cell">Skipped</th>
              <th className="px-4 py-3 text-left hidden xl:table-cell">Failed</th>
              <th className="px-4 py-3 text-left">Started</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Duration</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-sm text-white/80">
            {logs.map((log) => {
              const job = JOB_DEFINITIONS.find((j) => j.id === log.jobId);
              const statusDef = STATUS_DEFINITIONS[log.status] || STATUS_DEFINITIONS['running'];
              const started = new Date(log.startedAt);
              const finished = log.finishedAt ? new Date(log.finishedAt) : null;
              const durationMs = finished ? finished.getTime() - started.getTime() : null;

              return (
                <tr key={log.id} className="hover:bg-white/5 transition" onClick={() => setExpandedLog((prev) => (prev === log.id ? null : log.id))}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{job?.label || log.jobId}</span>
                      <span className="text-xs text-white/40">Log ID: {log.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusDef.className}`}>
                      {statusDef.icon}
                      {statusDef.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">{log.processed.toLocaleString()}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{log.updated.toLocaleString()}</td>
                  <td className="px-4 py-3 hidden xl:table-cell">{log.skipped.toLocaleString()}</td>
                  <td className={`px-4 py-3 hidden xl:table-cell ${log.failed ? 'text-rose-400 font-semibold' : ''}`}>
                    {log.failed.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span>{formatDistanceToNow(started, { addSuffix: true })}</span>
                      <span className="text-xs text-white/40">{started.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {durationMs != null ? `${Math.max(Math.round(durationMs / 1000), 1)}s` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {logs.length === 0 && (
          <div className="p-12 text-center text-white/60 text-sm">
            No logs found for the selected filters.
          </div>
        )}
      </div>

      {logs.map((log) => (
        <div key={`details-${log.id}`}>
          {expandedLog === log.id && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Execution details</h3>
              <div className="grid gap-3 text-sm text-white/70 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-white/40 text-xs uppercase">Job</p>
                  <p>{JOB_DEFINITIONS.find((j) => j.id === log.jobId)?.label || log.jobId}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase">Started</p>
                  <p>{new Date(log.startedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase">Finished</p>
                  <p>{log.finishedAt ? new Date(log.finishedAt).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase">Processed</p>
                  <p>{log.processed.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase">Updated</p>
                  <p>{log.updated.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase">Skipped</p>
                  <p>{log.skipped.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase">Failed</p>
                  <p className={log.failed ? 'text-rose-400 font-semibold' : ''}>{log.failed.toLocaleString()}</p>
                </div>
              </div>

              {log.details ? (
                <pre className="max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/40 p-4 text-xs text-white/70">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              ) : (
                <p className="text-xs text-white/40">No additional metadata stored for this run.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}


