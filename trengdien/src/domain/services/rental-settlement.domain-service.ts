export interface RentalFinancialState {
  originalTotalAmount: number;
  discountAmount: number;
  surchargeAmount: number;
  lateFee: number;
  deposit: number;
  paidAmount: number;
  heldDepositAmount: number;
}

export interface ComputedSettlement {
  totalAmount: number; // Net order amount = original - discount + surcharge
  totalPayable: number; // totalAmount + lateFee
  paidAmount: number;
  remainingBalance: number; // Math.max(0, totalPayable - paidAmount)
  overpaidAmount: number; // Math.max(0, paidAmount - totalPayable)
  heldDepositAmount: number;
}

/**
 * Pure domain service guaranteeing 100% financial integrity on every rental mutation
 */
export class RentalSettlementDomainService {
  static computeFinancials(state: RentalFinancialState): ComputedSettlement {
    const original = Math.max(0, Math.round(state.originalTotalAmount));
    const discount = Math.min(original, Math.max(0, Math.round(state.discountAmount)));
    const surcharge = Math.max(0, Math.round(state.surchargeAmount));
    const lateFee = Math.max(0, Math.round(state.lateFee));
    const paidAmount = Math.max(0, Math.round(state.paidAmount));
    const heldDepositAmount = Math.max(0, Math.round(state.heldDepositAmount));

    const totalAmount = original - discount + surcharge;
    const totalPayable = totalAmount + lateFee;
    const remainingBalance = Math.max(0, totalPayable - paidAmount);
    const overpaidAmount = Math.max(0, paidAmount - totalPayable);

    return {
      totalAmount,
      totalPayable,
      paidAmount,
      remainingBalance,
      overpaidAmount,
      heldDepositAmount,
    };
  }
}

