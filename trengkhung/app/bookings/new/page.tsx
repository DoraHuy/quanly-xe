'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
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
  const [durationDays, setDurationDays] = useState(3);
  const [depositAmount, setDepositAmount] = useState(200000);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/api/bookings', {
        customer_name: customerName,
        customer_phone: customerPhone,
        pickup_at: pickupAt || new Date().toISOString(),
        duration_days: durationDays,
        deposit_amount: depositAmount,
        delivery_required: Boolean(deliveryAddress.trim()),
        delivery_address: deliveryAddress || undefined,
        asset_ids: selectedAssetIds,
        notes,
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
          <h1 className="text-2xl font-bold text-slate-900">Tạo Lịch Đặt Xe Trước (Booking)</h1>
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tên khách hàng *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Số điện thoại / Zalo *
              </label>
              <input
                type="text"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm"
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
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Số ngày dự kiến thuê
              </label>
              <input
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value) || 1)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm"
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
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-bold"
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
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Chọn xe giữ chỗ ({selectedAssetIds.length} xe)
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
              {assets.map((a) => {
                const selected = selectedAssetIds.includes(a.id);
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() =>
                      setSelectedAssetIds(
                        selected
                          ? selectedAssetIds.filter((id) => id !== a.id)
                          : [...selectedAssetIds, a.id],
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      selected
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {a.name} ({a.qr_code})
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <CalendarPlus className="h-4 w-4" />
            <span>Lưu Lịch Đặt Xe</span>
          </button>
        </form>
      </div>
    </AppShell>
  );
}

