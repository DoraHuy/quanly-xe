'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Search,
  CornerDownLeft,
  CheckCircle2,
  AlertCircle,
  Bike,
  Clock,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import { formatVND, formatDateTimeVN } from '@/core/domain/types';

interface ReturnScanData {
  rental_id: string;
  code: string;
  customer: { name: string; idNumber?: string };
  start_at: string;
  expected_return_at: string;
  duration_days: number;
  active_items: Array<{
    id: string;
    asset_id: string;
    asset_name: string;
    qr_code: string;
    asset_type: string;
    base_amount: number;
  }>;
  late_hours: number;
  suggested_late_fee: number;
  financial_preview: {
    original_total_amount: number;
    discount_amount: number;
    total_amount: number;
    late_fee: number;
    total_payable: number;
    paid_amount: number;
    remaining_to_collect: number;
    held_deposit: number;
  };
}

export default function ReturnsPage() {
  const [query, setQuery] = useState('');
  const [scanResult, setScanResult] = useState<ReturnScanData | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [lateFee, setLateFee] = useState<number>(0);
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [depositRefunded, setDepositRefunded] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: activeRentalsData, mutate } = useSWR(
    '/api/rentals?status=active&limit=30',
    swrFetcher,
  );
  const activeRentals = activeRentalsData?.rentals || [];

  const handleScanLookup = async (searchCode: string) => {
    const q = searchCode.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiClient.get(`/api/returns/scan?q=${encodeURIComponent(q)}`);
      const data: ReturnScanData = res.data.data;
      setScanResult(data);
      setSelectedItemIds(data.active_items.map((i) => i.id));
      setLateFee(data.suggested_late_fee);
      setCollectedAmount(data.financial_preview.remaining_to_collect);
      setDepositRefunded(data.financial_preview.held_deposit);
    } catch (err) {
      setError((err as Error).message);
      setScanResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanResult || selectedItemIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/returns/sessions', {
        rental_id: scanResult.rental_id,
        item_ids: selectedItemIds,
        late_fee: lateFee,
        collected_amount: collectedAmount,
        deposit_refunded: depositRefunded,
        payment_method: paymentMethod,
        notes,
      });
      setSuccessMsg(
        `Đã hoàn tất trả xe và tất toán đơn ${scanResult.code}! Trạng thái xe đã chuyển về Sẵn sàng.`,
      );
      setScanResult(null);
      setQuery('');
      await mutate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Trả Xe & Quyết Toán Hợp Đồng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quét mã QR xe, nhập tên xe (R1..R25) hoặc chọn từ danh sách đang thuê để tự động tính phí trễ và tất toán
          </p>
        </div>

        {/* Search / QR Scan Box */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <QrCode className="h-5 w-5 text-emerald-600 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScanLookup(query)}
                placeholder="Nhập mã QR xe (VD: XE-107321), tên xe (R1, R2) hoặc mã đơn (HD-...)..."
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleScanLookup(query)}
              disabled={loading}
              className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Tìm đơn cần trả</span>
            </button>
          </div>

          {/* Quick Select from Active Rentals */}
          {activeRentals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">
                Hoặc chọn nhanh đơn đang thuê ({activeRentals.length} đơn):
              </p>
              <div className="flex flex-wrap gap-2">
                {activeRentals.map(
                  (r: {
                    id: string;
                    code: string;
                    customer: { name: string };
                    next_due_items: Array<{ asset_name: string }>;
                  }) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setQuery(r.code);
                        handleScanLookup(r.code);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-xs font-semibold transition-colors"
                    >
                      {r.code} • {r.customer.name} ({r.next_due_items.map((i) => i.asset_name).join(', ')})
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2"
            >
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Settlement Form when rental is loaded */}
          {scanResult && (
            <motion.form
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onSubmit={handleConfirmReturn}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6"
            >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-600">
                  Biên bản Trả xe & Quyết toán
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {scanResult.code} — Khách: {scanResult.customer.name}
                </h2>
              </div>
              <div className="text-xs text-slate-500">
                Hạn trả dự kiến: <strong>{formatDateTimeVN(scanResult.expected_return_at)}</strong>
              </div>
            </div>

            {scanResult.late_hours > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <span>
                  Đơn thuê này trả trễ <strong>{scanResult.late_hours} giờ</strong>. Hệ thống đề xuất phụ phí trả trễ:{' '}
                  <strong>{formatVND(scanResult.suggested_late_fee)}</strong>.
                </span>
              </div>
            )}

            {/* Select Vehicles Being Returned */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Chọn tài sản bàn giao lại kho ({selectedItemIds.length}/{scanResult.active_items.length})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {scanResult.active_items.map((item) => {
                  const checked = selectedItemIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                        checked
                          ? 'bg-emerald-50 border-emerald-500'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setSelectedItemIds(selectedItemIds.filter((id) => id !== item.id));
                            } else {
                              setSelectedItemIds([...selectedItemIds, item.id]);
                            }
                          }}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        <div>
                          <p className="font-bold text-sm text-slate-900 flex items-center gap-1">
                            <Bike className="h-3.5 w-3.5 text-emerald-600" />
                            {item.asset_name}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">{item.qr_code}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {formatVND(item.base_amount)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Financial Settlement Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Phí trả xe trễ hạn (VNĐ)
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={lateFee}
                  onChange={(e) => {
                    const newLate = Number(e.target.value) || 0;
                    setLateFee(newLate);
                    const totalPayable = scanResult.financial_preview.total_amount + newLate;
                    setCollectedAmount(
                      Math.max(0, totalPayable - scanResult.financial_preview.paid_amount),
                    );
                  }}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-700 mb-1">
                  Số tiền thu tất toán (VNĐ)
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={collectedAmount}
                  onChange={(e) => setCollectedAmount(Number(e.target.value) || 0)}
                  className="w-full h-11 px-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40 text-sm font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-700 mb-1">
                  Hoàn trả tiền cọc (Đang giữ {formatVND(scanResult.financial_preview.held_deposit)})
                </label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={depositRefunded}
                  onChange={(e) => setDepositRefunded(Number(e.target.value) || 0)}
                  className="w-full h-11 px-3.5 rounded-xl border border-amber-300 bg-amber-50/40 text-sm font-bold text-amber-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Hình thức thanh toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-white font-medium"
                >
                  <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                  <option value="cash">Tiền mặt</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Ghi chú tình trạng xe khi nhận lại
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: Xe nguyên vẹn, đầy đủ sạc và mũ bảo hiểm"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || selectedItemIds.length === 0}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              <CornerDownLeft className="h-4 w-4" />
              <span>Xác nhận Nhận lại Xe & Hoàn tất Quyết toán</span>
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
      </div>
    </AppShell>
  );
}

