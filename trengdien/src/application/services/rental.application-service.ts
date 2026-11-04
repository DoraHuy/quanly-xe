import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { PricingCalculatorDomainService } from '../../domain/services/pricing-calculator.domain-service.js';
import { RentalSettlementDomainService } from '../../domain/services/rental-settlement.domain-service.js';

export interface CreateRentalPayload {
  customer: {
    id?: string;
    name: string;
    birth_date?: string;
    id_type?: string;
    id_number?: string;
    gender?: string;
    nationality?: string;
    place_of_origin?: string;
    residence_address?: string;
    contact_channels?: Array<{
      channel_type: string;
      contact_value: string;
      is_primary?: boolean;
    }>;
  };
  asset_ids: string[];
  duration_days: number;
  start_at?: string;
  deposit?: number;
  prepayment_amount?: number;
  payment_method?: string;
  discount_code?: string;
  custom_discount_amount?: number;
  surcharge_amount?: number;
  notes?: string;
  source_booking_id?: string;
  document_image_id?: string;
}

@Injectable()
export class RentalApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  private async getActivePricingConfig() {
    let pv = await this.prisma.pricingVersion.findFirst({
      where: { isActive: true },
      include: { tiers: true },
      orderBy: { versionNumber: 'desc' },
    });
    if (!pv) {
      pv = await this.prisma.pricingVersion.findFirst({
        include: { tiers: true },
        orderBy: { versionNumber: 'desc' },
      });
    }
    return {
      id: pv?.id || 'default',
      versionNumber: pv?.versionNumber || 1,
      defaultPricePerDay: pv?.defaultPricePerDay || 150000,
      monthDays: pv?.monthDays || 30,
      pricePerMonth: pv?.pricePerMonth || 2100000,
      pricePerExtraDay: pv?.pricePerExtraDay || 70000,
      lateFeeGraceHours: pv?.lateFeeGraceHours || 1,
      lateFeeHourlyAmount: pv?.lateFeeHourlyAmount || 20000,
      lateFeeHourlyMaxHours: pv?.lateFeeHourlyMaxHours || 8,
      tiers: pv?.tiers.map((t) => ({ minDays: t.minDays, pricePerDay: t.pricePerDay })) || [
        { minDays: 4, pricePerDay: 130000 },
        { minDays: 7, pricePerDay: 110000 },
        { minDays: 15, pricePerDay: 70000 },
      ],
    };
  }

  async listRentals(query: {
    status?: string;
    action_filter?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      23,
      59,
      59,
      999,
    );

    const where: Record<string, unknown> = {};

    if (query.status && query.status !== 'all') {
      if (query.status === 'overdue') {
        where.status = 'active';
        where.expectedReturnAt = { lt: now };
      } else if (query.status === 'overdue_cashflow') {
        where.remainingBalance = { gt: 0 };
      } else {
        where.status = query.status;
      }
    }

    if (query.action_filter) {
      where.status = 'active';
      switch (query.action_filter) {
        case 'overdue':
          where.expectedReturnAt = { lt: now };
          break;
        case 'due_today':
          where.expectedReturnAt = { gte: now, lte: endOfToday };
          break;
        case 'due_tomorrow':
          where.expectedReturnAt = { gt: endOfToday, lte: endOfTomorrow };
          break;
        case 'overdue_full':
          where.remainingBalance = { gt: 0 };
          break;
      }
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
        { customer: { idNumber: { contains: s, mode: 'insensitive' } } },
        { items: { some: { asset: { name: { contains: s, mode: 'insensitive' } } } } },
        { items: { some: { asset: { qrCode: { contains: s, mode: 'insensitive' } } } } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.rental.count({ where }),
      this.prisma.rental.findMany({
        where,
        include: {
          customer: { include: { contactChannels: true } },
          creator: true,
          items: { include: { asset: true, swappedTo: true } },
          documentImages: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const items = rows.map((r) => {
      const isOverdue = r.status === 'active' && r.expectedReturnAt < now;
      const isWarning =
        r.status === 'active' && r.expectedReturnAt >= now && r.expectedReturnAt <= endOfToday;
      const primaryContact =
        r.customer.contactChannels.find((c) => c.isPrimary) || r.customer.contactChannels[0];

      return {
        id: r.id,
        code: r.code,
        status: r.status,
        total_amount: r.totalAmount + r.lateFee,
        original_total_amount: r.originalTotalAmount,
        discount_amount: r.discountAmount,
        late_fee: r.lateFee,
        deposit: r.deposit,
        held_deposit_amount: r.heldDepositAmount,
        prepayment_paid_amount: r.paidAmount,
        paid_amount: r.paidAmount,
        prepayment_remaining_amount: r.remainingBalance,
        remaining_balance: r.remainingBalance,
        duration_days: r.durationDays,
        start_at: r.startAt,
        expected_return_at: r.expectedReturnAt,
        actual_return_at: r.actualReturnAt,
        notes: r.notes,
        created_at: r.createdAt,
        creator: r.creator
          ? { id: r.creator.id, name: r.creator.name, username: r.creator.username }
          : null,
        customer: {
          id: r.customer.id,
          name: r.customer.name,
          id_number: r.customer.idNumber,
          phone: primaryContact?.contactValue || '',
          channel_type: primaryContact?.channelType || 'phone',
          residence_address: r.customer.residenceAddress,
        },
        item_count: r.items.length,
        active_item_count: r.items.filter((i) => i.status === 'active').length,
        returned_item_count: r.items.filter((i) => i.status === 'returned').length,
        next_due_items: r.items.map((i) => ({
          rental_item_id: i.id,
          asset_id: i.assetId,
          asset_code: i.asset.qrCode,
          asset_name: i.asset.name,
          asset_type: i.asset.type,
          status: i.status,
          expected_return_at: i.expectedReturnAt,
          base_amount: i.baseAmount,
        })),
        document_images: r.documentImages,
        is_overdue: isOverdue,
        is_warning: isWarning,
      };
    });

    return {
      rentals: items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getRentalDetail(id: string) {
    const now = new Date();
    const r = await this.prisma.rental.findUnique({
      where: { id },
      include: {
        customer: { include: { contactChannels: true } },
        creator: true,
        discountCode: true,
        items: { include: { asset: true, swappedTo: true } },
        payments: { orderBy: { paidAt: 'desc' } },
        extensions: { orderBy: { createdAt: 'desc' } },
        swaps: {
          include: { oldAsset: true, newAsset: true, performer: true },
          orderBy: { createdAt: 'desc' },
        },
        returnSessions: { orderBy: { createdAt: 'desc' } },
        documentImages: true,
      },
    });

    if (!r) throw new NotFoundException('Không tìm thấy đơn thuê');

    return {
      id: r.id,
      code: r.code,
      status: r.status,
      pricing_version_number: r.pricingVersionNumber,
      is_overdue: r.status === 'active' && r.expectedReturnAt < now,
      duration_days: r.durationDays,
      start_at: r.startAt,
      expected_return_at: r.expectedReturnAt,
      actual_return_at: r.actualReturnAt,
      original_total_amount: r.originalTotalAmount,
      discount_amount: r.discountAmount,
      surcharge_amount: r.surchargeAmount,
      total_amount: r.totalAmount,
      deposit: r.deposit,
      held_deposit_amount: r.heldDepositAmount,
      late_fee: r.lateFee,
      paid_amount: r.paidAmount,
      remaining_balance: r.remainingBalance,
      notes: r.notes,
      customer: {
        id: r.customer.id,
        name: r.customer.name,
        birth_date: r.customer.birthDate,
        id_type: r.customer.idType,
        id_number: r.customer.idNumber,
        gender: r.customer.gender,
        nationality: r.customer.nationality,
        place_of_origin: r.customer.placeOfOrigin,
        residence_address: r.customer.residenceAddress,
        contact_channels: r.customer.contactChannels,
      },
      customer_snapshot: r.customerSnapshot,
      creator: r.creator
        ? { id: r.creator.id, name: r.creator.name, username: r.creator.username }
        : null,
      items: r.items.map((i) => ({
        id: i.id,
        asset_id: i.assetId,
        status: i.status,
        is_overdue: i.status === 'active' && i.expectedReturnAt < now,
        start_at: i.startAt,
        expected_return_at: i.expectedReturnAt,
        actual_return_at: i.actualReturnAt,
        duration_days: i.durationDays,
        base_amount: i.baseAmount,
        late_fee_amount: i.lateFeeAmount,
        asset: {
          id: i.asset.id,
          qr_code: i.asset.qrCode,
          code: i.asset.qrCode,
          name: i.asset.name,
          type: i.asset.type,
          status: i.asset.status,
          license_plate: i.asset.licensePlate,
        },
        swapped_to: i.swappedTo,
      })),
      swap_history: r.swaps,
      payments: r.payments,
      extension_history: r.extensions,
      return_sessions: r.returnSessions,
      discount_code: r.discountCode,
      financial_summary: {
        original_total_amount: r.originalTotalAmount,
        discount_amount: r.discountAmount,
        surcharge_amount: r.surchargeAmount,
        total_amount: r.totalAmount,
        late_fee: r.lateFee,
        total_payable: r.totalAmount + r.lateFee,
        deposit: r.deposit,
        held_deposit_amount: r.heldDepositAmount,
        paid_amount: r.paidAmount,
        outstanding_amount: r.remainingBalance,
      },
      document_images: r.documentImages,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }

  async createRental(creatorId: string | undefined, payload: CreateRentalPayload) {
    if (!payload.customer?.name?.trim()) {
      throw new BadRequestException('Vui lòng nhập họ tên khách hàng');
    }
    if (!payload.asset_ids || payload.asset_ids.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 tài sản (xe/pin) để tạo đơn thuê');
    }

    const durationDays = Math.max(1, Math.floor(Number(payload.duration_days) || 1));
    const startAt = payload.start_at ? new Date(payload.start_at) : new Date();
    const expectedReturnAt = new Date(startAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const pricing = await this.getActivePricingConfig();

    const rentalId = await this.prisma.$transaction(async (tx) => {
      // 1. Validate assets are available
      const assets = await tx.asset.findMany({
        where: { id: { in: payload.asset_ids } },
      });

      if (assets.length !== payload.asset_ids.length) {
        throw new BadRequestException('Một số tài sản đã chọn không tồn tại trong hệ thống');
      }

      const unavailable = assets.filter((a) => a.status !== 'available');
      if (unavailable.length > 0) {
        throw new BadRequestException(
          `Tài sản ${unavailable.map((a) => `${a.name} (${a.qrCode})`).join(', ')} hiện đang không sẵn sàng (${unavailable[0].status})`,
        );
      }

      // 2. Find or create customer
      let customerId = payload.customer.id;
      const idNumber = payload.customer.id_number?.trim() || null;

      if (!customerId && idNumber) {
        const existingByIdNum = await tx.customer.findFirst({
          where: { idNumber },
        });
        if (existingByIdNum) {
          customerId = existingByIdNum.id;
        }
      }

      const birthDate = payload.customer.birth_date
        ? new Date(payload.customer.birth_date)
        : null;

      let customer;
      if (customerId) {
        customer = await tx.customer.update({
          where: { id: customerId },
          data: {
            name: payload.customer.name.trim(),
            ...(birthDate && !Number.isNaN(birthDate.getTime()) ? { birthDate } : {}),
            ...(payload.customer.id_type ? { idType: payload.customer.id_type } : {}),
            ...(idNumber ? { idNumber } : {}),
            ...(payload.customer.gender ? { gender: payload.customer.gender } : {}),
            ...(payload.customer.nationality ? { nationality: payload.customer.nationality } : {}),
            ...(payload.customer.place_of_origin
              ? { placeOfOrigin: payload.customer.place_of_origin }
              : {}),
            ...(payload.customer.residence_address
              ? { residenceAddress: payload.customer.residence_address }
              : {}),
          },
        });
      } else {
        customer = await tx.customer.create({
          data: {
            name: payload.customer.name.trim(),
            birthDate: birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate : null,
            idType: payload.customer.id_type || 'cccd',
            idNumber,
            gender: payload.customer.gender || 'Nam',
            nationality: payload.customer.nationality || 'Việt Nam',
            placeOfOrigin: payload.customer.place_of_origin || null,
            residenceAddress: payload.customer.residence_address || null,
          },
        });
      }

      // Update contact channels if provided
      if (payload.customer.contact_channels?.length) {
        const validContacts = payload.customer.contact_channels.filter(
          (c) => c.contact_value?.trim(),
        );
        if (validContacts.length > 0) {
          await tx.customerContact.deleteMany({ where: { customerId: customer.id } });
          await tx.customerContact.createMany({
            data: validContacts.map((c, idx) => ({
              customerId: customer.id,
              channelType: c.channel_type || 'phone',
              contactValue: c.contact_value.trim(),
              isPrimary: c.is_primary ?? idx === 0,
            })),
          });
        }
      }

      // 3. Calculate pricing for each item
      const itemCalculations = assets.map((asset) => {
        const isBillable = asset.type === 'electric_moto';
        const priceCalc = isBillable
          ? PricingCalculatorDomainService.calculateAssetPriceFromDays(durationDays, pricing)
          : { totalAmount: 0, appliedRatePerDay: 0 };
        return {
          asset,
          baseAmount: priceCalc.totalAmount,
        };
      });

      const originalTotalAmount = itemCalculations.reduce((s, i) => s + i.baseAmount, 0);
      const billableCount = assets.filter((a) => a.type === 'electric_moto').length;

      // 4. Apply discount code if provided
      let discountEntity = null;
      if (payload.discount_code?.trim()) {
        const norm = payload.discount_code.trim().toUpperCase();
        discountEntity = await tx.discountCode.findFirst({
          where: { codeNormalized: norm, active: true, deleted: false },
        });
        if (!discountEntity) {
          throw new BadRequestException(`Mã giảm giá "${payload.discount_code}" không hợp lệ hoặc đã hết hạn`);
        }
      }

      const discountAmount = PricingCalculatorDomainService.calculateDiscountAmount(
        originalTotalAmount,
        billableCount,
        durationDays,
        discountEntity
          ? {
              code: discountEntity.code,
              scope: discountEntity.scope as 'order' | 'asset_daily',
              valueType: discountEntity.valueType as 'fixed' | 'percent',
              fixedAmount: discountEntity.fixedAmount,
              percentBasisPoints: discountEntity.percentBasisPoints,
            }
          : null,
        Number(payload.custom_discount_amount) || 0,
      );

      const surchargeAmount = Math.max(0, Number(payload.surcharge_amount) || 0);
      const deposit = Math.max(0, Number(payload.deposit) || 0);
      const prepaymentAmount = Math.max(0, Number(payload.prepayment_amount) || 0);

      const settlement = RentalSettlementDomainService.computeFinancials({
        originalTotalAmount,
        discountAmount,
        surchargeAmount,
        lateFee: 0,
        deposit,
        paidAmount: prepaymentAmount,
        heldDepositAmount: deposit,
      });

      // 5. Generate unique Rental Code HD-DDMMYYYY-XXXX
      const dStr = `${String(startAt.getDate()).padStart(2, '0')}${String(startAt.getMonth() + 1).padStart(2, '0')}${startAt.getFullYear()}`;
      const todayCount = await tx.rental.count({
        where: { code: { startsWith: `HD-${dStr}` } },
      });
      const code = `HD-${dStr}-${String(todayCount + 1).padStart(4, '0')}`;

      // 6. Create Rental & Items
      const rental = await tx.rental.create({
        data: {
          code,
          status: 'active',
          customerId: customer.id,
          creatorId: creatorId || null,
          pricingVersionId: pricing.id !== 'default' ? pricing.id : null,
          pricingVersionNumber: pricing.versionNumber,
          sourceBookingId: payload.source_booking_id || null,
          discountCodeId: discountEntity?.id || null,
          durationDays,
          startAt,
          expectedReturnAt,
          originalTotalAmount,
          discountAmount,
          surchargeAmount,
          totalAmount: settlement.totalAmount,
          deposit,
          heldDepositAmount: deposit,
          lateFee: 0,
          paidAmount: settlement.paidAmount,
          remainingBalance: settlement.remainingBalance,
          customerSnapshot: {
            name: customer.name,
            gender: customer.gender,
            id_type: customer.idType,
            id_number: customer.idNumber,
            birth_date: customer.birthDate,
            nationality: customer.nationality,
            residence_address: customer.residenceAddress,
          },
          notes: payload.notes || null,
          items: {
            create: itemCalculations.map((ic) => ({
              assetId: ic.asset.id,
              status: 'active',
              startAt,
              expectedReturnAt,
              durationDays,
              baseAmount: ic.baseAmount,
            })),
          },
        },
      });

      // 7. Mark all selected assets as 'rented'
      await tx.asset.updateMany({
        where: { id: { in: payload.asset_ids } },
        data: { status: 'rented' },
      });

      // 8. Increment discount code usage
      if (discountEntity) {
        await tx.discountCode.update({
          where: { id: discountEntity.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      // 9. Record payments if prepayment or deposit > 0
      if (prepaymentAmount > 0) {
        await tx.payment.create({
          data: {
            rentalId: rental.id,
            amount: prepaymentAmount,
            type: 'prepayment',
            method: payload.payment_method || 'cash',
            note: 'Thanh toán khi tạo đơn thuê',
          },
        });
      }
      if (deposit > 0) {
        await tx.payment.create({
          data: {
            rentalId: rental.id,
            amount: deposit,
            type: 'deposit_collect',
            method: payload.payment_method || 'cash',
            note: 'Thu tiền cọc',
          },
        });
      }

      // 10. Link document image if uploaded via OCR
      if (payload.document_image_id) {
        await tx.documentImage
          .update({
            where: { id: payload.document_image_id },
            data: { rentalId: rental.id },
          })
          .catch(() => null);
      }

      // 11. Convert booking if from booking
      if (payload.source_booking_id) {
        await tx.booking
          .update({
            where: { id: payload.source_booking_id },
            data: { status: 'converted' },
          })
          .catch(() => null);
      }

      return rental.id;
    });

    return this.getRentalDetail(rentalId);
  }

  async addPayment(
    rentalId: string,
    dto: { amount: number; type?: string; method?: string; note?: string },
  ) {
    const amount = Math.round(Number(dto.amount) || 0);
    if (amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0');
    }

    await this.prisma.$transaction(async (tx) => {
      const rental = await tx.rental.findUnique({ where: { id: rentalId } });
      if (!rental) throw new NotFoundException('Không tìm thấy đơn thuê');

      const paymentType = dto.type || 'settlement';
      await tx.payment.create({
        data: {
          rentalId,
          amount,
          type: paymentType,
          method: dto.method || 'cash',
          note: dto.note || 'Thu thêm tiền đơn thuê',
        },
      });

      const newPaidAmount =
        paymentType === 'deposit_collect' ? rental.paidAmount : rental.paidAmount + amount;
      const newHeldDeposit =
        paymentType === 'deposit_collect'
          ? rental.heldDepositAmount + amount
          : paymentType === 'deposit_refund'
            ? Math.max(0, rental.heldDepositAmount - amount)
            : rental.heldDepositAmount;

      const settlement = RentalSettlementDomainService.computeFinancials({
        originalTotalAmount: rental.originalTotalAmount,
        discountAmount: rental.discountAmount,
        surchargeAmount: rental.surchargeAmount,
        lateFee: rental.lateFee,
        deposit: rental.deposit,
        paidAmount: newPaidAmount,
        heldDepositAmount: newHeldDeposit,
      });

      await tx.rental.update({
        where: { id: rentalId },
        data: {
          paidAmount: settlement.paidAmount,
          remainingBalance: settlement.remainingBalance,
          heldDepositAmount: settlement.heldDepositAmount,
        },
      });
    });

    return this.getRentalDetail(rentalId);
  }

  async extendRental(
    rentalId: string,
    dto: { extra_days: number; paid_amount?: number; method?: string; note?: string },
  ) {
    const extraDays = Math.max(1, Math.floor(Number(dto.extra_days) || 1));
    const pricing = await this.getActivePricingConfig();

    await this.prisma.$transaction(async (tx) => {
      const rental = await tx.rental.findUnique({
        where: { id: rentalId },
        include: { items: { include: { asset: true } } },
      });
      if (!rental) throw new NotFoundException('Không tìm thấy đơn thuê');

      const newDurationDays = rental.durationDays + extraDays;
      const newExpectedReturnAt = new Date(
        rental.expectedReturnAt.getTime() + extraDays * 24 * 60 * 60 * 1000,
      );

      // Calculate new total based on total duration days
      const activeMotoCount = rental.items.filter(
        (i) => i.status === 'active' && i.asset.type === 'electric_moto',
      ).length;
      const newPricePerMoto = PricingCalculatorDomainService.calculateAssetPriceFromDays(
        newDurationDays,
        pricing,
      ).totalAmount;
      const newOriginalTotal = newPricePerMoto * Math.max(1, activeMotoCount);
      const extensionFee = Math.max(0, newOriginalTotal - rental.originalTotalAmount);

      const additionalPaid = Math.max(0, Math.round(Number(dto.paid_amount) || 0));
      const newPaidAmount = rental.paidAmount + additionalPaid;

      const settlement = RentalSettlementDomainService.computeFinancials({
        originalTotalAmount: newOriginalTotal,
        discountAmount: rental.discountAmount,
        surchargeAmount: rental.surchargeAmount,
        lateFee: rental.lateFee,
        deposit: rental.deposit,
        paidAmount: newPaidAmount,
        heldDepositAmount: rental.heldDepositAmount,
      });

      await tx.rentalExtension.create({
        data: {
          rentalId,
          extraDays,
          extensionFee,
          previousReturnAt: rental.expectedReturnAt,
          newExpectedReturnAt,
          note: dto.note || `Gia hạn thêm ${extraDays} ngày`,
        },
      });

      if (additionalPaid > 0) {
        await tx.payment.create({
          data: {
            rentalId,
            amount: additionalPaid,
            type: 'extension',
            method: dto.method || 'cash',
            note: `Thanh toán khi gia hạn thêm ${extraDays} ngày`,
          },
        });
      }

      await tx.rentalItem.updateMany({
        where: { rentalId, status: 'active' },
        data: {
          durationDays: newDurationDays,
          expectedReturnAt: newExpectedReturnAt,
          baseAmount: newPricePerMoto,
        },
      });

      await tx.rental.update({
        where: { id: rentalId },
        data: {
          durationDays: newDurationDays,
          expectedReturnAt: newExpectedReturnAt,
          originalTotalAmount: newOriginalTotal,
          totalAmount: settlement.totalAmount,
          paidAmount: settlement.paidAmount,
          remainingBalance: settlement.remainingBalance,
        },
      });
    });

    return this.getRentalDetail(rentalId);
  }
}

