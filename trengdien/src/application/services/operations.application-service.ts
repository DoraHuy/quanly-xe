import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { PasswordHelper } from '../../infrastructure/security/password.helper.js';

@Injectable()
export class OperationsApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== ASSETS ====================
  async listAssets(query: {
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const where: Record<string, unknown> = {};

    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.type && query.type !== 'all') where.type = query.type;
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { qrCode: { contains: s, mode: 'insensitive' } },
        { licensePlate: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((a) => ({
        id: a.id,
        name: a.name,
        qr_code: a.qrCode,
        type: a.type,
        status: a.status,
        license_plate: a.licensePlate,
        notes: a.notes,
        created_at: a.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async createAsset(dto: {
    name: string;
    qr_code?: string;
    type?: string;
    status?: string;
    license_plate?: string;
    notes?: string;
  }) {
    if (!dto.name?.trim()) throw new BadRequestException('Vui lòng nhập tên tài sản');
    const prefix = dto.type === 'battery' ? 'PIN' : 'XE';
    const qrCode =
      dto.qr_code?.trim().toUpperCase() ||
      `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

    const asset = await this.prisma.asset.create({
      data: {
        name: dto.name.trim(),
        qrCode,
        type: dto.type || 'electric_moto',
        status: dto.status || 'available',
        licensePlate: dto.license_plate || null,
        notes: dto.notes || null,
      },
    });
    return {
      id: asset.id,
      name: asset.name,
      qr_code: asset.qrCode,
      type: asset.type,
      status: asset.status,
      license_plate: asset.licensePlate,
      notes: asset.notes,
    };
  }

  async updateAsset(
    id: string,
    dto: {
      name?: string;
      qr_code?: string;
      type?: string;
      status?: string;
      license_plate?: string;
      notes?: string;
    },
  ) {
    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.qr_code ? { qrCode: dto.qr_code.trim().toUpperCase() } : {}),
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.license_plate !== undefined ? { licensePlate: dto.license_plate } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    return {
      id: asset.id,
      name: asset.name,
      qr_code: asset.qrCode,
      type: asset.type,
      status: asset.status,
      license_plate: asset.licensePlate,
      notes: asset.notes,
    };
  }

  async deleteAsset(id: string) {
    await this.prisma.asset.delete({ where: { id } });
    return { deleted: true };
  }

  // ==================== CUSTOMERS ====================
  async listCustomers(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: Record<string, unknown> = {};

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { idNumber: { contains: s, mode: 'insensitive' } },
        { residenceAddress: { contains: s, mode: 'insensitive' } },
        { contactChannels: { some: { contactValue: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const [total, customers] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        include: {
          contactChannels: true,
          rentals: {
            select: {
              id: true,
              code: true,
              status: true,
              totalAmount: true,
              remainingBalance: true,
              startAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: customers.map((c) => {
        const primary = c.contactChannels.find((ch) => ch.isPrimary) || c.contactChannels[0];
        return {
          id: c.id,
          name: c.name,
          birth_date: c.birthDate,
          id_type: c.idType,
          id_number: c.idNumber,
          gender: c.gender,
          nationality: c.nationality,
          place_of_origin: c.placeOfOrigin,
          residence_address: c.residenceAddress,
          phone: primary?.contactValue || '',
          channel_type: primary?.channelType || 'phone',
          contact_channels: c.contactChannels,
          rental_count: c.rentals.length,
          active_rental_count: c.rentals.filter((r) => r.status === 'active').length,
          total_spent: c.rentals.reduce((s, r) => s + r.totalAmount, 0),
          outstanding_balance: c.rentals.reduce((s, r) => s + r.remainingBalance, 0),
          recent_rentals: c.rentals.slice(0, 3),
          created_at: c.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async upsertCustomer(dto: {
    id?: string;
    name: string;
    birth_date?: string;
    id_type?: string;
    id_number?: string;
    gender?: string;
    nationality?: string;
    place_of_origin?: string;
    residence_address?: string;
    phone?: string;
    channel_type?: string;
  }) {
    if (!dto.name?.trim()) throw new BadRequestException('Họ tên khách hàng không được để trống');
    const birthDate = dto.birth_date ? new Date(dto.birth_date) : null;

    if (dto.id) {
      const updated = await this.prisma.customer.update({
        where: { id: dto.id },
        data: {
          name: dto.name.trim(),
          birthDate: birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate : null,
          idType: dto.id_type || 'cccd',
          idNumber: dto.id_number?.trim() || null,
          gender: dto.gender || 'Nam',
          nationality: dto.nationality || 'Việt Nam',
          placeOfOrigin: dto.place_of_origin || null,
          residenceAddress: dto.residence_address || null,
        },
        include: { contactChannels: true },
      });
      if (dto.phone !== undefined) {
        await this.prisma.customerContact.deleteMany({ where: { customerId: updated.id } });
        if (dto.phone.trim()) {
          await this.prisma.customerContact.create({
            data: {
              customerId: updated.id,
              channelType: dto.channel_type || 'phone',
              contactValue: dto.phone.trim(),
              isPrimary: true,
            },
          });
        }
      }
      return updated;
    }

    return this.prisma.customer.create({
      data: {
        name: dto.name.trim(),
        birthDate: birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate : null,
        idType: dto.id_type || 'cccd',
        idNumber: dto.id_number?.trim() || null,
        gender: dto.gender || 'Nam',
        nationality: dto.nationality || 'Việt Nam',
        placeOfOrigin: dto.place_of_origin || null,
        residenceAddress: dto.residence_address || null,
        ...(dto.phone?.trim()
          ? {
              contactChannels: {
                create: [
                  {
                    channelType: dto.channel_type || 'phone',
                    contactValue: dto.phone.trim(),
                    isPrimary: true,
                  },
                ],
              },
            }
          : {}),
      },
      include: { contactChannels: true },
    });
  }

  // ==================== BOOKINGS ====================
  async listBookings(query: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: Record<string, unknown> = {};

    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { customerPhone: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: { items: { include: { asset: true } } },
        orderBy: { pickupAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: bookings.map((b) => ({
        id: b.id,
        code: b.code,
        status: b.status,
        customer_name: b.customerName,
        customer_phone: b.customerPhone,
        pickup_at: b.pickupAt,
        expected_return_at: b.expectedReturnAt,
        duration_days: b.durationDays,
        delivery_required: b.deliveryRequired,
        delivery_address: b.deliveryAddress,
        deposit_amount: b.depositAmount,
        notes: b.notes,
        asset_count: b.items.length,
        assets: b.items.map((i) => ({
          id: i.id,
          asset_id: i.assetId,
          qr_code: i.asset.qrCode,
          name: i.asset.name,
          type: i.asset.type,
        })),
        created_at: b.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async createBooking(dto: {
    customer_name: string;
    customer_phone: string;
    pickup_at: string;
    duration_days: number;
    asset_ids: string[];
    delivery_required?: boolean;
    delivery_address?: string;
    deposit_amount?: number;
    notes?: string;
  }) {
    if (!dto.customer_name?.trim()) throw new BadRequestException('Vui lòng nhập tên khách đặt lịch');
    const pickupAt = dto.pickup_at ? new Date(dto.pickup_at) : new Date();
    const durationDays = Math.max(1, Number(dto.duration_days) || 1);
    const expectedReturnAt = new Date(pickupAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const dStr = `${pickupAt.getFullYear()}${String(pickupAt.getMonth() + 1).padStart(2, '0')}${String(pickupAt.getDate()).padStart(2, '0')}`;
    const count = await this.prisma.booking.count();
    const code = `DL-${dStr}-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.booking.create({
      data: {
        code,
        status: 'confirmed',
        customerName: dto.customer_name.trim(),
        customerPhone: dto.customer_phone?.trim() || '',
        pickupAt,
        expectedReturnAt,
        durationDays,
        deliveryRequired: Boolean(dto.delivery_required),
        deliveryAddress: dto.delivery_address || null,
        depositAmount: Number(dto.deposit_amount) || 0,
        notes: dto.notes || null,
        items: {
          create: (dto.asset_ids || []).map((assetId) => ({ assetId })),
        },
      },
      include: { items: { include: { asset: true } } },
    });
  }

  async updateBookingStatus(id: string, status: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { status },
    });
  }

  // ==================== PRICING ====================
  async getActivePricing() {
    let pv = await this.prisma.pricingVersion.findFirst({
      where: { isActive: true },
      include: { tiers: { orderBy: { minDays: 'asc' } } },
    });
    if (!pv) {
      pv = await this.prisma.pricingVersion.findFirst({
        include: { tiers: { orderBy: { minDays: 'asc' } } },
        orderBy: { versionNumber: 'desc' },
      });
    }
    if (!pv) return null;
    return {
      id: pv.id,
      version_number: pv.versionNumber,
      default_price_per_day: pv.defaultPricePerDay,
      month_days: pv.monthDays,
      price_per_month: pv.pricePerMonth,
      price_per_extra_day: pv.pricePerExtraDay,
      late_fee_grace_hours: pv.lateFeeGraceHours,
      late_fee_hourly_amount: pv.lateFeeHourlyAmount,
      late_fee_hourly_max_hours: pv.lateFeeHourlyMaxHours,
      tiers: pv.tiers.map((t) => ({ min_days: t.minDays, price_per_day: t.pricePerDay })),
    };
  }

  async listPricingVersions() {
    const versions = await this.prisma.pricingVersion.findMany({
      include: {
        creator: true,
        tiers: { orderBy: { minDays: 'asc' } },
        _count: { select: { rentals: true } },
      },
      orderBy: { versionNumber: 'desc' },
    });
    return versions.map((v) => ({
      id: v.id,
      version_number: v.versionNumber,
      default_price_per_day: v.defaultPricePerDay,
      month_days: v.monthDays,
      price_per_month: v.pricePerMonth,
      price_per_extra_day: v.pricePerExtraDay,
      late_fee_grace_hours: v.lateFeeGraceHours,
      late_fee_hourly_amount: v.lateFeeHourlyAmount,
      late_fee_hourly_max_hours: v.lateFeeHourlyMaxHours,
      tiers: v.tiers.map((t) => ({ min_days: t.minDays, price_per_day: t.pricePerDay })),
      note: v.note,
      creator_name: v.creator?.name || 'Admin',
      rental_count: v._count.rentals,
      is_active: v.isActive,
      created_at: v.createdAt,
    }));
  }

  async createNewPricingVersion(
    creatorId: string | undefined,
    dto: {
      default_price_per_day: number;
      month_days?: number;
      price_per_month: number;
      price_per_extra_day: number;
      late_fee_grace_hours?: number;
      late_fee_hourly_amount?: number;
      late_fee_hourly_max_hours?: number;
      note?: string;
      tiers: Array<{ min_days: number; price_per_day: number }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.pricingVersion.findFirst({ orderBy: { versionNumber: 'desc' } });
      const nextVersion = (latest?.versionNumber || 0) + 1;

      await tx.pricingVersion.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      const created = await tx.pricingVersion.create({
        data: {
          versionNumber: nextVersion,
          defaultPricePerDay: Number(dto.default_price_per_day) || 150000,
          monthDays: Number(dto.month_days) || 30,
          pricePerMonth: Number(dto.price_per_month) || 2100000,
          pricePerExtraDay: Number(dto.price_per_extra_day) || 70000,
          lateFeeGraceHours: Number(dto.late_fee_grace_hours) ?? 1,
          lateFeeHourlyAmount: Number(dto.late_fee_hourly_amount) || 20000,
          lateFeeHourlyMaxHours: Number(dto.late_fee_hourly_max_hours) || 8,
          note: dto.note || `Cập nhật bảng giá v${nextVersion}`,
          isActive: true,
          creatorId: creatorId || null,
          tiers: {
            create: (dto.tiers || []).map((t) => ({
              minDays: Number(t.min_days),
              pricePerDay: Number(t.price_per_day),
            })),
          },
        },
        include: { tiers: true },
      });
      return created;
    });
  }

  // ==================== DISCOUNT CODES ====================
  async listDiscountCodes() {
    const items = await this.prisma.discountCode.findMany({
      where: { deleted: false },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: items.map((d) => ({
        id: d.id,
        code: d.code,
        code_normalized: d.codeNormalized,
        name: d.name,
        description: d.description,
        scope: d.scope,
        value_type: d.valueType,
        percent_basis_points: d.percentBasisPoints,
        fixed_amount: d.fixedAmount,
        start_date: d.startDate,
        end_date: d.endDate,
        active: d.active,
        usage_count: d.usageCount,
        availability_status: d.active ? 'available' : 'inactive',
        created_at: d.createdAt,
      })),
    };
  }

  async createDiscountCode(dto: {
    code: string;
    name: string;
    description?: string;
    scope?: string;
    value_type?: string;
    fixed_amount?: number;
    percent_basis_points?: number;
    start_date?: string;
    end_date?: string;
  }) {
    if (!dto.code?.trim()) throw new BadRequestException('Vui lòng nhập mã giảm giá');
    const codeNorm = dto.code.trim().toUpperCase();
    return this.prisma.discountCode.create({
      data: {
        code: codeNorm,
        codeNormalized: codeNorm,
        name: dto.name || codeNorm,
        description: dto.description || null,
        scope: dto.scope || 'order',
        valueType: dto.value_type || 'fixed',
        fixedAmount: dto.fixed_amount ? Number(dto.fixed_amount) : null,
        percentBasisPoints: dto.percent_basis_points ? Number(dto.percent_basis_points) : null,
        startDate: dto.start_date ? new Date(dto.start_date) : new Date(),
        endDate: dto.end_date ? new Date(dto.end_date) : null,
        active: true,
      },
    });
  }

  async toggleDiscountCode(id: string, active: boolean) {
    return this.prisma.discountCode.update({
      where: { id },
      data: { active },
    });
  }

  async deleteDiscountCode(id: string) {
    return this.prisma.discountCode.update({
      where: { id },
      data: { deleted: true, active: false },
    });
  }

  // ==================== STAFF ====================
  async listStaff() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      active: u.active,
      created_at: u.createdAt,
    }));
  }

  async createStaff(dto: {
    username: string;
    email: string;
    password?: string;
    name: string;
    phone?: string;
    role?: string;
  }) {
    if (!dto.username?.trim() || !dto.name?.trim()) {
      throw new BadRequestException('Vui lòng nhập đầy đủ username và họ tên nhân viên');
    }
    return this.prisma.user.create({
      data: {
        username: dto.username.trim(),
        email: dto.email?.trim() || `${dto.username.trim()}@rental.com`,
        passwordHash: PasswordHelper.hash(dto.password || '12345678'),
        name: dto.name.trim(),
        phone: dto.phone || null,
        role: dto.role || 'staff',
        active: true,
      },
    });
  }
}

