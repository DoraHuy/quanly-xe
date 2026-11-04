'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
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
        reason: reason.trim() || undefined,
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-7 w-7 text-emerald-600" />
            Đổi Tài Sản (Đổi Xe / Đổi Pin Giữa Kỳ)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Chuyển đổi tức thì xe hoặc pin đang trong hợp đồng thuê sang xe/pin khác đang sẵn sàng
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={handleSwap}
          className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Old Asset Selection */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                1. Chọn Tài sản đang cho thuê cần đổi
              </label>
              <select
                value={oldAssetId}
                onChange={(e) => setOldAssetId(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Chọn xe hoặc pin đang thuê ({rentedAssets.length} món) --</option>
                {rentedAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.type === 'electric_moto' ? '🛵 Xe điện' : '🔋 Pin'}: {a.name} ({a.qr_code})
                  </option>
                ))}
              </select>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Trạng thái của tài sản cũ sau khi nhận lại:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOldAssetStatus('available')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      oldAssetStatus === 'available'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Vẫn bình thường (Sẵn sàng)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOldAssetStatus('maintenance')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      oldAssetStatus === 'maintenance'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Cần sửa chữa (Bảo trì)
                  </button>
                </div>
              </div>
            </div>

            {/* New Asset Selection */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-900">
                2. Chọn Tài sản mới thay thế (Đang sẵn sàng trong kho)
              </label>
              <select
                value={newAssetId}
                onChange={(e) => setNewAssetId(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-emerald-300 bg-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="">
                  -- Chọn xe hoặc pin sẵn sàng ({availableAssets.length} món) --
                </option>
                {availableAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.type === 'electric_moto' ? '🛵 Xe điện' : '🔋 Pin'}: {a.name} ({a.qr_code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Hệ thống sẽ tự động cập nhật hợp đồng thuê tương ứng và bàn giao tài sản mới cho khách.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Lý do đổi tài sản
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Xe cũ hết pin muốn đổi xe đầy bình, xe bị thủng lốp..."
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>{loading ? 'Đang xử lý đổi tài sản...' : 'Xác nhận Đổi Tài Sản Ngay'}</span>
          </motion.button>
        </form>

        {/* Swap History */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600" />
            Lịch sử Đổi Xe & Pin
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Tài sản cũ</th>
                  <th className="px-4 py-3">Tài sản mới</th>
                  <th className="px-4 py-3">Lý do</th>
                  <th className="px-4 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {swapHistory?.swaps?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{s.rental?.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {s.rental?.customer?.name}
                    </td>
                    <td className="px-4 py-3 text-rose-600 font-medium">{s.old_asset?.name}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">{s.new_asset?.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.reason || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDateTimeVN(s.created_at)}
                    </td>
                  </tr>
                ))}
                {(!swapHistory?.swaps || swapHistory.swaps.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Chưa có lượt đổi tài sản nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
