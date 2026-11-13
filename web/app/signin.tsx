'use client';

import { useState } from 'react';
import { api } from '@/app/lib/api';

interface SignInProps {
  onLogin: (token: string) => void;
}

export function SignIn({ onLogin }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.auth.login({ email, password });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('everyday_ai_token', data.token);
        onLogin(data.token);
      } else {
        const err = await res.json();
        setError(err.message || 'Login failed');
      }
    } catch {
      setError('Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.auth.register({ email, password, role });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('everyday_ai_token', data.token);
        onLogin(data.token);
      } else {
        const err = await res.json();
        setError(err.message || 'Registration failed');
      }
    } catch {
      setError('Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Everyday AI</h1>
        <p className="text-sm text-slate-600 mb-6">
          Your personal assistant for everyday services in Bengaluru.
        </p>

        <form onSubmit={handleLogin} className="space-y-3">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <label className="label">I am a</label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as 'customer' | 'provider')}
          >
            <option value="customer">Customer</option>
            <option value="provider">Provider</option>
          </select>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Don't have an account?
        </p>
        <button
          type="button"
          onClick={handleRegister}
          className="w-full py-2.5 rounded-xl font-medium text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={submitting}
        >
          {submitting ? 'Creating account…' : 'Register'}
        </button>

        {error && (
          <div className="mt-3 p-2 rounded text-sm text-rose-700 bg-rose-50 border border-rose-100">
            {error}
          </div>
        )}
        <p className="mt-4 text-[11px] text-slate-400 text-center">
          Demo mode — sample data only. No real bookings or payments.
        </p>
      </div>
    </div>
  );
}
