import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { PricingCalculatorDomainService } from '../../domain/services/pricing-calculator.domain-service.js';
import { RentalSettlementDomainService } from '../../domain/services/rental-settlement.domain-service.js';

@Injectable()
export class ReturnApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async scanOrSearchForReturn(query: string) {
    const q = query.trim();
    if (!q) throw new BadRequestException('Vui lòng nhập mã QR xe, tên xe hoặc mã đơn thuê');

    // Find active rental matching asset QR, asset name, rental code, or customer name
    const rental = await this.prisma.rental.findFirst({
      where: {
        status: 'active',
        OR: [
          { code: { equals: q, mode: 'insensitive' } },
          { items: { some: { status: 'active', asset: { qrCode: { equals: q, mode: 'insensitive' } } } } },
          { items: { some: { status: 'active', asset: { name: { equals: q, mode: 'insensitive' } } } } },
          { code: { contains: q, mode: 'insensitive' } },
          { customer: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: {
        customer: { include: { contactChannels: true } },
        items: { include: { asset: true } },
        pricingVersion: { include: { tiers: true } },
        payments: true,
      },
    });

    if (!rental) {
      throw new NotFoundException(`Không tìm thấy đơn thuê đang hoạt động cho "${q}"`);
    }

    const now = new Date();
    const pv = rental.pricingVersion;
    const pricingConfig = {
      id: pv?.id || 'default',
      versionNumber: pv?.versionNumber || 1,
      defaultPricePerDay: pv?.defaultPricePerDay || 150000,
      monthDays: pv?.monthDays || 30,
      pricePerMonth: pv?.pricePerMonth || 2100000,
      pricePerExtraDay: pv?.pricePerExtraDay || 70000,
      lateFeeGraceHours: pv?.lateFeeGraceHours || 1,
      lateFeeHourlyAmount: pv?.lateFeeHourlyAmount || 20000,
      lateFeeHourlyMaxHours: pv?.lateFeeHourlyMaxHours || 8,
      tiers: pv?.tiers.map((t) => ({ minDays: t.minDays, pricePerDay: t.pricePerDay })) || [],
    };

    const lateCalc = PricingCalculatorDomainService.calculateLateFee(
      rental.expectedReturnAt,
      now,
      pricingConfig,
    );

    const previewSettlement = RentalSettlementDomainService.computeFinancials({
      originalTotalAmount: rental.originalTotalAmount,
      discountAmount: rental.discountAmount,
      surchargeAmount: rental.surchargeAmount,
      lateFee: lateCalc.lateFeeAmount,
      deposit: rental.deposit,
      paidAmount: rental.paidAmount,
      heldDepositAmount: rental.heldDepositAmount,
    });

    return {
      rental_id: rental.id,
      code: rental.code,
      customer: rental.customer,
      start_at: rental.startAt,
      expected_return_at: rental.expectedReturnAt,
      duration_days: rental.durationDays,
      active_items: rental.items
        .filter((i) => i.status === 'active')
        .map((i) => ({
          id: i.id,
          asset_id: i.assetId,
          asset_name: i.asset.name,
          qr_code: i.asset.qrCode,
          asset_type: i.asset.type,
          base_amount: i.baseAmount,
        })),
      returned_items: rental.items
        .filter((i) => i.status === 'returned')
        .map((i) => ({
          id: i.id,
          asset_name: i.asset.name,
          qr_code: i.asset.qrCode,
          actual_return_at: i.actualReturnAt,
        })),
      late_hours: lateCalc.lateHours,
      suggested_late_fee: lateCalc.lateFeeAmount,
      financial_preview: {
        original_total_amount: rental.originalTotalAmount,
        discount_amount: rental.discountAmount,
        total_amount: rental.totalAmount,
        late_fee: lateCalc.lateFeeAmount,
        total_payable: previewSettlement.totalPayable,
        paid_amount: rental.paidAmount,
        remaining_to_collect: previewSettlement.remainingBalance,
        held_deposit: rental.heldDepositAmount,
      },
    };
  }

  async processReturnSession(
    userId: string | undefined,
    dto: {
      rental_id: string;
      item_ids?: string[];
      late_fee?: number;
      collected_amount?: number;
      deposit_refunded?: number;
      payment_method?: string;
      notes?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const rental = await tx.rental.findUnique({
        where: { id: dto.rental_id },
        include: { items: { include: { asset: true } } },
      });

      if (!rental) throw new NotFoundException('Không tìm thấy đơn thuê');
      const activeItems = rental.items.filter((i) => i.status === 'active');
      if (activeItems.length === 0) {
        throw new BadRequestException('Đơn thuê này đã được trả hết tài sản');
      }

      const targetItemIds =
        dto.item_ids && dto.item_ids.length > 0
          ? activeItems.filter((i) => dto.item_ids!.includes(i.id)).map((i) => i.id)
          : activeItems.map((i) => i.id);

      if (targetItemIds.length === 0) {
        throw new BadRequestException('Không có tài sản hợp lệ để trả');
      }

      const targetAssetIds = activeItems
        .filter((i) => targetItemIds.includes(i.id))
        .map((i) => i.assetId);

      const now = new Date();
      const lateFeeCharged = Math.max(0, Math.round(Number(dto.late_fee) || 0));
      const collectedAmount = Math.max(0, Math.round(Number(dto.collected_amount) || 0));
      const depositRefunded = Math.max(0, Math.round(Number(dto.deposit_refunded) || 0));

      // 1. Mark returned items & release assets to 'available'
      await tx.rentalItem.updateMany({
        where: { id: { in: targetItemIds } },
        data: {
          status: 'returned',
          actualReturnAt: now,
        },
      });

      await tx.asset.updateMany({
        where: { id: { in: targetAssetIds } },
        data: { status: 'available' },
      });

      // 2. Compute new financials
      const newLateFee = rental.lateFee + lateFeeCharged;
      const newPaidAmount = rental.paidAmount + collectedAmount;
      const newHeldDeposit = Math.max(0, rental.heldDepositAmount - depositRefunded);

      const settlement = RentalSettlementDomainService.computeFinancials({
        originalTotalAmount: rental.originalTotalAmount,
        discountAmount: rental.discountAmount,
        surchargeAmount: rental.surchargeAmount,
        lateFee: newLateFee,
        deposit: rental.deposit,
        paidAmount: newPaidAmount,
        heldDepositAmount: newHeldDeposit,
      });

      const isAllReturned = targetItemIds.length === activeItems.length;

      await tx.rental.update({
        where: { id: rental.id },
        data: {
          status: isAllReturned ? 'returned' : 'active',
          actualReturnAt: isAllReturned ? now : null,
          lateFee: newLateFee,
          paidAmount: settlement.paidAmount,
          remainingBalance: settlement.remainingBalance,
          heldDepositAmount: settlement.heldDepositAmount,
        },
      });

      // 3. Create payment records
      if (collectedAmount > 0) {
        await tx.payment.create({
          data: {
            rentalId: rental.id,
            amount: collectedAmount,
            type: 'settlement',
            method: dto.payment_method || 'cash',
            note: 'Tất toán khi trả xe',
          },
        });
      }
      if (depositRefunded > 0) {
        await tx.payment.create({
          data: {
            rentalId: rental.id,
            amount: depositRefunded,
            type: 'deposit_refund',
            method: dto.payment_method || 'cash',
            note: 'Hoàn trả tiền cọc cho khách',
          },
        });
      }

      // 4. Create ReturnSession record
      const session = await tx.returnSession.create({
        data: {
          rentalId: rental.id,
          processedBy: userId || null,
          returnedItemIds: targetItemIds,
          lateFeeCharged,
          collectedAmount,
          depositRefunded,
          notes: dto.notes || null,
        },
      });

      return {
        session,
        all_returned: isAllReturned,
        remaining_balance: settlement.remainingBalance,
      };
    });
  }
}

