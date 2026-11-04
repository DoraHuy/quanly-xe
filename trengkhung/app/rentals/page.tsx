'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  FilePlus2,
  Eye,
  Wallet,
  CalendarPlus,
  CornerDownLeft,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import { formatVND, formatDateTimeVN } from '@/core/domain/types';

const STATUS_TABS = [
  { value: 'all', label: 'Tất cả đơn' },
  { value: 'active', label: 'Đang thuê' },
  { value: 'overdue', label: 'Quá hạn trả' },
  { value: 'overdue_cashflow', label: 'Nợ dòng tiền' },
  { value: 'returned', label: 'Đã trả xe' },
];

export default function RentalsListPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);

  // Payment & Extension modal state inside drawer
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payNote, setPayNote] = useState('');
  const [extraDays, setExtraDays] = useState<number>(2);
  const [extendPaid, setExtendPaid] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);

  const queryParams = new URLSearchParams();
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  if (search.trim()) queryParams.set('search', search.trim());
  queryParams.set('limit', '50');

  const { data, mutate } = useSWR(`/api/rentals?${queryParams.toString()}`, swrFetcher);
  const { data: rentalDetail, mutate: mutateDetail } = useSWR(
    selectedRentalId ? `/api/rentals/${selectedRentalId}` : null,
    swrFetcher,
  );

  const rentals = data?.rentals || [];

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalId || payAmount <= 0) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/api/rentals/${selectedRentalId}/payments`, {
        amount: payAmount,
        method: payMethod,
        note: payNote || 'Thu bổ sung công nợ đơn thuê',
      });
      setPayAmount(0);
      setPayNote('');
      await Promise.all([mutateDetail(), mutate()]);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalId || extraDays < 1) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/api/rentals/${selectedRentalId}/extend`, {
        extra_days: extraDays,
        paid_amount: extendPaid,
        method: payMethod,
      });
      setExtendPaid(0);
      await Promise.all([mutateDetail(), mutate()]);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Quản lý Đơn Thuê Xe
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Tra cứu hợp đồng thuê, thu tiền công nợ, gia hạn thời gian thuê và kiểm tra lịch sử
            </p>
          </div>
          <Link
            href="/rentals/new"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm flex items-center gap-2 self-start shadow-md shadow-emerald-600/20"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>+ Tạo đơn thuê mới</span>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setStatusFilter(t.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === t.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã đơn, tên khách, CCCD, mã xe..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
        </div>

        {/* Rentals Cards / Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-slate-400 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Mã đơn</th>
                  <th className="py-3.5 px-4">Khách hàng</th>
                  <th className="py-3.5 px-4">Xe / Tài sản</th>
                  <th className="py-3.5 px-4">Hạn trả</th>
                  <th className="py-3.5 px-4 text-right">Tiền trên đơn</th>
                  <th className="py-3.5 px-4 text-right">Đã thu</th>
                  <th className="py-3.5 px-4 text-right">Còn phải thu</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rentals.map(
                  (r: {
                    id: string;
                    code: string;
                    status: string;
                    total_amount: number;
                    paid_amount: number;
                    remaining_balance: number;
                    duration_days: number;
                    expected_return_at: string;
                    is_overdue: boolean;
                    customer: { name: string; phone: string; id_number?: string };
                    next_due_items: Array<{ asset_name: string; asset_code: string }>;
                  }) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {r.code}
                        <p className="text-[11px] font-normal text-slate-400">
                          {r.duration_days} ngày
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{r.customer.name}</p>
                        <p className="text-xs text-slate-500">
                          {r.customer.phone || r.customer.id_number || '—'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {r.next_due_items.map((item) => (
                            <span
                              key={item.asset_code}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold"
                            >
                              {item.asset_name} ({item.asset_code})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {formatDateTimeVN(r.expected_return_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatVND(r.total_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                        {formatVND(r.paid_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                        {formatVND(r.remaining_balance)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {r.status === 'returned' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Đã trả
                          </span>
                        ) : r.is_overdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                            <AlertTriangle className="h-3 w-3" />
                            Quá hạn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <Clock className="h-3 w-3" />
                            Đang thuê
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedRentalId(r.id);
                            setPayAmount(r.remaining_balance);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Chi tiết / Xử lý</span>
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slide-Over Detail & Settlement Drawer */}
        <AnimatePresence>
          {selectedRentalId && rentalDetail && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="bg-white w-full max-w-xl h-full overflow-y-auto p-6 space-y-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-600">
                      Chi tiết hợp đồng thuê
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">{rentalDetail.code}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedRentalId(null)}
                    className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Customer Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                  <p className="font-bold text-sm text-slate-900">
                    Khách hàng: {rentalDetail.customer?.name}
                  </p>
                  <p className="text-slate-600">
                    Số CCCD/Hộ chiếu: <strong>{rentalDetail.customer?.id_number || '—'}</strong> • Giới tính:{' '}
                    {rentalDetail.customer?.gender || '—'}
                  </p>
                  <p className="text-slate-600">
                    Địa chỉ: {rentalDetail.customer?.residence_address || '—'}
                  </p>
                </div>

                {/* Financial Balance Card */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[11px] text-slate-400">Tiền trên đơn</p>
                    <p className="text-base font-bold mt-0.5">
                      {formatVND(rentalDetail.financial_summary?.total_payable)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-emerald-400">Đã thu</p>
                    <p className="text-base font-bold text-emerald-400 mt-0.5">
                      {formatVND(rentalDetail.paid_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-rose-400">Còn phải thu</p>
                    <p className="text-base font-bold text-rose-400 mt-0.5">
                      {formatVND(rentalDetail.remaining_balance)}
                    </p>
                  </div>
                </div>

                {/* Quick Collect Payment Form */}
                {rentalDetail.remaining_balance > 0 && (
                  <form
                    onSubmit={handleAddPayment}
                    className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <Wallet className="h-4 w-4 text-emerald-600" />
                      Thu tiền công nợ đơn thuê
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="number"
                        min={1000}
                        value={payAmount}
                        onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                        placeholder="Số tiền thu"
                        className="h-10 px-3 rounded-xl border border-emerald-300 bg-white text-sm font-bold"
                      />
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-semibold"
                      >
                        <option value="bank_transfer">Chuyển khoản</option>
                        <option value="cash">Tiền mặt</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      Xác nhận Thu {formatVND(payAmount)}
                    </button>
                  </form>
                )}

                {/* Quick Extend Rental Form */}
                {rentalDetail.status === 'active' && (
                  <form
                    onSubmit={handleExtendRental}
                    className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                      <CalendarPlus className="h-4 w-4 text-blue-600" />
                      Gia hạn thêm ngày thuê
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">
                          Số ngày gia hạn thêm
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={extraDays}
                          onChange={(e) => setExtraDays(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full h-10 px-3 rounded-xl border border-blue-300 bg-white text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">
                          Tiền khách trả ngay (VNĐ)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={50000}
                          value={extendPaid}
                          onChange={(e) => setExtendPaid(Number(e.target.value) || 0)}
                          className="w-full h-10 px-3 rounded-xl border border-blue-300 bg-white text-sm font-bold"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                    >
                      Gia hạn thêm {extraDays} ngày
                    </button>
                  </form>
                )}

                {/* Link to Return Vehicle */}
                {rentalDetail.status === 'active' && (
                  <Link
                    href={`/returns?q=${rentalDetail.code}`}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <CornerDownLeft className="h-4 w-4 text-amber-400" />
                    <span>Chuyển sang Trả xe & Quyết toán hợp đồng này</span>
                  </Link>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

