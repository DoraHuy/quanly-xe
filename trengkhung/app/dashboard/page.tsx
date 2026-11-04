'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: 24,
      stiffness: 280,
    },
  },
};

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
      <div className="space-y-6 sm:space-y-8">
        {/* Top Header & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Bảng điều khiển Tổng quan</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi doanh thu, đối soát dòng tiền và trạng thái đội xe thời gian thực
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
              {PERIOD_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.value}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    period === opt.value
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>

            <motion.button
              whileTap={{ rotate: 180 }}
              onClick={() => mutate()}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs cursor-pointer transition-transform"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        <AnimatePresence>
          {period === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span>Khoảng ngày tùy chỉnh:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-slate-400 text-xs">đến</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4 Financial KPI Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          {/* Tiền trên đơn */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tiền trên đơn
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatVND(metrics.totalRevenue)}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{metrics.filteredOrderCount}</span> đơn
                trong kỳ
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          </motion.div>

          {/* Tiền đã thu */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tiền đã thu
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                {formatVND(metrics.collectedRevenue)}
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <span>Thu thực tế vào quỹ</span>
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          </motion.div>

          {/* Còn phải thu */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Còn phải thu
              </span>
              <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-rose-600 tracking-tight">
                {formatVND(metrics.outstandingRevenue)}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                <span>{metrics.overdueCashflowCount} đơn nợ tiền</span>
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          </motion.div>

          {/* Tiền cọc đang giữ */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tiền cọc đang giữ
              </span>
              <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-purple-700 tracking-tight">
                {formatVND(metrics.heldDeposit)}
              </p>
              <div className="mt-1 text-xs text-slate-500">
                <span>Khoản bảo đảm hợp đồng</span>
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          </motion.div>
        </motion.div>

        {/* Operational Highlights & Asset Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Quick Operations Actions */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
              Thao tác nhanh
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/rentals/new">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex flex-col items-start gap-2 shadow-xs cursor-pointer"
                >
                  <FilePlus2 className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-bold">Tạo Đơn Thuê</p>
                    <p className="text-[11px] text-emerald-100">Quét CCCD thông minh</p>
                  </div>
                </motion.div>
              </Link>
              <Link href="/returns">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl bg-slate-900 text-white flex flex-col items-start gap-2 shadow-xs cursor-pointer"
                >
                  <CornerDownLeft className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-bold">Trả Xe Nhanh</p>
                    <p className="text-[11px] text-slate-400">Tính phí trễ & đối soát</p>
                  </div>
                </motion.div>
              </Link>
              <Link href="/swap">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-800 flex flex-col items-start gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-bold">Đổi Tài Sản</p>
                    <p className="text-[11px] text-slate-500">Đổi xe/pin giữa kỳ</p>
                  </div>
                </motion.div>
              </Link>
              <Link href="/rentals/action-required">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900 flex flex-col items-start gap-2 transition-colors cursor-pointer"
                >
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-bold">Cần Xử Lý</p>
                    <p className="text-[11px] text-amber-700">Đơn trễ & sắp đến hạn</p>
                  </div>
                </motion.div>
              </Link>
            </div>
          </div>

          {/* Operational Status */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400 mb-3">
              Chỉ số vận hành
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-2">
                  <Bike className="h-4 w-4 text-emerald-600" /> Đơn thuê đang chạy
                </span>
                <span className="text-sm font-bold text-slate-900">{metrics.activeRentals} đơn</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-rose-500" /> Đơn quá hạn trả xe
                </span>
                <span className="text-sm font-bold text-rose-600">{metrics.overdueRentals} đơn</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-sky-600" /> Đặt lịch trước (Booking)
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {metrics.pendingBookings} lịch
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Tỷ lệ khai thác xe:</span>
              <span className="font-bold text-emerald-700">{metrics.utilizationRate}%</span>
            </div>
          </div>

          {/* Asset Breakdown (Vehicle & Battery) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400 mb-3">
              Tình trạng kho tài sản
            </h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Bike className="h-4 w-4 text-slate-500" />
                    Xe điện ({assetStatusByType.vehicle.total} xe)
                  </span>
                  <span className="text-emerald-600 font-bold">
                    {assetStatusByType.vehicle.available} sẵn sàng
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(assetStatusByType.vehicle.available / (assetStatusByType.vehicle.total || 1)) * 100}%`,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="bg-emerald-500 h-full"
                    title="Sẵn sàng"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(assetStatusByType.vehicle.rented / (assetStatusByType.vehicle.total || 1)) * 100}%`,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="bg-blue-500 h-full"
                    title="Đang thuê"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(assetStatusByType.vehicle.maintenance / (assetStatusByType.vehicle.total || 1)) * 100}%`,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="bg-amber-500 h-full"
                    title="Bảo trì"
                  />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {assetStatusByType.vehicle.available} rảnh
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {assetStatusByType.vehicle.rented} đang thuê
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {assetStatusByType.vehicle.maintenance} bảo trì
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <BatteryCharging className="h-4 w-4 text-slate-500" />
                    Pin điện ({assetStatusByType.battery.total} pin)
                  </span>
                  <span className="text-emerald-600 font-bold">
                    {assetStatusByType.battery.available} sẵn sàng
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(assetStatusByType.battery.available / (assetStatusByType.battery.total || 1)) * 100}%`,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="bg-emerald-500 h-full"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(assetStatusByType.battery.rented / (assetStatusByType.battery.total || 1)) * 100}%`,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="bg-blue-500 h-full"
                  />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {assetStatusByType.battery.available} rảnh
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {assetStatusByType.battery.rented} đang gắn xe
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-right">
              <Link
                href="/assets"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
              >
                Quản lý kho tài sản <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Charts & Milestones Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Biểu đồ Doanh thu & Dòng tiền
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  So sánh tương quan giữa giá trị đơn và số tiền thực thu
                </p>
              </div>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setChartTab('week')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    chartTab === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  7 ngày gần nhất
                </button>
                <button
                  onClick={() => setChartTab('month')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    chartTab === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Xu hướng 30 ngày
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartTab === 'week' ? (
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(value) => formatVND(Number(value))}
                      contentStyle={{
                        borderRadius: '12px',
                        borderColor: '#e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(value) => formatVND(Number(value))}
                      contentStyle={{
                        borderRadius: '12px',
                        borderColor: '#e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
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
                    <motion.div
                      key={m.period}
                      whileHover={{ x: 2 }}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 transition-colors"
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
                    </motion.div>
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
              <h2 className="text-base font-bold text-slate-900">Đơn thuê cần chú ý</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các đơn đang quá hạn trả xe hoặc còn dư nợ dòng tiền cần thu
              </p>
            </div>
            <Link
              href="/rentals/action-required"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Xem toàn bộ <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Mã hợp đồng</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Tài sản thuê</th>
                  <th className="px-4 py-3">Hạn trả xe</th>
                  <th className="px-4 py-3">Còn phải thu</th>
                  <th className="px-4 py-3">Tình trạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attentionRentals.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.customerName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.assets || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTimeVN(r.expectedReturnAt)}
                    </td>
                    <td className="px-4 py-3 font-bold text-rose-600">
                      {formatVND(r.remainingBalance)}
                    </td>
                    <td className="px-4 py-3">
                      {r.isOverdueReturn ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                          Quá hạn trả xe
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          Chưa thanh toán đủ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {attentionRentals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Không có đơn thuê nào cần xử lý khẩn cấp
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
