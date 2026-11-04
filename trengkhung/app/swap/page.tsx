'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { ArrowLeftRight, CheckCircle2, AlertCircle, History } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import { formatDateTimeVN, type Asset } from '@/core/domain/types';

export default function SwapAssetPage() {
  const { data: rentedData, mutate: mutateRented } = useSWR(
    '/api/assets?status=rented&limit=100',
    swrFetcher,
  );
  const { data: availableData, mutate: mutateAvail } = useSWR(
    '/api/assets?status=available&limit=100',
    swrFetcher,
  );
  const { data: swapHistory, mutate: mutateHistory } = useSWR('/api/swap', swrFetcher);

  const rentedAssets: Asset[] = rentedData?.items || [];
  const availableAssets: Asset[] = availableData?.items || [];

  const [oldAssetId, setOldAssetId] = useState('');
  const [newAssetId, setNewAssetId] = useState('');
  const [oldAssetStatus, setOldAssetStatus] = useState<'available' | 'maintenance'>('available');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldAssetId || !newAssetId) {
      setError('Vui lòng chọn tài sản đang thuê và tài sản mới thay thế');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post('/api/swap', {
        old_asset_id: oldAssetId,
        new_asset_id: newAssetId,
        old_asset_status: oldAssetStatus,
        reason: reason || 'Đổi xe/pin theo yêu cầu của khách',
      });
      setSuccess('Đổi tài sản thành công! Đã cập nhật đơn thuê và trạng thái kho xe.');
      setOldAssetId('');
      setNewAssetId('');
      setReason('');
      await Promise.all([mutateRented(), mutateAvail(), mutateHistory()]);
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
            Đổi Tài Sản (Đổi Xe / Đổi Pin Giữa Kỳ)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Chuyển đổi tức thì xe hoặc pin đang trong hợp đồng thuê sang xe/pin khác đang sẵn sàng
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form
          onSubmit={handleSwap}
          className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                1. Tài sản khách đang thuê (Cần thu hồi)
              </label>
              <select
                required
                value={oldAssetId}
                onChange={(e) => setOldAssetId(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50"
              >
                <option value="">-- Chọn xe / pin đang cho thuê ({rentedAssets.length}) --</option>
                {rentedAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.qr_code}) — {a.type === 'electric_moto' ? 'Xe điện' : 'Pin'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                2. Tài sản mới bàn giao cho khách (Đang trống)
              </label>
              <select
                required
                value={newAssetId}
                onChange={(e) => setNewAssetId(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-emerald-300 text-sm font-semibold bg-emerald-50/30"
              >
                <option value="">-- Chọn xe / pin sẵn sàng ({availableAssets.length}) --</option>
                {availableAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.qr_code}) — {a.type === 'electric_moto' ? 'Xe điện' : 'Pin'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Trạng thái tài sản cũ sau khi nhận về
              </label>
              <select
                value={oldAssetStatus}
                onChange={(e) => setOldAssetStatus(e.target.value as 'available' | 'maintenance')}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="available">Sẵn sàng cho thuê tiếp (Available)</option>
                <option value="maintenance">Đưa vào Bảo trì / Sửa chữa (Maintenance)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Lý do đổi tài sản
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Khách đổi pin đầy / Xe cần kiểm tra phanh..."
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>{loading ? 'Đang thực hiện đổi...' : 'Xác nhận Đổi Tài sản'}</span>
          </button>
        </form>

        {/* Recent Swaps History */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-blue-600" />
            Lịch sử Đổi Tài Sản Gần Đây
          </h2>

          {!swapHistory || swapHistory.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Chưa có lịch sử đổi tài sản.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Thời gian</th>
                    <th className="py-3 px-3">Đơn thuê / Khách</th>
                    <th className="py-3 px-3">Tài sản cũ</th>
                    <th className="py-3 px-3">Tài sản mới</th>
                    <th className="py-3 px-3">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {swapHistory.map(
                    (s: {
                      id: string;
                      createdAt: string;
                      reason: string;
                      oldAsset: { name: string; qrCode: string };
                      newAsset: { name: string; qrCode: string };
                      rental: { code: string; customer?: { name: string } };
                    }) => (
                      <tr key={s.id}>
                        <td className="py-3 px-3 text-xs text-slate-500">
                          {formatDateTimeVN(s.createdAt)}
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          {s.rental?.code} • {s.rental?.customer?.name}
                        </td>
                        <td className="py-3 px-3 text-rose-600 font-medium">
                          {s.oldAsset?.name} ({s.oldAsset?.qrCode})
                        </td>
                        <td className="py-3 px-3 text-emerald-600 font-bold">
                          → {s.newAsset?.name} ({s.newAsset?.qrCode})
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600">{s.reason}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

