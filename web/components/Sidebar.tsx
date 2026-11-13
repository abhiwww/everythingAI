'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Calendar,
  Building2,
  User,
  Shield,
  LogOut,
  Settings,
  Mail,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export function Sidebar({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [collapsed, setCollapsed] = useState(false);

  const items: NavItem[] = [
    { label: 'Chat', href: '/', icon: MessageSquare },
    { label: 'My Bookings', href: '/bookings', icon: Calendar },
    { label: 'Addresses', href: '/addresses', icon: Building2 },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Support', href: '/support', icon: Mail },
  ];

  const adminItems: NavItem[] = [
    { label: 'Admin Console', href: '/admin', icon: Shield },
    { label: 'Audit Log', href: '/admin/audit', icon: Settings },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 md:static md:translate-x-0 ${
        collapsed ? '-translate-x-full' : 'translate-x-0'
      }`}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
        <span className="font-bold text-slate-900">Everyday AI</span>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Open navigation' : 'Close navigation'}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <nav className="p-3 space-y-1">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </a>
        ))}
        {user?.role === 'admin' || user?.role === 'support' ? (
          <div className="pt-2 border-t border-slate-200">
            <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Staff</div>
            {adminItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </a>
            ))}
          </div>
        ) : null}
      </nav>

      <div className="absolute bottom-0 left-0 w-full p-3 border-t border-slate-200">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
