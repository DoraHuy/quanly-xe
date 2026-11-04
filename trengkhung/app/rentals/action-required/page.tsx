'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertTriangle,
  Clock,
  Wallet,
  CornerDownLeft,
  CalendarClock,
  CheckCircle2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { swrFetcher } from '@/core/infrastructure/api-client';
import { formatVND, formatDateTimeVN } from '@/core/domain/types';

const ACTION_FILTERS = [
  { key: 'overdue', label: 'Quá hạn trả xe', tone: 'rose' },
  { key: 'due_today', label: 'Đến hạn hôm nay', tone: 'amber' },
  { key: 'due_tomorrow', label: 'Đến hạn ngày mai', tone: 'blue' },
  { key: 'overdue_full', label: 'Còn nợ dòng tiền', tone: 'purple' },
];

export default function ActionRequiredRentalsPage() {
  const [filter, setFilter] = useState('overdue');

  const { data: counts } = useSWR('/api/action-required/counts', swrFetcher);
  const { data } = useSWR(`/api/rentals?action_filter=${filter}&limit=50`, swrFetcher);

  const rentals = data?.rentals || [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Trung tâm Xử lý Đơn thuê & Cảnh báo Quá hạn
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi sát các xe đến hạn trả, quá hạn trả xe và các đơn còn công nợ phải thu
          </p>
        </div>

        {/* Summary Filter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {ACTION_FILTERS.map((f) => {
            const countVal = counts?.rentals?.[f.key] ?? 0;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold opacity-80">{f.label}</span>
                  <AlertTriangle
                    className={`h-4 w-4 ${active ? 'text-emerald-400' : 'text-rose-500'}`}
                  />
                </div>
                <p className="text-2xl font-bold mt-2">{countVal} đơn</p>
              </button>
            );
          })}
        </div>

        {/* Matching Rentals List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          {rentals.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-700">
                Không có đơn thuê nào trong mục cảnh báo này
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rentals.map(
                (r: {
                  id: string;
                  code: string;
                  customer: { name: string; phone: string };
                  expected_return_at: string;
                  total_amount: number;
                  paid_amount: number;
                  remaining_balance: number;
                  next_due_items: Array<{ asset_name: string; asset_code: string }>;
                }) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{r.code}</span>
                        <span className="text-sm font-semibold text-emerald-700">
                          • {r.customer.name} ({r.customer.phone || 'Chưa SĐT'})
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-rose-500" />
                          Hạn trả: <strong>{formatDateTimeVN(r.expected_return_at)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Xe:{' '}
                          <strong>
                            {r.next_due_items
                              .map((i) => `${i.asset_name} (${i.asset_code})`)
                              .join(', ')}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          Đã thu {formatVND(r.paid_amount)} / {formatVND(r.total_amount)}
                        </p>
                        <p className="text-sm font-bold text-rose-600">
                          Còn phải thu: {formatVND(r.remaining_balance)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/returns?q=${r.code}`}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <CornerDownLeft className="h-3.5 w-3.5" />
                          <span>Trả xe & Tất toán</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

