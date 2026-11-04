'use client';

import React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { CalendarPlus, CalendarDays, MapPin, Phone, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import { formatDateTimeVN, formatVND } from '@/core/domain/types';

export default function BookingsPage() {
  const { data, mutate } = useSWR('/api/bookings?limit=50', swrFetcher);
  const bookings = data?.items || [];

  const handleStatusChange = async (id: string, status: string) => {
    await apiClient.patch(`/api/bookings/${id}/status`, { status });
    await mutate();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Danh sách Đặt lịch trước (Bookings)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Quản lý lịch hẹn giữ xe trước cho khách hàng và chuyển thành hợp đồng thuê chính thức
            </p>
          </div>
          <Link
            href="/bookings/new"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm flex items-center gap-2 self-start"
          >
            <CalendarPlus className="h-4 w-4" />
            <span>+ Tạo lịch đặt xe</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          {bookings.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Chưa có lịch đặt trước nào.
            </p>
          ) : (
            bookings.map(
              (b: {
                id: string;
                code: string;
                status: string;
                customer_name: string;
                customer_phone: string;
                pickup_at: string;
                duration_days: number;
                delivery_address?: string;
                deposit_amount: number;
                assets: Array<{ name: string; qr_code: string }>;
              }) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold text-slate-900">{b.code}</span>
                      <span className="font-semibold text-emerald-700">• {b.customer_name}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {b.customer_phone}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Nhận xe: <strong>{formatDateTimeVN(b.pickup_at)}</strong> ({b.duration_days}{' '}
                      ngày) • Đã cọc: <strong>{formatVND(b.deposit_amount)}</strong>
                    </p>
                    {b.delivery_address && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-amber-600" />
                        Giao tại: {b.delivery_address}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {b.status !== 'cancelled' && b.status !== 'converted' && (
                      <>
                        <Link
                          href="/rentals/new"
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <span>Giao xe / Tạo đơn</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleStatusChange(b.id, 'cancelled')}
                          className="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold"
                        >
                          Hủy lịch
                        </button>
                      </>
                    )}
                    {b.status === 'cancelled' && (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                        Đã hủy
                      </span>
                    )}
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </div>
    </AppShell>
  );
}

