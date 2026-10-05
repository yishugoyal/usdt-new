'use client';
import { useCallback, useEffect, useState } from 'react';
import { ScrollText, RefreshCw, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface AuditLog {
  id: string; actorType: string; actorId: string; action: string;
  entityType: string; entityId?: string; details: string;
  ipAddress?: string; timestamp: string;
  staff?: { id: string; name: string; email: string; role: string };
}

const ACTION_COLORS: Record<string, string> = {
  BALANCE_ADJUSTMENT: 'bg-orange-100 text-orange-700',
  UPDATE_USER: 'bg-blue-100 text-blue-700',
  CREATE_STAFF: 'bg-emerald-100 text-emerald-700',
  UPDATE_STAFF: 'bg-purple-100 text-purple-700',
  UPDATE_SETTING: 'bg-sky-100 text-sky-700',
  PERMISSION_DENIED: 'bg-red-100 text-red-700',
  TRANSACTION_STATUS_UPDATE: 'bg-amber-100 text-amber-700',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async (pg = 1, q = search, action = actionFilter) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '50' });
      if (q) params.set('search', q);
      if (action) params.set('action', action);
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(data.logs || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, actionFilter]);

  useEffect(() => { fetchLogs(1); }, []);

  const commonActions = [
    'BALANCE_ADJUSTMENT', 'UPDATE_USER', 'CREATE_STAFF', 'UPDATE_STAFF',
    'UPDATE_SETTING', 'PERMISSION_DENIED', 'TRANSACTION_STATUS_UPDATE',
  ];

  const parseDetails = (details: string) => {
    try { return JSON.parse(details); } catch { return { raw: details }; }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ScrollText size={22} className="text-slate-500" /> Audit Logs
          </h1>
          <p className="text-slate-400 text-sm">{total.toLocaleString()} total entries — read-only</p>
        </div>
        <button onClick={() => fetchLogs(page)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">⚠ {error}</div>}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by actor ID or entity ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); fetchLogs(1, e.target.value, actionFilter); }}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
          />
        </div>
        <select value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); fetchLogs(1, search, e.target.value); }}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white"
        >
          <option value="">All Actions</option>
          {commonActions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Action', 'Performed By', 'Entity', 'IP', 'Timestamp', 'Detail'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><div className="w-6 h-6 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin mx-auto" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">No audit log entries found</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {log.staff ? (
                      <div>
                        <p className="text-slate-700 text-sm font-medium">{log.staff.name || log.staff.email}</p>
                        <p className="text-slate-400 text-xs">{log.staff.role}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs font-mono">{log.actorId.slice(0, 12)}...</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-slate-500 text-xs font-medium">{log.entityType}</p>
                    {log.entityId && <p className="text-slate-400 text-[10px] font-mono">{log.entityId.slice(0, 12)}...</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-slate-400 text-xs font-mono">{log.ipAddress || '—'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-slate-400 text-xs">
                      {new Date(log.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => setSelected(log)} className="px-3 py-1.5 text-xs font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-slate-400 text-sm">{total.toLocaleString()} total entries</span>
            <div className="flex items-center gap-1">
              <button onClick={() => { setPage(p => p - 1); fetchLogs(page - 1); }} disabled={page <= 1}
                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-lg">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-600 px-2">Page {page} / {totalPages}</span>
              <button onClick={() => { setPage(p => p + 1); fetchLogs(page + 1); }} disabled={page >= totalPages}
                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-lg">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="font-bold text-slate-800">Audit Log Detail</h2>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${ACTION_COLORS[selected.action] || 'bg-slate-100 text-slate-600'}`}>
                  {selected.action.replace(/_/g, ' ')}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Log ID', value: selected.id },
                { label: 'Performed By', value: selected.staff?.email || selected.actorId },
                { label: 'Role', value: selected.staff?.role || selected.actorType },
                { label: 'Entity Type', value: selected.entityType },
                { label: 'Entity ID', value: selected.entityId || '—' },
                { label: 'IP Address', value: selected.ipAddress || '—' },
                { label: 'Timestamp', value: new Date(selected.timestamp).toLocaleString('en-IN') },
              ].map((f, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-400 text-sm">{f.label}</span>
                  <span className="text-slate-700 text-sm font-medium text-right ml-4 break-all">{f.value}</span>
                </div>
              ))}
              <div>
                <p className="text-slate-400 text-sm mb-2">Details</p>
                <pre className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 overflow-x-auto leading-relaxed">
                  {JSON.stringify(parseDetails(selected.details), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
