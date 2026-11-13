'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Shield, List, FileText, Users, Clock } from 'lucide-react';

export default function AdminConsole() {
  const [user, setUser] = useState<any | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('everyday_ai_token') : null;
    if (!token) return;
    api.auth.me().then((r) => (r.ok ? r.json() : null)).then((d) => setUser(d?.user));
    api.admin.providers().then((r) => (r.ok ? r.json() : null)).then((d) => setProviders(d?.providers ?? []));
    api.admin.requests().then((r) => (r.ok ? r.json() : null)).then((d) => setRequests(d?.requests ?? []));
    api.admin.audit().then((r) => (r.ok ? r.json() : null)).then((d) => setAudit(d?.audit ?? []));
    setLoading(false);
  }, []);

  if (loading) return <div className="p-8">Loading admin console…</div>;
  if (!user || (user.role !== 'admin' && user.role !== 'support')) {
    return <div className="p-8">Admin access required.</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} onLogout={() => { localStorage.removeItem('everyday_ai_token'); window.location.href = '/'; }} />
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Console</h1>
            <p className="text-slate-600">Provider verification, request queue, and audit trail.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Providers" value={providers.length} />
          <StatCard icon={List} label="Pending requests" value={requests.filter((r: any) => r.status === 'provider_pending').length} />
          <StatCard icon={Clock} label="Confirmed" value={requests.filter((r: any) => r.status === 'confirmed').length} />
          <StatCard icon={FileText} label="Audit events" value={audit.length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5" /><h2 className="font-bold text-slate-900">Provider verification</h2></div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left pb-2 text-slate-500">Name</th>
                  <th className="text-left pb-2 text-slate-500">Status</th>
                  <th className="text-left pb-2 text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2">{p.display_name}</td>
                    <td className="py-2">
                      <span className={`status-badge ${p.verification_status}`}>{p.verification_status}</span>
                    </td>
                    <td className="py-2">
                      <button className="text-xs text-blue-600 hover:underline">Review</button>
                    </td>
                  </tr>
                ))}
                {providers.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-slate-500 text-sm">No providers</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4"><List className="w-5 h-5" /><h2 className="font-bold text-slate-900">Request queue</h2></div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left pb-2 text-slate-500">Customer</th>
                  <th className="text-left pb-2 text-slate-500">Status</th>
                  <th className="text-left pb-2 text-slate-500">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2">{r.customer_email}</td>
                    <td className="py-2">
                      <span className={`status-badge ${r.status.split('_')[0]}`}>{r.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-2">{r.scheduled_at ? new Date(r.scheduled_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-slate-500 text-sm">No requests</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 card p-6">
          <div className="flex items-center gap-2 mb-4"><Shield className="w-5 h-5" /><h2 className="font-bold text-slate-900">Audit trail</h2></div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left pb-2 text-slate-500">Actor</th>
                <th className="text-left pb-2 text-slate-500">Action</th>
                <th className="text-left pb-2 text-slate-500">Target</th>
                <th className="text-left pb-2 text-slate-500">Time</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((e: any) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-2 text-sm text-slate-600">{e.actor_id}</td>
                  <td className="py-2 text-sm text-slate-700">{e.action}</td>
                  <td className="py-2 text-sm text-slate-600">{e.target_type}</td>
                  <td className="py-2 text-sm text-slate-500">{new Date(e.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-slate-500 text-sm">No audit events</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
    </div>
  );
}
