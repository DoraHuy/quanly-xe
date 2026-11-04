'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Upload,
  Sparkles,
  UserCheck,
  Bike,
  BatteryCharging,
  Search,
  Check,
  Tag,
  FileText,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, swrFetcher } from '@/core/infrastructure/api-client';
import {
  formatVND,
  calculateClientAssetPrice,
  type Asset,
  type Customer,
  type PricingConfig,
  type ExtractedCccdFields,
} from '@/core/domain/types';

export default function NewRentalPage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Fetch available assets, active pricing, and customers
  const { data: assetsData } = useSWR('/api/assets?status=available&limit=200', swrFetcher);
  const { data: pricing } = useSWR<PricingConfig>('/api/pricing/active', swrFetcher);
  const { data: customersData } = useSWR('/api/customers?limit=50', swrFetcher);
  const { data: discountData } = useSWR('/api/discount-codes', swrFetcher);

  const availableAssets: Asset[] = assetsData?.items || [];
  const existingCustomers: Customer[] = customersData?.items || [];
  const activeDiscounts = (discountData?.items || []).filter((d: { active: boolean }) => d.active);

  // Customer form state
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState('');
  const [idType, setIdType] = useState('cccd');
  const [idNumber, setIdNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('Nam');
  const [nationality, setNationality] = useState('Việt Nam');
  const [placeOfOrigin, setPlaceOfOrigin] = useState('');
  const [residenceAddress, setResidenceAddress] = useState('');
  const [contactChannel, setContactChannel] = useState('phone');
  const [contactValue, setContactValue] = useState('');

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const [documentImageId, setDocumentImageId] = useState<string | undefined>(undefined);
  const [ocrMatches, setOcrMatches] = useState<ExtractedCccdFields | null>(null);
  const [ocrHighlight, setOcrHighlight] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  // Rental configuration state
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [durationDays, setDurationDays] = useState<number>(1);
  const [discountCode, setDiscountCode] = useState('');
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [surchargeAmount, setSurchargeAmount] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [prepaymentAmount, setPrepaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showContractModal, setShowContractModal] = useState(false);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const applyExtractedOcrFields = (
    fields: ExtractedCccdFields,
    existingCust?: Customer | null,
  ) => {
    setOcrMatches(fields);
    if (fields.name) setCustomerName(fields.name);
    if (fields.id_type) setIdType(fields.id_type);
    if (fields.id_number) setIdNumber(fields.id_number);
    if (fields.birth_date) setBirthDate(fields.birth_date);
    if (fields.gender) setGender(fields.gender);
    if (fields.nationality) setNationality(fields.nationality);
    if (fields.place_of_origin) setPlaceOfOrigin(fields.place_of_origin);
    if (fields.residence_address) setResidenceAddress(fields.residence_address);

    if (fields.name) clearFieldError('customerName');
    if (fields.id_number) clearFieldError('idNumber');
    if (existingCust?.phone) clearFieldError('contactValue');

    if (existingCust) {
      setCustomerId(existingCust.id);
      if (existingCust.phone) setContactValue(existingCust.phone);
      setOcrNotice(
        `Đã nhận diện CCCD của khách quen "${existingCust.name}" và tự động điền thông tin!`,
      );
    } else {
      setOcrNotice(
        `Bóc tách thành công (${fields.source_method === 'qr' ? 'Mã QR CCCD' : 'Thuật toán my_cccd.py OCR'})! Đã tự động điền vào biểu mẫu.`,
      );
    }

    setOcrHighlight(true);
    setTimeout(() => setOcrHighlight(false), 2500);
  };

  const handleOcrFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    sourceOption: 'camera' | 'upload',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrPreviewUrl(URL.createObjectURL(file));
    setOcrLoading(true);
    setError(null);
    setOcrNotice(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('source_option', sourceOption);

      const res = await apiClient.post('/api/document-ocr/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data.data;
      setDocumentImageId(data.document_image_id);
      applyExtractedOcrFields(data.fields, data.existing_customer);
    } catch (err) {
      setError((err as Error).message || 'Không thể đọc ảnh CCCD');
    } finally {
      setOcrLoading(false);
    }
  };

  const toggleAsset = (asset: Asset) => {
    clearFieldError('selectedAssets');
    if (selectedAssets.some((a) => a.id === asset.id)) {
      setSelectedAssets(selectedAssets.filter((a) => a.id !== asset.id));
    } else {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  // Real-time financial calculations
  const motoCount = selectedAssets.filter((a) => a.type === 'electric_moto').length;
  const pricePerMoto = calculateClientAssetPrice(durationDays, pricing);
  const originalTotalAmount = pricePerMoto.totalAmount * motoCount;

  const matchedDiscount = activeDiscounts.find(
    (d: { code: string }) => d.code.toUpperCase() === discountCode.trim().toUpperCase(),
  );

  let computedDiscountAmount = Math.max(0, Number(customDiscount) || 0);
  if (!computedDiscountAmount && matchedDiscount) {
    if (matchedDiscount.value_type === 'fixed' && matchedDiscount.fixed_amount) {
      computedDiscountAmount =
        matchedDiscount.scope === 'asset_daily'
          ? matchedDiscount.fixed_amount * Math.max(1, motoCount) * Math.max(1, durationDays)
          : matchedDiscount.fixed_amount;
    } else if (
      matchedDiscount.value_type === 'percent' &&
      matchedDiscount.percent_basis_points
    ) {
      computedDiscountAmount = Math.round(
        (originalTotalAmount * matchedDiscount.percent_basis_points) / 10000,
      );
    }
  }
  computedDiscountAmount = Math.min(originalTotalAmount, computedDiscountAmount);

  const netTotalAmount =
    originalTotalAmount - computedDiscountAmount + Math.max(0, Number(surchargeAmount) || 0);
  const remainingBalance = Math.max(0, netTotalAmount - (Number(prepaymentAmount) || 0));

  const filteredAssets = availableAssets.filter((a) => {
    if (!assetSearch.trim()) return true;
    const s = assetSearch.toLowerCase();
    return (
      a.name.toLowerCase().includes(s) ||
      a.qr_code.toLowerCase().includes(s) ||
      (a.license_plate && a.license_plate.toLowerCase().includes(s))
    );
  });

  const handleSubmitRental = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errs: Record<string, string> = {};
    if (!customerName.trim()) {
      errs.customerName = 'Vui lòng nhập họ và tên khách hàng';
    }
    if (!idNumber.trim()) {
      errs.idNumber = 'Vui lòng nhập số CCCD hoặc quét ảnh thẻ';
    }
    if (!contactValue.trim()) {
      errs.contactValue = 'Vui lòng nhập số điện thoại hoặc Zalo liên hệ';
    }
    if (selectedAssets.length === 0) {
      errs.selectedAssets = 'Vui lòng chọn ít nhất 1 xe hoặc pin cho đơn thuê';
    }
    if (!durationDays || durationDays < 1) {
      errs.durationDays = 'Số ngày thuê phải từ 1 ngày trở lên';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError('Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc có dấu (*) đỏ');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/api/rentals', {
        customer: {
          id: customerId,
          name: customerName,
          id_type: idType,
          id_number: idNumber,
          birth_date: birthDate || undefined,
          gender,
          nationality,
          place_of_origin: placeOfOrigin,
          residence_address: residenceAddress,
          contact_channels: contactValue.trim()
            ? [
                {
                  channel_type: contactChannel,
                  contact_value: contactValue.trim(),
                  is_primary: true,
                },
              ]
            : [],
        },
        asset_ids: selectedAssets.map((a) => a.id),
        duration_days: durationDays,
        deposit,
        prepayment_amount: prepaymentAmount,
        payment_method: paymentMethod,
        discount_code: discountCode.trim() || undefined,
        custom_discount_amount: customDiscount || undefined,
        surcharge_amount: surchargeAmount || undefined,
        notes,
        document_image_id: documentImageId,
      });

      router.push('/rentals');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Tạo Đơn Thuê Xe Điện Mới
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Chụp/Tải ảnh CCCD để tự động điền thông tin (`my_cccd.py` + QR), chọn xe và tạo hợp đồng
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowContractModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 flex items-center gap-2 self-start"
          >
            <FileText className="h-4 w-4 text-emerald-600" />
            <span>Xem trước Hợp đồng</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmitRental} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): CCCD OCR + Customer Info + Asset Picker */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Smart CCCD OCR Scanner Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base">
                      Quét & Đọc Căn Cước Công Dân Tự Động (OCR)
                    </h2>
                    <p className="text-xs text-slate-300">
                      Tự động trích xuất thông tin khách từ mã QR CCCD hoặc nhận diện quang học tiếng Việt
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={ocrLoading}
                  className="p-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center gap-3.5 transition-all text-left cursor-pointer"
                >
                  <div className="h-11 w-11 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Chụp ảnh CCCD</p>
                    <p className="text-xs text-slate-300">Mở camera điện thoại / máy tính</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={ocrLoading}
                  className="p-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center gap-3.5 transition-all text-left cursor-pointer"
                >
                  <div className="h-11 w-11 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Tải ảnh CCCD lên</p>
                    <p className="text-xs text-slate-300">Chọn ảnh mặt trước thẻ từ thiết bị</p>
                  </div>
                </motion.button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleOcrFileChange(e, 'camera')}
                className="hidden"
              />
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleOcrFileChange(e, 'upload')}
                className="hidden"
              />

              {ocrLoading && (
                <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium flex items-center gap-2.5">
                  <div className="h-4 w-4 rounded-full border-2 border-emerald-300 border-t-transparent animate-spin" />
                  <span>Đang xử lý ảnh CCCD và bóc tách các trường theo my_cccd.py...</span>
                </div>
              )}

              {ocrNotice && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-medium flex items-start gap-2.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{ocrNotice}</p>
                    {ocrMatches?.raw_matches && ocrMatches.raw_matches.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {ocrMatches.raw_matches.map((m, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-950/60 text-[11px] text-emerald-300 border border-emerald-500/30"
                          >
                            {m.label}: {m.text.slice(0, 32)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {ocrPreviewUrl && (
                <div className="mt-4 flex items-center gap-3 bg-black/30 p-2.5 rounded-xl">
                  <img
                    src={ocrPreviewUrl}
                    alt="CCCD Preview"
                    className="h-16 w-24 object-cover rounded-lg border border-white/20"
                  />
                  <div className="text-xs flex-1">
                    <p className="font-semibold text-emerald-300">Ảnh CCCD đã đính kèm vào đơn</p>
                    <p className="text-slate-400">Sẽ được lưu trữ an toàn cùng hồ sơ thuê xe</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOcrPreviewUrl(null);
                      setDocumentImageId(undefined);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Customer Information Form */}
            <motion.div
              animate={
                ocrHighlight
                  ? { boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.5)' }
                  : { boxShadow: '0 0 0 0px rgba(16, 185, 129, 0)' }
              }
              className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  Thông tin Khách hàng
                </h2>

                {existingCustomers.length > 0 && (
                  <select
                    onChange={(e) => {
                      const c = existingCustomers.find((item) => item.id === e.target.value);
                      if (c) {
                        setCustomerId(c.id);
                        setCustomerName(c.name);
                        setIdType(c.id_type || 'cccd');
                        setIdNumber(c.id_number || '');
                        setBirthDate(
                          c.birth_date ? new Date(c.birth_date).toISOString().slice(0, 10) : '',
                        );
                        setGender(c.gender || 'Nam');
                        setNationality(c.nationality || 'Việt Nam');
                        setPlaceOfOrigin(c.place_of_origin || '');
                        setResidenceAddress(c.residence_address || '');
                        setContactValue(c.phone || '');
                      }
                    }}
                    defaultValue=""
                    className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium"
                  >
                    <option value="" disabled>
                      -- Chọn nhanh khách quen ({existingCustomers.length}) --
                    </option>
                    {existingCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.id_number ? `- ${c.id_number}` : ''} ({c.phone || 'Chưa SĐT'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên khách hàng <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      clearFieldError('customerName');
                    }}
                    placeholder="VD: TRẦN TRUNG KIÊN"
                    className={`w-full h-11 px-3.5 rounded-xl border text-sm font-semibold transition-colors focus:outline-none ${
                      fieldErrors.customerName
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                        : 'border-slate-200 focus:border-emerald-500'
                    }`}
                  />
                  {fieldErrors.customerName && (
                    <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldErrors.customerName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Loại giấy tờ
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="cccd">Căn cước công dân (CCCD)</option>
                    <option value="passport">Hộ chiếu (Passport)</option>
                    <option value="gplx">Giấy phép lái xe (GPLX)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số CCCD / Hộ chiếu (12 số) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => {
                      setIdNumber(e.target.value);
                      clearFieldError('idNumber');
                    }}
                    placeholder="VD: 036200008935"
                    className={`w-full h-11 px-3.5 rounded-xl border text-sm font-mono transition-colors focus:outline-none ${
                      fieldErrors.idNumber
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                        : 'border-slate-200 focus:border-emerald-500'
                    }`}
                  />
                  {fieldErrors.idNumber && (
                    <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldErrors.idNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Giới tính
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Quốc tịch
                    </label>
                    <input
                      type="text"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Kênh liên hệ
                  </label>
                  <select
                    value={contactChannel}
                    onChange={(e) => setContactChannel(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="phone">Số điện thoại</option>
                    <option value="zalo">Zalo</option>
                    <option value="facebook">Facebook</option>
                    <option value="telegram">Telegram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại / Link liên hệ <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactValue}
                    onChange={(e) => {
                      setContactValue(e.target.value);
                      clearFieldError('contactValue');
                    }}
                    placeholder="VD: 0905123456 hoặc Zalo"
                    className={`w-full h-11 px-3.5 rounded-xl border text-sm transition-colors focus:outline-none ${
                      fieldErrors.contactValue
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                        : 'border-slate-200 focus:border-emerald-500'
                    }`}
                  />
                  {fieldErrors.contactValue && (
                    <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldErrors.contactValue}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Địa chỉ thường trú / Nơi lưu trú khách sạn
                  </label>
                  <input
                    type="text"
                    value={residenceAddress}
                    onChange={(e) => setResidenceAddress(e.target.value)}
                    placeholder="Tự động điền từ CCCD hoặc nhập địa chỉ khách sạn"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
            </motion.div>

            {/* Step 3: Pick Available Vehicles & Batteries */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Bike className="h-4 w-4 text-emerald-600" />
                    Chọn Tài sản Thuê <span className="text-rose-500 font-bold">*</span> ({selectedAssets.length} đã chọn)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bấm chọn xe máy điện hoặc pin đang sẵn sàng ({availableAssets.length} tài sản trống)
                  </p>
                  {fieldErrors.selectedAssets && (
                    <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldErrors.selectedAssets}
                    </p>
                  )}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Tìm tên xe (R1..R25) hoặc mã QR..."
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedAssets.some((a) => a.id === asset.id);
                  const isMoto = asset.type === 'electric_moto';
                  return (
                    <button
                      type="button"
                      key={asset.id}
                      onClick={() => toggleAsset(asset)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          {isMoto ? (
                            <Bike className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <BatteryCharging className="h-3.5 w-3.5 text-teal-600" />
                          )}
                          {asset.name}
                        </span>
                        {isSelected && (
                          <span className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 mt-1">{asset.qr_code}</p>
                      {asset.license_plate && (
                        <p className="text-[10px] text-slate-400">{asset.license_plate}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Pricing Summary & Payment */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4 sticky top-6">
              <h2 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
                Thời hạn Thuê & Tính toán Dòng tiền
              </h2>

              {/* Duration Days Quick Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Số ngày thuê <span className="text-rose-500 font-bold">*</span> ({durationDays} ngày — đơn giá {formatVND(pricePerMoto.ratePerDay)}/xe/ngày)
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {[1, 4, 7, 15, 30].map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => {
                        setDurationDays(d);
                        clearFieldError('durationDays');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        durationDays === d
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d === 30 ? '1 Tháng' : `${d} ngày`}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={durationDays}
                  onChange={(e) => {
                    setDurationDays(Math.max(1, Number(e.target.value) || 1));
                    clearFieldError('durationDays');
                  }}
                  className={`w-full h-10 px-3.5 rounded-xl border text-sm font-semibold transition-colors focus:outline-none ${
                    fieldErrors.durationDays
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
                {fieldErrors.durationDays && (
                  <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {fieldErrors.durationDays}
                  </p>
                )}
              </div>

              {/* Discount Code & Custom Adjustments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Mã giảm giá
                  </label>
                  <div className="relative">
                    <Tag className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="VD: GIAMGIA10K"
                      list="discount-suggestions"
                      className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200 text-xs font-bold uppercase"
                    />
                    <datalist id="discount-suggestions">
                      {activeDiscounts.map((d: { code: string; name: string }) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Giảm giá trực tiếp (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={customDiscount}
                    onChange={(e) => setCustomDiscount(Number(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Deposit & Prepayment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tiền cọc giữ lại (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={deposit}
                    onChange={(e) => setDeposit(Number(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">
                    Tiền khách trả trước (Đã thu)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={0}
                      step={50000}
                      value={prepaymentAmount}
                      onChange={(e) => setPrepaymentAmount(Number(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-emerald-50/40 text-sm font-bold text-emerald-800"
                    />
                    <button
                      type="button"
                      onClick={() => setPrepaymentAmount(netTotalAmount)}
                      className="px-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0 hover:bg-emerald-200"
                    >
                      Thu đủ
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phương thức thanh toán <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  >
                    <option value="bank_transfer">Chuyển khoản QR</option>
                    <option value="cash">Tiền mặt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Phụ thu thêm (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={surchargeAmount}
                    onChange={(e) => setSurchargeAmount(Number(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Ghi chú đơn thuê (Địa điểm giao xe, tình trạng xe...)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: Giao xe tận sảnh khách sạn..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              {/* Financial Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>
                    Tiền thuê gốc ({motoCount} xe × {pricePerMoto.label})
                  </span>
                  <span className="font-semibold">{formatVND(originalTotalAmount)}</span>
                </div>
                {computedDiscountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Giảm giá khuyến mãi</span>
                    <span>-{formatVND(computedDiscountAmount)}</span>
                  </div>
                )}
                {surchargeAmount > 0 && (
                  <div className="flex justify-between text-xs text-amber-400">
                    <span>Phụ thu</span>
                    <span>+{formatVND(surchargeAmount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Tổng tiền trên đơn
                  </span>
                  <span className="text-xl font-bold text-white">{formatVND(netTotalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Tiền đã thu trước</span>
                  <span className="font-bold">{formatVND(prepaymentAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-400 font-bold">
                  <span>Còn phải thu</span>
                  <span>{formatVND(remainingBalance)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <span>{submitting ? 'Đang tạo đơn thuê...' : 'Xác nhận Tạo Đơn Thuê'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Printable Contract Preview Modal */}
        <AnimatePresence>
          {showContractModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-bold text-lg text-slate-900">
                    Bản Xem Trước Hợp Đồng Thuê Xe Điện
                  </h3>
                  <button
                    onClick={() => setShowContractModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="text-xs sm:text-sm space-y-3 text-slate-700 leading-relaxed">
                  <p className="text-center font-bold uppercase text-slate-900">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    <br />
                    Độc lập - Tự do - Hạnh phúc
                  </p>
                  <h4 className="text-center font-bold text-base text-emerald-700 py-1">
                    HỢP ĐỒNG CHO THUÊ XE MÁY ĐIỆN RUBY EV RENT
                  </h4>
                  <p>
                    <strong>BÊN THUÊ (KHÁCH HÀNG):</strong> {customerName || '................................'}
                  </p>
                  <p>
                    <strong>Số CCCD/Hộ chiếu:</strong> {idNumber || '....................'} •{' '}
                    <strong>Ngày sinh:</strong> {birthDate || '............'} •{' '}
                    <strong>Giới tính:</strong> {gender}
                  </p>
                  <p>
                    <strong>Địa chỉ thường trú:</strong> {residenceAddress || '................................'}
                  </p>
                  <p>
                    <strong>Liên hệ ({contactChannel}):</strong> {contactValue || '....................'}
                  </p>
                  <p>
                    <strong>Tài sản thuê ({selectedAssets.length}):</strong>{' '}
                    {selectedAssets.map((a) => `${a.name} (${a.qr_code})`).join(', ') ||
                      'Chưa chọn xe'}
                  </p>
                  <p>
                    <strong>Thời hạn thuê:</strong> {durationDays} ngày •{' '}
                    <strong>Tổng tiền trên đơn:</strong> {formatVND(netTotalAmount)}
                  </p>
                  <p>
                    <strong>Đã thanh toán trước:</strong> {formatVND(prepaymentAmount)} •{' '}
                    <strong>Còn phải thu:</strong> {formatVND(remainingBalance)} •{' '}
                    <strong>Tiền cọc:</strong> {formatVND(deposit)}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                  >
                    In hợp đồng
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowContractModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

