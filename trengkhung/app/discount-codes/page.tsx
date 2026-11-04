'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import { formatVND, DiscountCode } from '@/core/domain/types';
import { Percent, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, X } from 'lucide-react';

export default function DiscountCodesPage() {
  const { data: codes, mutate, isLoading } = useSWR<DiscountCode[]>('/discount-codes', swrFetcher);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'fixed_Per_Day',
    discount_value: '',
    min_days: 1,
    max_uses: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/discount-codes', {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_days: Number(form.min_days) || 1,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
      });
      await mutate();
      setShowModal(false);
      setForm({
        code: '',
        description: '',
        discount_type: 'fixed_Per_Day',
        discount_value: '',
        min_days: 1,
        max_uses: '',
      });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể tạo mã giảm giá');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: DiscountCode) => {
    try {
      await apiClient.patch(`/discount-codes/${item.id}`, {
        is_active: !item.is_active,
      });
      await mutate();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    try {
      await apiClient.delete(`/discount-codes/${id}`);
      await mutate();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể xóa mã giảm giá');
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
              Quản lý mã ưu đãi theo phần trăm, giảm cố định trên đơn hoặc giảm theo từng ngày thuê
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
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
                    <th className="px-5 py-3.5">Mô tả</th>
                    <th className="px-5 py-3.5">Loại ưu đãi</th>
                    <th className="px-5 py-3.5">Số ngày tối thiểu</th>
                    <th className="px-5 py-3.5">Lượt dùng</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {codes?.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-700">{c.code}</td>
                      <td className="px-5 py-3.5 text-slate-700">{c.description || '—'}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {c.discount_type === 'percentage'
                          ? `Giảm ${c.discount_value}%`
                          : c.discount_type === 'fixed_Per_Day'
                          ? `Giảm ${formatVND(c.discount_value)}/ngày`
                          : `Giảm ${formatVND(c.discount_value)}`}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{c.min_days} ngày</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {c.used_count} / {c.max_uses ?? '∞'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggle(c)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            c.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {c.is_active ? (
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
                  ))}
                  {codes?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
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
                  <h3 className="text-lg font-bold text-slate-900">Tạo mã giảm giá mới</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mã Code</label>
                    <input
                      type="text"
                      placeholder="VD: GIAMGIA20K"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm uppercase font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả</label>
                    <input
                      type="text"
                      placeholder="Mô tả ưu đãi"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Loại giảm</label>
                      <select
                        value={form.discount_type}
                        onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option value="fixed_Per_Day">Giảm VNĐ/ngày</option>
                        <option value="percentage">Phần trăm (%)</option>
                        <option value="fixed">Giảm cố định (VNĐ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Giá trị</label>
                      <input
                        type="number"
                        placeholder="VD: 20000 hoặc 10"
                        value={form.discount_value}
                        onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Số ngày tối thiểu</label>
                      <input
                        type="number"
                        min={1}
                        value={form.min_days}
                        onChange={(e) => setForm({ ...form, min_days: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Giới hạn lượt dùng</label>
                      <input
                        type="number"
                        placeholder="Để trống = Không giới hạn"
                        value={form.max_uses}
                        onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 cursor-pointer"
                    >
                      {submitting ? 'Đang lưu...' : 'Tạo mã'}
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
