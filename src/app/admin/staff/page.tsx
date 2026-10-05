'use client';
import { useEffect, useState } from 'react';
import { UserCog, RefreshCw, Plus, X, Check, Ban, Shield } from 'lucide-react';

interface StaffMember {
  id: string; email: string; name: string; role: string;
  isActive: boolean; mfaEnabled: boolean; createdAt: string;
}

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'COMPLIANCE', 'FINANCE', 'SUPPORT'];

const ROLE_DESC: Record<string, string> = {
  SUPER_ADMIN: 'Full access including staff management',
  ADMIN: 'Full access including staff management',
  OPERATIONS: 'Process orders, deposits, withdrawals',
  COMPLIANCE: 'View compliance and audit logs',
  FINANCE: 'View transactions and manage rates',
  SUPPORT: 'View users and orders',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  OPERATIONS: 'bg-blue-100 text-blue-700',
  COMPLIANCE: 'bg-amber-100 text-amber-700',
  FINANCE: 'bg-emerald-100 text-emerald-700',
  SUPPORT: 'bg-slate-100 text-slate-600',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'ADMIN' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff');
      const data = await res.json();
      if (res.ok) setStaff(data.staff || []);
      else setError(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const toggleActive = async (id: string, isActive: boolean) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(`Staff member ${isActive ? 'deactivated' : 'activated'} successfully`);
      fetch_();
    } catch (e: any) { setError(e.message); }
  };

  const changeRole = async (id: string, role: string) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(d.message || `Role shifted to ${role}`);
      fetch_();
    } catch (e: any) { setError(e.message); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setCreateError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setShowCreate(false);
      setForm({ email: '', name: '', password: '', role: 'SUPPORT' });
      setSuccess('Staff member created successfully');
      fetch_();
    } catch (e: any) { setCreateError(e.message); }
    finally { setCreating(false); }
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserCog size={22} className="text-purple-500" /> Staff Management
          </h1>
          <p className="text-slate-400 text-sm">{staff.length} staff members</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch_} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium">
            <Plus size={14} /> Add Staff
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">⚠ {error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm">✓ {success}</div>}

      {/* Role Legend */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Shield size={14} /> Role Permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ROLES.map(role => (
            <div key={role} className="flex items-start gap-2">
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0 ${ROLE_COLORS[role]}`}>{role.replace('_', ' ')}</span>
              <span className="text-slate-400 text-xs">{ROLE_DESC[role]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Staff Member', 'Role', 'Status', 'MFA', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><div className="w-6 h-6 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin mx-auto" /></td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">No staff members found</td></tr>
              ) : staff.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                        {(s.name || s.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                        <p className="text-slate-400 text-xs">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={s.role}
                      onChange={e => changeRole(s.id, e.target.value)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border-0 focus:outline-none focus:ring-2 focus:ring-sky-200 ${ROLE_COLORS[s.role]}`}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium ${s.mfaEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {s.mfaEnabled ? '✓ Enabled' : '— Off'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-slate-400 text-xs">{new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleActive(s.id, s.isActive)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        s.isActive
                          ? 'bg-red-50 text-red-500 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {s.isActive ? <><Ban size={12} /> Deactivate</> : <><Check size={12} /> Activate</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-slate-800">Create Staff Member</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'john@rupeebridge.com' },
                { label: 'Password', key: 'password', type: 'password', placeholder: 'Min 8 characters' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{f.label}</label>
                  <input
                    type={f.type} required minLength={f.key === 'password' ? 8 : undefined}
                    placeholder={f.placeholder}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 bg-white"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-slate-400 text-xs mt-1">{ROLE_DESC[form.role]}</p>
              </div>
              {createError && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">⚠ {createError}</div>}
              <button type="submit" disabled={creating}
                className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all">
                {creating ? 'Creating...' : 'Create Staff Member'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
