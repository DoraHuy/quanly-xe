'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Search, UserPlus, Users, Phone, CreditCard, MapPin } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import { formatVND, formatDateVN, type Customer } from '@/core/domain/types';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('Nam');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, mutate } = useSWR(
    `/api/customers?search=${encodeURIComponent(search)}&limit=50`,
    swrFetcher,
  );
  const customers: Customer[] = data?.items || [];

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiClient.post('/api/customers', {
        name,
        id_number: idNumber,
        birth_date: birthDate || undefined,
        gender,
        phone,
        residence_address: address,
      });
      setName('');
      setIdNumber('');
      setBirthDate('');
      setPhone('');
      setAddress('');
      setShowAdd(false);
      await mutate();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Quản lý Hồ sơ Khách hàng
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Lưu trữ thông tin CCCD, kênh liên hệ, lịch sử thuê xe và công nợ của từng khách hàng
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center gap-2 self-start transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Thêm khách hàng</span>
          </button>
        </div>

        {showAdd && (
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Họ và tên *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: NGUYỄN VĂN A"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Số CCCD / Hộ chiếu
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="12 số CCCD"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Số điện thoại / Zalo
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0905..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày sinh</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Giới tính</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Địa chỉ thường trú
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Địa chỉ trên CCCD"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Lưu hồ sơ khách hàng
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="relative max-w-md mb-4">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên khách, số CCCD, SĐT, địa chỉ..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customers.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-slate-50/40 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      {c.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {c.rental_count || 0} lần thuê
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                      CCCD: <strong className="font-mono">{c.id_number || 'Chưa cập nhật'}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      Liên hệ: <strong>{c.phone || '—'}</strong>
                    </span>
                    {c.birth_date && <span>NS: {formatDateVN(c.birth_date)}</span>}
                  </div>
                  {c.residence_address && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {c.residence_address}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Tổng chi tiêu: <strong className="text-slate-900">{formatVND(c.total_spent)}</strong>
                  </span>
                  {(c.outstanding_balance || 0) > 0 ? (
                    <span className="font-bold text-rose-600">
                      Còn nợ: {formatVND(c.outstanding_balance)}
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Không nợ đọng</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

