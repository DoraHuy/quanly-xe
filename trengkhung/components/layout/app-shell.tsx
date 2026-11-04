'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  FilePlus2,
  ReceiptText,
  Users,
  AlertTriangle,
  CornerDownLeft,
  ArrowLeftRight,
  CalendarPlus,
  CalendarDays,
  Bike,
  Tag,
  BadgeDollarSign,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/core/application/auth-store';
import { swrFetcher } from '@/core/infrastructure/api-client';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: 'rental_actions' | 'booking_actions';
  roles?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Chung',
    items: [{ label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Vận hành',
    items: [
      { label: 'Tạo đơn thuê', href: '/rentals/new', icon: FilePlus2 },
      { label: 'Đơn thuê', href: '/rentals', icon: ReceiptText },
      { label: 'Khách hàng', href: '/customers', icon: Users },
      {
        label: 'Xử lý đơn thuê',
        href: '/rentals/action-required',
        icon: AlertTriangle,
        badgeKey: 'rental_actions',
      },
      { label: 'Trả xe', href: '/returns', icon: CornerDownLeft },
      { label: 'Đổi tài sản', href: '/swap', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Đặt lịch (Booking)',
    items: [
      { label: 'Tạo booking', href: '/bookings/new', icon: CalendarPlus },
      { label: 'Danh sách đặt lịch', href: '/bookings', icon: CalendarDays },
    ],
  },
  {
    title: 'Quản trị',
    items: [
      { label: 'Tài sản (Xe & Pin)', href: '/assets', icon: Bike },
      { label: 'Mã giảm giá', href: '/discount-codes', icon: Tag, roles: ['admin'] },
      { label: 'Bảng giá', href: '/pricing', icon: BadgeDollarSign, roles: ['admin'] },
      { label: 'Nhân viên', href: '/staff', icon: UserCog, roles: ['admin', 'manager'] },
      { label: 'Cài đặt', href: '/settings', icon: Settings },
    ],
  },
];

const MOBILE_BOTTOM_ITEMS = [
  { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Đơn thuê', href: '/rentals', icon: ReceiptText },
  { label: 'Tạo đơn', href: '/rentals/new', icon: FilePlus2, highlight: true },
  { label: 'Trả xe', href: '/returns', icon: CornerDownLeft },
  { label: 'Tài sản', href: '/assets', icon: Bike },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, initialized, hydrate, logout } = useAuthStore();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (initialized && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [initialized, user, pathname, router]);

  const { data: counts } = useSWR(
    user ? '/api/action-required/counts' : null,
    swrFetcher,
    { refreshInterval: 15000 },
  );

  if (!initialized || (!user && pathname !== '/login')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Zap className="h-6 w-6 animate-pulse" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Đang tải hệ thống Ruby EV Rent...</p>
        </motion.div>
      </div>
    );
  }

  const getBadgeValue = (key?: 'rental_actions' | 'booking_actions') => {
    if (!key || !counts) return 0;
    if (key === 'rental_actions') return counts.rentals?.total || 0;
    if (key === 'booking_actions') return counts.bookings?.total || 0;
    return 0;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-slate-900 text-slate-100 border-r border-slate-800 sticky top-0 h-screen">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white">Ruby EV Rent</h1>
            <p className="text-xs text-emerald-400 font-medium">Quản lý Thuê Xe Điện</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (i) => !i.roles || (user?.role && i.roles.includes(user.role)),
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title}>
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    const badge = getBadgeValue(item.badgeKey);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          active
                            ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </span>
                        {badge > 0 && (
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                              active
                                ? 'bg-slate-950 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role} • @{user?.username}</p>
            </div>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              title="Đăng xuất"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 -ml-1 rounded-lg text-slate-200 hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm">Ruby EV Rent</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/rentals/action-required"
            className="relative p-2 rounded-lg bg-slate-800 text-amber-400"
          >
            <AlertTriangle className="h-4 w-4" />
            {(counts?.rentals?.total || 0) > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                {counts.rentals.total}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Mobile Slide-Over Menu */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col lg:hidden"
            >
              <div className="p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                    <Zap className="h-4 w-4" />
                  </div>
                  <span className="font-bold">Ruby EV Rent</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {NAV_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="px-3 mb-1 text-[11px] font-semibold uppercase text-slate-400">
                      {group.title}
                    </p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                            active
                              ? 'bg-emerald-500 text-slate-950 font-semibold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 opacity-50" />
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-slate-400">@{user?.username}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-medium"
                >
                  Đăng xuất
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-24 lg:pb-8">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8"
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {MOBILE_BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5"
              >
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors ${
                active ? 'text-emerald-600 font-semibold' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

