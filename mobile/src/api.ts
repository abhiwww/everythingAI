/**
 * API client for Everyday AI Concierge mobile app.
 * Shares the same backend API as the web app.
 *
 * Default points to the local dev backend. In production, set API_BASE_URL
 * via environment variables or EAS build config.
 */

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:4000/api/v1';

let token: string | null = null;

export function setToken(t: string | null) {
  token = t;
}

export function getToken(): string | null {
  return token;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
}

export const api = {
  auth: {
    register: (body: any) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: any) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me', { method: 'GET' }),
  },
  conversations: {
    list: () => request('/conversations', { method: 'GET' }),
    create: (body: any) =>
      request('/conversations', { method: 'POST', body: JSON.stringify(body) }),
    send: (id: string, body: any) =>
      request(`/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    messages: (id: string) =>
      request(`/conversations/${id}/messages`, { method: 'GET' }),
  },
  services: {
    list: () => request('/services', { method: 'GET' }),
  },
  providers: {
    search: (params: URLSearchParams) =>
      request(`/providers/search?${params}`, { method: 'GET' }),
    register: (body: any) =>
      request('/providers/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => request('/providers/me', { method: 'GET' }),
  },
  matching: {
    eligible: (params: URLSearchParams) =>
      request(`/matching/eligible?${params}`, { method: 'GET' }),
  },
  quotes: {
    create: (body: any) =>
      request('/quotes', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request(`/quotes/${id}`, { method: 'GET' }),
  },
  bookings: {
    list: () => request('/bookings', { method: 'GET' }),
    create: (body: any) =>
      request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request(`/bookings/${id}`, { method: 'GET' }),
    cancel: (id: string) =>
      request(`/bookings/${id}/cancel-request`, { method: 'POST' }),
    accept: (id: string) =>
      request(`/provider/bookings/${id}/accept`, { method: 'POST' }),
    decline: (id: string) =>
      request(`/provider/bookings/${id}/decline`, { method: 'POST' }),
  },
  support: {
    tickets: () => request('/support/tickets', { method: 'GET' }),
    create: (body: any) =>
      request('/support/tickets', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  admin: {
    providers: () => request('/admin/providers', { method: 'GET' }),
    requests: () => request('/admin/requests', { method: 'GET' }),
    audit: () => request('/admin/audit', { method: 'GET' }),
    flags: () => request('/admin/feature-flags', { method: 'GET' }),
  },
};

export type BookingStatus =
  | 'draft' | 'quote_ready' | 'customer_approved' | 'provider_pending'
  | 'confirmed' | 'in_progress' | 'completed' | 'provider_declined'
  | 'expired' | 'cancel_requested' | 'cancelled' | 'disputed' | 'failed';
