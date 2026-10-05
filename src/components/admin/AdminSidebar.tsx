'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  UserCog,
  TrendingUp,
  Settings,
  ScrollText,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Building2,
  User,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

interface NavItem { href: string; label: string; icon: LucideIcon; exact?: boolean; }
interface NavGroup { label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'User Management',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: FileText },
      { href: '/admin/deposits', label: 'Deposits', icon: ArrowDownToLine },
      { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
      { href: '/admin/transactions', label: 'Transactions', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/admin/rates', label: 'Rates', icon: TrendingUp },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Security & Compliance',
    items: [
      { href: '/admin/staff', label: 'Staff', icon: UserCog },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
      { href: '/admin/compliance', label: 'Compliance', icon: ShieldAlert },
      { href: '/admin/profile', label: 'Profile & Security', icon: User },
    ],
  },
];

interface AdminSidebarProps {
  staffEmail: string;
  staffRole: string;
  staffName: string;
}

export default function AdminSidebar({ staffEmail, staffRole, staffName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Also clear staff token
      await fetch('/api/auth/staff-logout', { method: 'POST' });
    } catch (_) {}
    router.push('/admin/login');
  };

  const SidebarContent = () => (
    <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col h-full overflow-y-auto">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">RupeeBridge</div>
            <div className="text-slate-500 text-xs">Admin Console</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    active
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon
                    size={16}
                    className={active ? 'text-sky-400' : 'text-slate-500 group-hover:text-white'}
                  />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight size={12} className="text-sky-400" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Staff Info + Logout */}
      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold">
            {(staffName || staffEmail || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{staffName || staffEmail}</div>
            <div className="text-slate-500 text-[10px] font-mono">{staffRole}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 text-sm font-medium transition-all"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-sky-500 flex items-center justify-center">
            <Building2 size={13} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm">RupeeBridge Admin</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-slate-400 hover:text-white p-1"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <SidebarContent />
      </div>
    </>
  );
}
