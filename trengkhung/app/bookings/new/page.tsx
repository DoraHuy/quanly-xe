'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'motion/react';
import { CalendarPlus } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import type { Asset } from '@/core/domain/types';

export default function NewBookingPage() {
  const router = useRouter();
  const { data: assetsData } = useSWR('/api/assets?status=available&limit=100', swrFetcher);
  const assets: Asset[] = assetsData?.items || [];

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupAt, setPickupAt] = useState('');
  const [durationDays, setDurationDays] = useState<number>(1);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/api/bookings', {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        pickup_at: pickupAt || new Date().toISOString(),
        duration_days: durationDays || 1,
        deposit_amount: depositAmount || 0,
        delivery_required: Boolean(deliveryAddress.trim()),
        delivery_address: deliveryAddress.trim() || undefined,
        asset_ids: selectedAssetIds,
        notes: notes.trim() || undefined,
      });
      router.push('/bookings');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarPlus className="h-6 w-6 text-emerald-600" />
            Tạo Lịch Đặt Xe Trước (Booking)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ghi nhận thông tin khách đặt giữ xe và tiền cọc giữ chỗ
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên khách hàng <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn A"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số điện thoại / Zalo <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: 0905xxxxxx"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Thời gian nhận xe dự kiến
              </label>
              <input
                type="datetime-local"
                value={pickupAt}
                onChange={(e) => setPickupAt(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Số ngày dự kiến thuê
              </label>
              <input
                type="number"
                min={1}
                value={durationDays || ''}
                onChange={(e) => setDurationDays(Number(e.target.value) || 1)}
                placeholder="VD: 1"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tiền cọc giữ xe (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                step={50000}
                value={depositAmount || ''}
                onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                placeholder="VD: 200000"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Địa chỉ giao xe tận nơi (Nếu có)
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="VD: Sảnh khách sạn..."
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Chọn xe giữ chỗ ({selectedAssetIds.length} xe đã chọn)
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
              {assets.map((a) => {
                const selected = selectedAssetIds.includes(a.id);
                return (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    key={a.id}
                    onClick={() =>
                      setSelectedAssetIds(
                        selected
                          ? selectedAssetIds.filter((id) => id !== a.id)
                          : [...selectedAssetIds, a.id],
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {a.name} ({a.qr_code})
                  </motion.button>
                );
              })}
              {assets.length === 0 && (
                <p className="text-xs text-slate-400 py-2">Hiện không có xe sẵn sàng trong kho</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Yêu cầu riêng của khách..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <CalendarPlus className="h-4 w-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu Lịch Đặt Xe'}</span>
          </motion.button>
        </form>
      </div>
    </AppShell>
  );
}
