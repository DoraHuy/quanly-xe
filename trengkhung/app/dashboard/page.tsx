'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Shield,
  Bike,
  BatteryCharging,
  Clock,
  FilePlus2,
  CornerDownLeft,
  ArrowLeftRight,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { swrFetcher } from '@/core/infrastructure/api-client';
import { formatVND, formatDateTimeVN } from '@/core/domain/types';

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Toàn thời gian' },
  { value: 'day', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chỉnh ngày' },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [chartTab, setChartTab] = useState<'week' | 'month'>('week');

  const queryParams = new URLSearchParams();
  if (period === 'custom' && fromDate && toDate) {
    queryParams.set('from', fromDate);
    queryParams.set('to', toDate);
  } else {
    queryParams.set('period', period);
  }

  const { data, isLoading, mutate } = useSWR(
    `/api/dashboard?${queryParams.toString()}`,
    swrFetcher,
    { refreshInterval: 20000 },
  );

  const metrics = data?.metrics || {
    activeRentals: 0,
    rentedVehiclesCount: 0,
    availableAssets: 0,
    overdueRentals: 0,
    overdueCashflowCount: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    collectedRevenue: 0,
    outstandingRevenue: 0,
    heldDeposit: 0,
    utilizationRate: 0,
    filteredOrderCount: 0,
  };

  const assetStatusCounts = data?.assetStatusCounts || {
    available: 0,
    rented: 0,
    maintenance: 0,
    total: 0,
  };

  const assetStatusByType = data?.assetStatusByType || {
    vehicle: { available: 0, rented: 0, maintenance: 0, total: 0 },
    battery: { available: 0, rented: 0, maintenance: 0, total: 0 },
  };

  const weeklyData = data?.weeklyRevenue || [];
  const monthlyData = data?.monthlyRevenue?.[0]?.days || [];
  const milestones = data?.revenueMilestones || [];
  const attentionRentals = data?.attentionRentals || [];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Tổng quan Vận hành & Dòng tiền
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi doanh thu, công nợ, đội xe điện và các đơn thuê cần xử lý theo thời gian thực
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => mutate()}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/returns"
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 flex items-center gap-2 shadow-xs"
            >
              <CornerDownLeft className="h-4 w-4 text-amber-600" />
              <span>Trả xe</span>
            </Link>
            <Link
              href="/swap"
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 flex items-center gap-2 shadow-xs"
            >
              <ArrowLeftRight className="h-4 w-4 text-blue-600" />
              <span>Đổi xe/pin</span>
            </Link>
            <Link
              href="/rentals/new"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:from-emerald-500 hover:to-teal-500 flex items-center gap-2 shadow-md shadow-emerald-600/20"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>+ Tạo đơn thuê</span>
            </Link>
          </div>
        </div>

        {/* Time Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Lọc thời gian:
            </span>
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  period === opt.value
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 font-medium"
              />
              <span className="text-slate-400">đến</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 font-medium"
              />
            </div>
          )}
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tiền trên đơn (Tổng đơn)
              </span>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatVND(metrics.totalRevenue)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              Trên tổng số <span className="font-semibold text-slate-700">{metrics.filteredOrderCount}</span> đơn thuê trong kỳ
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Tiền đã thu (Thực thu)
              </span>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 tracking-tight">
              {formatVND(metrics.collectedRevenue)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              Tỷ lệ thu:{' '}
              <span className="font-semibold text-emerald-700">
                {metrics.totalRevenue > 0
                  ? Math.round((metrics.collectedRevenue / metrics.totalRevenue) * 100)
                  : 100}
                %
              </span>{' '}
              doanh thu trên đơn
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                Còn phải thu (Công nợ)
              </span>
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-600 tracking-tight">
              {formatVND(metrics.outstandingRevenue)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              Có <span className="font-semibold text-rose-600">{metrics.overdueCashflowCount}</span> đơn chưa thanh toán đủ
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Tiền cọc đang giữ
              </span>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 tracking-tight">
              {formatVND(metrics.heldDeposit)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              Đang tạm giữ từ các đơn thuê hoạt động
            </p>
          </motion.div>
        </div>

        {/* Operational Status Row: Active Rentals, Overdue Alerts, Asset Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Fleet & Active Rentals Status */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Trạng thái Vận hành
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Khai thác {metrics.utilizationRate}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70">
                  <p className="text-xs text-slate-400">Đơn đang thuê</p>
                  <p className="text-3xl font-bold text-white mt-1">{metrics.activeRentals}</p>
                  <p className="text-[11px] text-emerald-400 mt-1">
                    {metrics.rentedVehiclesCount} xe đang lăn bánh
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/30">
                  <p className="text-xs text-rose-300">Đơn quá hạn trả</p>
                  <p className="text-3xl font-bold text-rose-400 mt-1">{metrics.overdueRentals}</p>
                  <p className="text-[11px] text-rose-300 mt-1">
                    {metrics.overdueCashflowCount} đơn nợ dòng tiền
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Booking chờ nhận xe: <strong className="text-white">{metrics.pendingBookings}</strong>
              </span>
              <Link
                href="/rentals/action-required"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <span>Xử lý ngay</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Asset Status Breakdown */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Tình trạng Tài sản (Xe & Pin)</h2>
                <p className="text-xs text-slate-500">
                  Tổng cộng {assetStatusCounts.total} tài sản trong kho vận hành
                </p>
              </div>
              <Link
                href="/assets"
                className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <span>Quản lý kho tài sản</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                <p className="text-xs font-medium text-emerald-800">Sẵn sàng cho thuê</p>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                  {assetStatusCounts.available}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/60">
                <p className="text-xs font-medium text-blue-800">Đang cho thuê</p>
                <p className="text-2xl font-bold text-blue-600 mt-0.5">
                  {assetStatusCounts.rented}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                <p className="text-xs font-medium text-amber-800">Đang bảo trì</p>
                <p className="text-2xl font-bold text-amber-600 mt-0.5">
                  {assetStatusCounts.maintenance}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Electric Vehicles Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-2 text-slate-800">
                    <Bike className="h-4 w-4 text-emerald-600" />
                    Xe máy điện ({assetStatusByType.vehicle?.total || 0} xe)
                  </span>
                  <span className="text-slate-600">
                    Trống <strong className="text-emerald-600">{assetStatusByType.vehicle?.available || 0}</strong> • Đang thuê{' '}
                    <strong className="text-blue-600">{assetStatusByType.vehicle?.rented || 0}</strong> • Bảo trì{' '}
                    <strong className="text-amber-600">{assetStatusByType.vehicle?.maintenance || 0}</strong>
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex">
                  <div
                    style={{
                      width: `${
                        assetStatusByType.vehicle?.total
                          ? (assetStatusByType.vehicle.available / assetStatusByType.vehicle.total) * 100
                          : 0
                      }%`,
                    }}
                    className="bg-emerald-500 h-full"
                  />
                  <div
                    style={{
                      width: `${
                        assetStatusByType.vehicle?.total
                          ? (assetStatusByType.vehicle.rented / assetStatusByType.vehicle.total) * 100
                          : 0
                      }%`,
                    }}
                    className="bg-blue-500 h-full"
                  />
                  <div
                    style={{
                      width: `${
                        assetStatusByType.vehicle?.total
                          ? (assetStatusByType.vehicle.maintenance / assetStatusByType.vehicle.total) * 100
                          : 0
                      }%`,
                    }}
                    className="bg-amber-500 h-full"
                  />
                </div>
              </div>

              {/* Batteries Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-2 text-slate-800">
                    <BatteryCharging className="h-4 w-4 text-teal-600" />
                    Pin xe điện ({assetStatusByType.battery?.total || 0} viên)
                  </span>
                  <span className="text-slate-600">
                    Trống <strong className="text-emerald-600">{assetStatusByType.battery?.available || 0}</strong> • Đang thuê{' '}
                    <strong className="text-blue-600">{assetStatusByType.battery?.rented || 0}</strong>
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex">
                  <div
                    style={{
                      width: `${
                        assetStatusByType.battery?.total
                          ? (assetStatusByType.battery.available / assetStatusByType.battery.total) * 100
                          : 0
                      }%`,
                    }}
                    className="bg-emerald-500 h-full"
                  />
                  <div
                    style={{
                      width: `${
                        assetStatusByType.battery?.total
                          ? (assetStatusByType.battery.rented / assetStatusByType.battery.total) * 100
                          : 0
                      }%`,
                    }}
                    className="bg-blue-500 h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Milestones Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Biểu đồ Doanh thu (Tiền trên đơn vs Đã thu)
                </h2>
                <p className="text-xs text-slate-500">
                  Đối soát trực quan giữa doanh thu phát sinh trên đơn và dòng tiền thực thu
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setChartTab('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    chartTab === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Theo tuần (T2 - CN)
                </button>
                <button
                  onClick={() => setChartTab('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    chartTab === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Theo ngày trong tháng
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartTab === 'week' ? (
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => formatVND(Number(value))}
                      contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0' }}
                    />
                    <Legend />
                    <Bar
                      dataKey="orderRevenue"
                      name="Tiền trên đơn"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="collectedRevenue"
                      name="Tiền đã thu"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => formatVND(Number(value))}
                      contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0' }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="orderRevenue"
                      name="Tiền trên đơn"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.15}
                    />
                    <Area
                      type="monotone"
                      dataKey="collectedRevenue"
                      name="Tiền đã thu"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Milestones Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Cột mốc Doanh thu</h2>
              <p className="text-xs text-slate-500 mb-4">
                Tổng hợp nhanh theo ngày, tuần, tháng, năm
              </p>
              <div className="space-y-3">
                {milestones.map(
                  (m: {
                    label: string;
                    period: string;
                    orderRevenue: number;
                    collectedRevenue: number;
                    outstandingRevenue: number;
                    bookings: number;
                  }) => (
                    <div
                      key={m.period}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          {m.label}
                        </span>
                        <span className="text-xs text-slate-500">{m.bookings} đơn</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400">Trên đơn</p>
                          <p className="font-bold text-slate-900">{formatVND(m.orderRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-emerald-600">Đã thu</p>
                          <p className="font-bold text-emerald-600">
                            {formatVND(m.collectedRevenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-rose-600">Còn thu</p>
                          <p className="font-bold text-rose-600">
                            {formatVND(m.outstandingRevenue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Attention Required Rentals Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-600" />
                Đơn thuê Quá hạn trả & Quá hạn dòng tiền (Cần thu / Cần xử lý)
              </h2>
              <p className="text-xs text-slate-500">
                Danh sách các đơn đang quá hạn trả xe hoặc còn số dư chưa thu đủ
              </p>
            </div>
            <Link
              href="/rentals/action-required"
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Xem tất cả xử lý đơn →
            </Link>
          </div>

          {attentionRentals.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Tuyệt vời! Hiện không có đơn thuê nào quá hạn hoặc nợ dòng tiền.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Mã đơn</th>
                    <th className="py-3 px-3">Khách hàng</th>
                    <th className="py-3 px-3">Tài sản thuê</th>
                    <th className="py-3 px-3">Hạn trả xe</th>
                    <th className="py-3 px-3 text-right">Tiền trên đơn</th>
                    <th className="py-3 px-3 text-right">Đã thu</th>
                    <th className="py-3 px-3 text-right">Còn phải thu</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attentionRentals.map(
                    (r: {
                      id: string;
                      code: string;
                      customerName: string;
                      totalAmount: number;
                      paidAmount: number;
                      remainingBalance: number;
                      expectedReturnAt: string;
                      isOverdueReturn: boolean;
                      assets: Array<{ name: string; qrCode: string }>;
                    }) => (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-slate-900">{r.code}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{r.customerName}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {r.assets.map((a) => (
                              <span
                                key={a.qrCode}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold"
                              >
                                {a.name} ({a.qrCode})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              r.isOverdueReturn
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {formatDateTimeVN(r.expectedReturnAt)}
                            {r.isOverdueReturn && ' (Quá hạn)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold">
                          {formatVND(r.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-600 font-semibold">
                          {formatVND(r.paidAmount)}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-600 font-bold">
                          {formatVND(r.remainingBalance)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/rentals?highlight=${r.id}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
                          >
                            Xử lý / Thu tiền
                          </Link>
                        </td>
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

