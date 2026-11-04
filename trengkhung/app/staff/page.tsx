'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import { formatDateTimeVN } from '@/core/domain/types';
import { UserCog, Plus, ShieldCheck, UserCheck, Loader2, X } from 'lucide-react';

interface StaffItem {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function StaffPage() {
  const { data: staffList, mutate, isLoading } = useSWR<StaffItem[]>('/staff', swrFetcher);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: '',
    name: '',
    phone: '',
    role: 'staff',
    password: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/staff', {
        username: form.username.trim(),
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        password: form.password,
      });
      await mutate();
      setShowModal(false);
      setForm({ username: '', name: '', phone: '', role: 'staff', password: '' });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Lỗi tạo tài khoản nhân viên');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <UserCog className="w-6 h-6 text-emerald-600" />
              Quản lý Nhân sự & Phân quyền
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Danh sách quản trị viên (Manager) và nhân viên vận hành cửa hàng (Staff)
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm nhân viên
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
                    <th className="px-5 py-3.5">Tên đăng nhập</th>
                    <th className="px-5 py-3.5">Họ và tên</th>
                    <th className="px-5 py-3.5">Số điện thoại</th>
                    <th className="px-5 py-3.5">Vai trò</th>
                    <th className="px-5 py-3.5">Ngày tạo</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList?.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{s.username}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{s.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{s.phone || '—'}</td>
                      <td className="px-5 py-3.5">
                        {s.role === 'manager' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                            <ShieldCheck className="w-3.5 h-3.5" /> Quản lý (Manager)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                            <UserCheck className="w-3.5 h-3.5" /> Nhân viên (Staff)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDateTimeVN(s.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          Đang hoạt động
                        </span>
                      </td>
                    </tr>
                  ))}
                  {staffList?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Chưa có nhân viên nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
                  <h3 className="text-lg font-bold text-slate-900">Tạo tài khoản nhân viên</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên đăng nhập <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="VD: staff02"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="Nguyễn Văn B"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="0909xxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Vai trò</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="staff">Nhân viên vận hành (Staff)</option>
                      <option value="manager">Quản trị viên (Manager)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mật khẩu khởi tạo <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="Tối thiểu 6 ký tự"
                    />
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
                      {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
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
