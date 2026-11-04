'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import { formatVND } from '@/core/domain/types';
import { Percent, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, X, Tag } from 'lucide-react';

interface DiscountCodeItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  scope: string; // 'order' | 'asset_daily'
  value_type: string; // 'fixed' | 'percent'
  fixed_amount: number | null;
  percent_basis_points: number | null;
  start_date?: string | null;
  end_date?: string | null;
  active: boolean;
  is_active?: boolean;
  usage_count: number;
  created_at: string;
}

export default function DiscountCodesPage() {
  const { data: rawData, mutate, isLoading } = useSWR<any>('/api/discount-codes', swrFetcher);
  const codes: DiscountCodeItem[] = rawData?.items || (Array.isArray(rawData) ? rawData : []);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    scope: 'asset_daily', // 'asset_daily' | 'order'
    value_type: 'fixed', // 'fixed' | 'percent'
    value: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);
    try {
      const isPercent = form.value_type === 'percent';
      const numVal = Number(form.value) || 0;
      await apiClient.post('/api/discount-codes', {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim() || form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        scope: form.scope,
        value_type: form.value_type,
        fixed_amount: isPercent ? undefined : numVal,
        percent_basis_points: isPercent ? Math.round(numVal * 100) : undefined,
      });
      await mutate();
      setShowModal(false);
      setForm({
        code: '',
        name: '',
        description: '',
        scope: 'asset_daily',
        value_type: 'fixed',
        value: '',
      });
    } catch (err: any) {
      setModalError(err?.message || 'Không thể tạo mã giảm giá');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: DiscountCodeItem) => {
    const currentActive = item.active ?? item.is_active ?? true;
    try {
      await apiClient.patch(`/api/discount-codes/${item.id}`, {
        active: !currentActive,
      });
      await mutate();
    } catch (err: any) {
      alert(err?.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    try {
      await apiClient.delete(`/api/discount-codes/${id}`);
      await mutate();
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa mã giảm giá');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Percent className="w-6 h-6 text-emerald-600" />
              Mã giảm giá & Khuyến mãi
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Quản lý mã ưu đãi theo phần trăm, giảm cố định trên đơn hoặc giảm theo từng ngày thuê xe
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setModalError(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm mã giảm giá
          </motion.button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">Mã Code</th>
                    <th className="px-5 py-3.5">Tên chương trình</th>
                    <th className="px-5 py-3.5">Mô tả</th>
                    <th className="px-5 py-3.5">Mức giảm</th>
                    <th className="px-5 py-3.5">Phạm vi áp dụng</th>
                    <th className="px-5 py-3.5">Lượt đã dùng</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {codes.map((c) => {
                    const isActive = c.active ?? c.is_active ?? true;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-emerald-700">{c.code}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{c.name}</td>
                        <td className="px-5 py-3.5 text-slate-600">{c.description || '—'}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {c.value_type === 'percent'
                            ? `Giảm ${(c.percent_basis_points || 0) / 100}%`
                            : c.scope === 'asset_daily'
                            ? `Giảm ${formatVND(c.fixed_amount || 0)}/xe/ngày`
                            : `Giảm ${formatVND(c.fixed_amount || 0)}/đơn`}
                        </td>
                        <td className="px-5 py-3.5">
                          {c.scope === 'asset_daily' ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Theo xe / ngày
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              Tổng đơn thuê
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-700">
                          {c.usage_count || 0} lượt
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleToggle(c)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <ToggleRight className="w-4 h-4" /> Đang bật
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4" /> Đã tắt
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa mã"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </td>
                      </tr>
                    );
                  })}
                  {codes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                        Chưa có mã giảm giá nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-600" />
                    Tạo mã giảm giá mới
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
                    {modalError}
                  </div>
                )}

                <form onSubmit={handleCreate} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mã Code <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: GIAMGIA20K"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm uppercase font-mono font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên chương trình / Tên hiển thị <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Giảm 20k/xe/ngày"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả chi tiết</label>
                    <input
                      type="text"
                      placeholder="VD: Áp dụng cho khách hàng thuê từ 4 ngày"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phạm vi áp dụng <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <select
                        value={form.scope}
                        onChange={(e) => setForm({ ...form, scope: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 bg-white"
                      >
                        <option value="asset_daily">Mỗi xe / mỗi ngày</option>
                        <option value="order">Trên tổng hóa đơn</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kiểu chiết khấu <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <select
                        value={form.value_type}
                        onChange={(e) => setForm({ ...form, value_type: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 bg-white"
                      >
                        <option value="fixed">Số tiền cố định (VNĐ)</option>
                        <option value="percent">Phần trăm (%)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {form.value_type === 'percent' ? 'Mức giảm phần trăm (%)' : 'Số tiền giảm (VNĐ)'}{' '}
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={form.value_type === 'percent' ? 100 : 10000000}
                      step={form.value_type === 'percent' ? 1 : 5000}
                      placeholder={form.value_type === 'percent' ? 'VD: 10 (tức 10%)' : 'VD: 20000'}
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? 'Đang lưu...' : 'Tạo mã giảm giá'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
