export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'admin' | 'manager' | 'staff' | string;
}

export interface Asset {
  id: string;
  name: string;
  qr_code: string;
  type: 'electric_moto' | 'battery' | 'accessory' | string;
  status: 'available' | 'rented' | 'maintenance' | string;
  license_plate?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface ContactChannel {
  id?: string;
  channelType?: string;
  channel_type?: string;
  contactValue?: string;
  contact_value?: string;
  isPrimary?: boolean;
  is_primary?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  birth_date?: string | null;
  id_type?: string;
  id_number?: string | null;
  gender?: string | null;
  nationality?: string | null;
  place_of_origin?: string | null;
  residence_address?: string | null;
  phone?: string;
  channel_type?: string;
  contact_channels?: ContactChannel[];
  rental_count?: number;
  active_rental_count?: number;
  total_spent?: number;
  outstanding_balance?: number;
}

export interface PricingTier {
  min_days: number;
  price_per_day: number;
}

export interface PricingConfig {
  id: string;
  version_number?: number;
  version?: number;
  default_price_per_day: number;
  month_days?: number;
  month_package_min_days?: number;
  price_per_month?: number;
  month_package_price?: number;
  price_per_extra_day?: number;
  extra_day_price?: number;
  late_fee_grace_hours: number;
  late_fee_hourly_amount: number;
  late_fee_hourly_max_hours: number;
  tiers?: PricingTier[];
  price_tiers?: PricingTier[];
  note?: string;
  notes?: string;
  creator_name?: string;
  rental_count?: number;
  is_active?: boolean;
  effective_from?: string;
  created_at?: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed' | 'fixed_Per_Day' | string;
  discount_value: number;
  min_days?: number;
  max_uses?: number | null;
  used_count?: number;
  is_active: boolean;
  created_at?: string;
}

export interface ExtractedCccdFields {
  id_type: 'cccd' | 'passport' | 'gplx';
  id_number: string;
  name: string;
  birth_date: string;
  gender: string;
  nationality: string;
  place_of_origin: string;
  residence_address: string;
  expiry_date?: string;
  raw_matches: Array<{ label: string; text: string; pattern: string }>;
  source_method: 'qr' | 'ocr_my_cccd' | 'hybrid';
}

export function formatVND(amount: number | undefined | null): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDateTimeVN(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export const formatDateTime = formatDateTimeVN;

export function formatDateVN(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function calculateClientAssetPrice(
  days: number,
  pricing: PricingConfig | null | undefined,
): { totalAmount: number; ratePerDay: number; label: string } {
  const validDays = Math.max(1, Math.floor(Number(days) || 1));
  const defaultRate = pricing?.default_price_per_day ?? 150000;
  const monthDays = pricing?.month_days ?? 30;
  const pricePerMonth = pricing?.price_per_month ?? 2100000;
  const priceExtra = pricing?.price_per_extra_day ?? 70000;

  if (validDays >= monthDays && monthDays > 0) {
    const months = Math.floor(validDays / monthDays);
    const extra = validDays % monthDays;
    const totalAmount = months * pricePerMonth + extra * priceExtra;
    return {
      totalAmount,
      ratePerDay: Math.round(totalAmount / validDays),
      label: `${months} tháng + ${extra} ngày lẻ`,
    };
  }

  const tiers = [...(pricing?.tiers || [])].sort((a, b) => b.min_days - a.min_days);
  const matched = tiers.find((t) => validDays >= t.min_days);
  const rate = matched ? matched.price_per_day : defaultRate;
  return {
    totalAmount: validDays * rate,
    ratePerDay: rate,
    label: `${validDays} ngày × ${formatVND(rate)}/ngày`,
  };
}

