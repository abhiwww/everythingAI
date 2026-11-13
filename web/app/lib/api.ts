export const API_BASE = '/api/v1';

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

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  return res;
}

export const api = {
  auth: {
    register: (body: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me', { method: 'GET' }),
  },
  conversations: {
    list: () => request('/conversations', { method: 'GET' }),
    create: (body: any) => request('/conversations', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request(`/conversations/${id}`, { method: 'GET' }),
    send: (id: string, body: any) =>
      request(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify(body) }),
    messages: (id: string) => request(`/conversations/${id}/messages`, { method: 'GET' }),
  },
  services: {
    list: () => request('/services', { method: 'GET' }),
  },
  providers: {
    search: (params: URLSearchParams) => request(`/providers/search?${params}`, { method: 'GET' }),
    register: (body: any) => request('/providers/register', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/providers/me', { method: 'GET' }),
  },
  matching: {
    eligible: (params: URLSearchParams) => request(`/matching/eligible?${params}`, { method: 'GET' }),
  },
  quotes: {
    create: (body: any) => request('/quotes', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request(`/quotes/${id}`, { method: 'GET' }),
  },
  bookings: {
    list: () => request('/bookings', { method: 'GET' }),
    create: (body: any) => request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request(`/bookings/${id}`, { method: 'GET' }),
    cancel: (id: string) => request(`/bookings/${id}/cancel-request`, { method: 'POST' }),
    accept: (id: string) => request(`/provider/bookings/${id}/accept`, { method: 'POST' }),
    decline: (id: string) => request(`/provider/bookings/${id}/decline`, { method: 'POST' }),
  },
  support: {
    tickets: () => request('/support/tickets', { method: 'GET' }),
    create: (body: any) => request('/support/tickets', { method: 'POST', body: JSON.stringify(body) }),
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
