'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { Bike, BatteryCharging, Plus, Search, QrCode, Wrench, CheckCircle2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import type { Asset } from '@/core/domain/types';

export default function AssetsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('electric_moto');
  const [newQr, setNewQr] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [saving, setSaving] = useState(false);

  const queryParams = new URLSearchParams();
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  if (typeFilter !== 'all') queryParams.set('type', typeFilter);
  if (search.trim()) queryParams.set('search', search.trim());
  queryParams.set('limit', '200');

  const { data, mutate } = useSWR(`/api/assets?${queryParams.toString()}`, swrFetcher);
  const assets: Asset[] = data?.items || [];

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await apiClient.post('/api/assets', {
        name: newName,
        type: newType,
        qr_code: newQr || undefined,
        license_plate: newPlate || undefined,
      });
      setNewName('');
      setNewQr('');
      setNewPlate('');
      setShowAdd(false);
      await mutate();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async (asset: Asset) => {
    if (asset.status === 'rented') {
      alert('Tài sản đang cho thuê, vui lòng thực hiện Trả xe hoặc Đổi tài sản trước.');
      return;
    }
    const nextStatus = asset.status === 'maintenance' ? 'available' : 'maintenance';
    await apiClient.patch(`/api/assets/${asset.id}`, { status: nextStatus });
    await mutate();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Quản lý Kho Tài sản (Xe máy điện & Pin)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi tình trạng từng xe, mã định danh QR và quản lý bảo trì kỹ thuật
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center gap-2 self-start transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>+ Thêm xe / pin mới</span>
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleAddAsset}
              className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 overflow-hidden"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tên xe / Mã hiệu *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: R26 (Xanh)"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Phân loại tài sản
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="electric_moto">Xe máy điện</option>
                  <option value="battery">Pin rời</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mã QR (Để trống sẽ tự sinh)
                </label>
                <input
                  type="text"
                  value={newQr}
                  onChange={(e) => setNewQr(e.target.value)}
                  placeholder="VD: XE-889900"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Biển số xe
                </label>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  placeholder="VD: 43MĐ1-12345"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  Lưu tài sản
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'available', label: 'Sẵn sàng' },
              { value: 'rented', label: 'Đang thuê' },
              { value: 'maintenance', label: 'Bảo trì' },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  statusFilter === s.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s.label}
              </button>
            ))}

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
            >
              <option value="all">Mọi loại tài sản</option>
              <option value="electric_moto">Xe máy điện</option>
              <option value="battery">Pin xe điện</option>
            </select>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên xe, mã QR, biển số..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {assets.map((asset) => {
            const isMoto = asset.type === 'electric_moto';
            return (
              <div
                key={asset.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-slate-900 flex items-center gap-2">
                      {isMoto ? (
                        <Bike className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <BatteryCharging className="h-4 w-4 text-teal-600" />
                      )}
                      {asset.name}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        asset.status === 'available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : asset.status === 'rented'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {asset.status === 'available'
                        ? 'Sẵn sàng'
                        : asset.status === 'rented'
                          ? 'Đang thuê'
                          : 'Bảo trì'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500 mt-1.5 flex items-center gap-1">
                    <QrCode className="h-3.5 w-3.5 text-slate-400" />
                    {asset.qr_code}
                    {asset.license_plate ? ` • ${asset.license_plate}` : ''}
                  </p>
                </div>

                {asset.status !== 'rented' && (
                  <button
                    onClick={() => handleToggleMaintenance(asset)}
                    className="w-full py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center justify-center gap-1.5"
                  >
                    {asset.status === 'maintenance' ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Hoàn tất bảo trì → Sẵn sàng</span>
                      </>
                    ) : (
                      <>
                        <Wrench className="h-3.5 w-3.5 text-amber-600" />
                        <span>Đưa vào bảo trì</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

