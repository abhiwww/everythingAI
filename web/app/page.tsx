'use client';

import { useState, useEffect } from 'react';
import { api, setToken } from '@/app/lib/api';
import { Chat } from '@/components/Chat';
import { Sidebar } from '@/components/Sidebar';
import { SignIn } from './signin';

export default function Home() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('everyday_ai_token') : null;
    if (token) {
      setToken(token);
      api.auth.me()
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('not authenticated');
        })
        .then((data) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('everyday_ai_token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-slate-500">Signing in…</p>
      </div>
    );
  }

  if (!user) {
    return <SignIn onLogin={(t) => { localStorage.setItem('everyday_ai_token', t); setToken(t); api.auth.me().then(r => r.ok && r.json().then(d => setUser(d.user))); }} />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        user={user}
        onLogout={() => {
          localStorage.removeItem('everyday_ai_token');
          setToken(null);
          setUser(null);
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate font-bold text-slate-900">Everyday AI Concierge</span>
            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Demo mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-700"
              aria-label="Account"
              title={user.email}
            >
              {user.email?.[0]?.toUpperCase()}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <Chat />
        </main>
      </div>
    </div>
  );
}
