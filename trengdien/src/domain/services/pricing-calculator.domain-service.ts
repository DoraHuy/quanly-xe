export interface PricingTierConfig {
  minDays: number;
  pricePerDay: number;
}

export interface PricingVersionConfig {
  id: string;
  versionNumber: number;
  defaultPricePerDay: number;
  monthDays: number;
  pricePerMonth: number;
  pricePerExtraDay: number;
  lateFeeGraceHours: number;
  lateFeeHourlyAmount: number;
  lateFeeHourlyMaxHours: number;
  tiers: PricingTierConfig[];
}

export interface DiscountCodeConfig {
  code: string;
  scope: 'order' | 'asset_daily';
  valueType: 'fixed' | 'percent';
  fixedAmount?: number | null;
  percentBasisPoints?: number | null; // e.g. 1000 = 10%
}

export class PricingCalculatorDomainService {
  /**
   * Calculate base rental price for one billable asset (electric_moto) for `days` days
   */
  static calculateAssetPriceFromDays(
    days: number,
    pricing: PricingVersionConfig,
  ): { totalAmount: number; appliedRatePerDay: number; breakdown: string } {
    const validDays = Math.max(1, Math.floor(days));

    if (validDays >= pricing.monthDays && pricing.monthDays > 0) {
      const fullMonths = Math.floor(validDays / pricing.monthDays);
      const extraDays = validDays % pricing.monthDays;
      const totalAmount =
        fullMonths * pricing.pricePerMonth + extraDays * pricing.pricePerExtraDay;
      return {
        totalAmount,
        appliedRatePerDay: Math.round(totalAmount / validDays),
        breakdown: `${fullMonths} tháng (${pricing.pricePerMonth.toLocaleString('vi-VN')}đ) + ${extraDays} ngày lẻ (${pricing.pricePerExtraDay.toLocaleString('vi-VN')}đ/ngày)`,
      };
    }

    // Sort tiers descending by minDays to match highest applicable tier
    const sortedTiers = [...(pricing.tiers || [])].sort((a, b) => b.minDays - a.minDays);
    const matchedTier = sortedTiers.find((t) => validDays >= t.minDays);
    const rate = matchedTier ? matchedTier.pricePerDay : pricing.defaultPricePerDay;

    return {
      totalAmount: validDays * rate,
      appliedRatePerDay: rate,
      breakdown: `${validDays} ngày × ${rate.toLocaleString('vi-VN')}đ/ngày`,
    };
  }

  /**
   * Calculate discount amount for an order
   */
  static calculateDiscountAmount(
    originalTotalAmount: number,
    billableAssetCount: number,
    durationDays: number,
    discount?: DiscountCodeConfig | null,
    customDiscountAmount = 0,
  ): number {
    if (customDiscountAmount > 0) {
      return Math.min(originalTotalAmount, Math.floor(customDiscountAmount));
    }
    if (!discount) return 0;

    let amount = 0;
    if (discount.valueType === 'fixed' && discount.fixedAmount) {
      if (discount.scope === 'asset_daily') {
        amount = discount.fixedAmount * Math.max(1, billableAssetCount) * Math.max(1, durationDays);
      } else {
        amount = discount.fixedAmount;
      }
    } else if (discount.valueType === 'percent' && discount.percentBasisPoints) {
      amount = Math.round((originalTotalAmount * discount.percentBasisPoints) / 10000);
    }

    return Math.min(originalTotalAmount, Math.max(0, amount));
  }

  /**
   * Calculate late fee based on expected return time, actual return time, and pricing config
   */
  static calculateLateFee(
    expectedReturnAt: Date,
    actualReturnAt: Date,
    pricing: PricingVersionConfig,
  ): { lateHours: number; lateFeeAmount: number } {
    const diffMs = actualReturnAt.getTime() - expectedReturnAt.getTime();
    if (diffMs <= 0) {
      return { lateHours: 0, lateFeeAmount: 0 };
    }

    const totalHoursLate = Math.ceil(diffMs / (1000 * 60 * 60));
    if (totalHoursLate <= pricing.lateFeeGraceHours) {
      return { lateHours: 0, lateFeeAmount: 0 };
    }

    const chargeableHours = totalHoursLate - pricing.lateFeeGraceHours;
    if (chargeableHours <= pricing.lateFeeHourlyMaxHours) {
      return {
        lateHours: chargeableHours,
        lateFeeAmount: chargeableHours * pricing.lateFeeHourlyAmount,
      };
    }

    // Beyond max hourly cap, convert to extra days + remaining hours
    const extraDays = Math.ceil(totalHoursLate / 24);
    return {
      lateHours: totalHoursLate,
      lateFeeAmount: extraDays * pricing.defaultPricePerDay,
    };
  }
}

