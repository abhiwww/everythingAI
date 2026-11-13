'use client';

import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface JobRequest {
  id: string;
  customer_email: string;
  status: string;
  scheduled_at: string;
  total: number;
}

export default function ProviderRequests() {
  const [user, setUser] = useState<any | null>(null);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('everyday_ai_token') : null;
    if (!token) return;
    api.auth.me()
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user))
      .finally(() => fetchRequests());
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.admin.requests();
      if (res.ok) {
        const data = await res.json();
        setRequests((data.requests ?? []).filter((r: any) => r.status === 'provider_pending'));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAction = async (bookingId: string, action: 'accept' | 'decline') => {
    const res = await fetch(`/api/v1/provider/bookings/${bookingId}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('everyday_ai_token')}`,
      },
    });
    if (res.ok) {
      fetchRequests();
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} onLogout={() => { localStorage.removeItem('everyday_ai_token'); window.location.href = '/'; }} />
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Requests</h1>
            <p className="text-slate-600">Review and accept or decline incoming booking requests.</p>
          </div>
          <button
            onClick={() => { setRefreshing(true); fetchRequests(); }}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={refreshing}
          >
            {refreshing ? <RefreshCw className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />} Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-4">Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="card p-8 text-center">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No pending job requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{r.customer_email}</div>
                  <div className="text-xs text-slate-500">
                    Scheduled: {new Date(r.scheduled_at).toLocaleString()} • Total: ₹{r.total}
                  </div>
                </div>
                <div className={`status-badge ${r.status.split('_')[0]}`}>
                  {r.status.replace('_', ' ')}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(r.id, 'accept')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Accept
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'decline')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 transition"
                  >
                    <XCircle className="w-3 h-3 mr-1" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
