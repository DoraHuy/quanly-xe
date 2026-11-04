'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import { formatDateTimeVN } from '@/core/domain/types';
import { UserCog, Plus, ShieldCheck, UserCheck, Loader2, X, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

interface StaffItem {
  id: string;
  username: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  active?: boolean;
  is_active?: boolean;
  created_at: string;
}

export default function StaffPage() {
  const { data: staffList, mutate, isLoading } = useSWR<StaffItem[]>('/api/staff', swrFetcher);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: '',
    name: '',
    phone: '',
    role: 'staff',
    password: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/api/staff', {
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
      setModalError(err?.message || 'Lỗi tạo tài khoản nhân viên');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: StaffItem) => {
    const currentActive = item.active ?? item.is_active ?? true;
    try {
      await apiClient.patch(`/api/staff/${item.id}`, {
        active: !currentActive,
      });
      await mutate();
    } catch (err: any) {
      alert(err?.message || 'Lỗi cập nhật trạng thái nhân viên');
    }
  };

  const handleDelete = async (item: StaffItem) => {
    if (!confirm(`Bạn có chắc muốn xóa hoặc vô hiệu hóa nhân viên "${item.name}"?`)) return;
    try {
      await apiClient.delete(`/api/staff/${item.id}`);
      await mutate();
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa nhân viên');
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
            onClick={() => {
              setModalError(null);
              setShowModal(true);
            }}
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
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList?.map((s) => {
                    const isActive = s.active ?? s.is_active ?? true;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{s.username}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{s.name}</td>
                        <td className="px-5 py-3.5 text-slate-600">{s.phone || '—'}</td>
                        <td className="px-5 py-3.5">
                          {s.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              <ShieldCheck className="w-3.5 h-3.5" /> Quản trị tối cao (Admin)
                            </span>
                          ) : s.role === 'manager' ? (
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
                          <button
                            onClick={() => handleToggle(s)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="Bấm để bật/tắt trạng thái"
                          >
                            {isActive ? (
                              <>
                                <ToggleRight className="w-3.5 h-3.5" /> Đang hoạt động
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-3.5 h-3.5" /> Tạm khóa
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(s)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa nhân viên"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </td>
                      </tr>
                    );
                  })}
                  {staffList?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
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

                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
                    {modalError}
                  </div>
                )}

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
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 bg-white"
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
