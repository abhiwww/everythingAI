'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Message2, Clock, List, Plus } from 'lucide-react';

export default function ProviderPortal() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('everyday_ai_token') : null;
    if (!token) return;
    api.auth.me()
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setUser(d?.user);
        if (d?.user) {
          api.providers.me().then((r) => {
            if (r.ok) return r.json();
            return null;
          }).then((d) => setProfile(d?.provider ?? null));
        }
      });
    api.bookings.list().then((r) => {
      if (r.ok) return r.json();
      return null;
    }).then((d) => setBookings(d?.bookings ?? []));
    setLoading(false);
  }, []);

  if (loading) return <div className="p-8">Loading provider portal…</div>;
  if (!user) return <div className="p-8">Please sign in.</div>;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} onLogout={() => { localStorage.removeItem('everyday_ai_token'); window.location.href = '/'; }} />
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Provider Portal</h1>
            <p className="text-slate-600">Manage your availability, review requests, and track bookings.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-2"><Plus className="w-5 h-5 text-blue-600" /><span className="font-semibold">Availability</span></div>
            <p className="text-sm text-slate-600">Set your working hours and service areas.</p>
            <button className="mt-3 btn-secondary">Set availability</button>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-2"><Message2 className="w-5 h-5 text-emerald-600" /><span className="font-semibold">Job requests</span></div>
            <p className="text-sm text-slate-600">Review and accept or decline incoming requests.</p>
            <button className="mt-3 btn-secondary">View requests</button>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-2"><List className="w-5 h-5 text-slate-600" /><span className="font-semibold">Bookings</span></div>
            <p className="text-sm text-slate-600">{bookings.length} booking(s) this month.</p>
            <button className="mt-3 btn-secondary">View history</button>
          </div>
        </div>

        {profile && (
          <div className="card p-6 mt-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Your profile</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <dt className="text-slate-500">Display name</dt>
              <dd className="font-medium">{profile.display_name}</dd>
              <dt className="text-slate-500">Verification status</dt>
              <dd className={`font-medium capitalize ${profile.verification_status === 'verified' ? 'text-emerald-600' : 'text-amber-700'}`}>
                {profile.verification_status}
              </dd>
              <dt className="text-slate-500">Service areas</dt>
              <dd className="font-medium truncate">{Array.isArray(profile.service_areas) ? profile.service_areas.join(', ') : '-'}</dd>
              <dt className="text-slate-500">Languages</dt>
              <dd className="font-medium">{Array.isArray(profile.languages) ? profile.languages.join(', ') : '-'}</dd>
              <dt className="text-slate-500">Rating</dt>
              <dd className="font-medium">{profile.rating_label || 'New provider'}</dd>
            </dl>
            {profile.verification_status !== 'verified' && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50/50 rounded px-2 py-1 border border-amber-100">
                Your profile is pending verification. An admin will review your documents.
              </p>
            )}
          </div>
        )}

        {!profile && (
          <div className="card p-6 mt-6 border-dashed border-slate-300">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Register as a provider</h2>
            <p className="text-sm text-slate-600 mb-4">No provider profile found. Register to offer your services.</p>
            <button className="btn-primary">Register as provider</button>
          </div>
        )}

        <div className="mt-8 card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent bookings</h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-slate-500">No bookings yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left pb-2 text-slate-500">Status</th>
                  <th className="text-left pb-2 text-slate-500">Scheduled</th>
                  <th className="text-left pb-2 text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100">
                    <td className="py-2">
                      <span className={`status-badge ${b.status.split('_')[0]}`}>{b.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-2">{b.scheduled_at ? new Date(b.scheduled_at).toLocaleDateString() : '-'}</td>
                    <td className="py-2 font-medium">₹{b.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
