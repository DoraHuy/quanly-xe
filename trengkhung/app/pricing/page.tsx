'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import { formatVND, formatDateTimeVN, PricingConfig } from '@/core/domain/types';
import { Tag, Plus, CheckCircle2, Clock, AlertTriangle, Loader2, Sparkles } from 'lucide-react';

export default function PricingPage() {
  const { data: activePricing, mutate: mutateActive } = useSWR<PricingConfig>('/pricing/active', swrFetcher);
  const { data: versions, mutate: mutateVersions } = useSWR<PricingConfig[]>('/pricing/versions', swrFetcher);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    default_price_per_day: 150000,
    tier_4d: 130000,
    tier_7d: 110000,
    tier_15d: 70000,
    month_30d: 2100000,
    extra_day: 70000,
    late_fee_grace_hours: 1,
    late_fee_hourly_amount: 20000,
    late_fee_hourly_max_hours: 8,
    notes: 'Cập nhật cấu hình bảng giá thuê xe điện',
  });

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/pricing/versions', {
        default_price_per_day: Number(form.default_price_per_day),
        tiers: [
          { min_days: 4, price_per_day: Number(form.tier_4d) },
          { min_days: 7, price_per_day: Number(form.tier_7d) },
          { min_days: 15, price_per_day: Number(form.tier_15d) },
        ],
        month_days: 30,
        price_per_month: Number(form.month_30d),
        price_per_extra_day: Number(form.extra_day),
        late_fee_grace_hours: Number(form.late_fee_grace_hours),
        late_fee_hourly_amount: Number(form.late_fee_hourly_amount),
        late_fee_hourly_max_hours: Number(form.late_fee_hourly_max_hours),
        note: form.notes,
      });
      await Promise.all([mutateActive(), mutateVersions()]);
      setShowModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Lỗi tạo phiên bản giá mới');
    } finally {
      setSubmitting(false);
    }
  };

  const activeTiers = activePricing?.tiers || activePricing?.price_tiers || [];
  const activeVersionNum = activePricing?.version_number ?? activePricing?.version ?? 1;
  const activeMonthDays = activePricing?.month_days ?? activePricing?.month_package_min_days ?? 30;
  const activeMonthPrice = activePricing?.price_per_month ?? activePricing?.month_package_price ?? 2100000;
  const activeExtraDay = activePricing?.price_per_extra_day ?? activePricing?.extra_day_price ?? 70000;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Tag className="w-6 h-6 text-emerald-600" />
              Bảng giá & Phụ phí trả trễ
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Quản lý bậc thang giá thuê theo ngày, gói tháng 30 ngày và quy tắc tính phí quá hạn tự động
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tạo phiên bản giá mới
          </button>
        </div>

        {/* Active Pricing Highlight */}
        {activePricing ? (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5" />
                <span className="font-bold text-base">
                  Phiên bản đang áp dụng: v{activeVersionNum}
                </span>
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-medium">
                  Active
                </span>
              </div>
              <span className="text-xs text-emerald-100">
                Cập nhật: {formatDateTimeVN(activePricing.created_at || activePricing.effective_from)}
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Daily Tiers */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Bậc giá thuê theo ngày
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-sm font-medium text-slate-700">1 – 3 ngày (Mặc định)</span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatVND(activePricing.default_price_per_day)}/ngày
                    </span>
                  </div>
                  {activeTiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        Từ {tier.min_days} ngày trở lên
                      </span>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatVND(tier.price_per_day)}/ngày
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Package */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Gói thuê tháng ({activeMonthDays} ngày)
                </h3>
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Trọn gói {activeMonthDays} ngày</span>
                    <span className="text-lg font-extrabold text-emerald-700">
                      {formatVND(activeMonthPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-emerald-200/60">
                    <span>Ngày lẻ phát sinh sau {activeMonthDays} ngày</span>
                    <span className="font-bold text-slate-800">
                      +{formatVND(activeExtraDay)}/ngày
                    </span>
                  </div>
                </div>
                {(activePricing.note || activePricing.notes) && (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                    Ghi chú: {activePricing.note || activePricing.notes}
                  </p>
                )}
              </div>

              {/* Late Fee Rules */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quy tắc tính phí trả xe trễ
                </h3>
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Thời gian ân hạn miễn phí
                    </span>
                    <span className="font-bold text-slate-900">
                      {activePricing.late_fee_grace_hours} giờ đầu
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Phụ phí mỗi giờ trễ</span>
                    <span className="font-bold text-amber-700">
                      {formatVND(activePricing.late_fee_hourly_amount)}/giờ
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      Ngưỡng quy đổi 1 ngày thuê
                    </span>
                    <span className="font-bold text-rose-600">
                      &gt; {activePricing.late_fee_hourly_max_hours} giờ
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
          </div>
        )}

        {/* Version History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Lịch sử phiên bản bảng giá</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Phiên bản</th>
                  <th className="px-5 py-3.5">Giá mặc định</th>
                  <th className="px-5 py-3.5">Gói 30 ngày</th>
                  <th className="px-5 py-3.5">Phí trễ/giờ</th>
                  <th className="px-5 py-3.5">Ghi chú</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {versions?.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      v{v.version_number ?? v.version}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {formatVND(v.default_price_per_day)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-emerald-700">
                      {formatVND(v.price_per_month ?? v.month_package_price)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {formatVND(v.late_fee_hourly_amount)}/h (ân hạn {v.late_fee_grace_hours}h)
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{v.note || v.notes || '—'}</td>
                    <td className="px-5 py-3.5">
                      {v.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đang áp dụng
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          Lưu trữ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-900">Tạo phiên bản bảng giá mới</h3>
              <form onSubmit={handleCreateVersion} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Giá 1-3 ngày (VNĐ/ngày)
                    </label>
                    <input
                      type="number"
                      value={form.default_price_per_day}
                      onChange={(e) => setForm({ ...form, default_price_per_day: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Từ 4 ngày (VNĐ/ngày)
                    </label>
                    <input
                      type="number"
                      value={form.tier_4d}
                      onChange={(e) => setForm({ ...form, tier_4d: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Từ 7 ngày (VNĐ/ngày)
                    </label>
                    <input
                      type="number"
                      value={form.tier_7d}
                      onChange={(e) => setForm({ ...form, tier_7d: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Từ 15 ngày (VNĐ/ngày)
                    </label>
                    <input
                      type="number"
                      value={form.tier_15d}
                      onChange={(e) => setForm({ ...form, tier_15d: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Trọn gói 30 ngày (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={form.month_30d}
                      onChange={(e) => setForm({ ...form, month_30d: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Phụ phí trễ mỗi giờ (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={form.late_fee_hourly_amount}
                      onChange={(e) => setForm({ ...form, late_fee_hourly_amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú phiên bản</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submitting ? 'Đang lưu...' : 'Kích hoạt phiên bản mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
