import 'dotenv/config';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PasswordHelper } from '../security/password.helper.js';

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Seeding EV Rental Database...');

  // 1. Seed Users (Admin + Staff)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: PasswordHelper.hash('K!ba16032002'),
      name: 'Ruby Admin',
      role: 'admin',
      active: true,
    },
    create: {
      username: 'admin',
      email: 'admin@rental.com',
      passwordHash: PasswordHelper.hash('K!ba16032002'),
      name: 'Ruby Admin',
      phone: '0905123456',
      role: 'admin',
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'staff01' },
    update: {},
    create: {
      username: 'staff01',
      email: 'staff01@rental.com',
      passwordHash: PasswordHelper.hash('12345678'),
      name: 'Minh Tuấn (Vận hành)',
      phone: '0905888999',
      role: 'staff',
      active: true,
    },
  });

  // 2. Seed Pricing Versions
  const existingPv = await prisma.pricingVersion.findFirst({ where: { versionNumber: 2 } });
  let activePricingId = existingPv?.id;

  if (!existingPv) {
    await prisma.pricingVersion.upsert({
      where: { versionNumber: 1 },
      update: {},
      create: {
        versionNumber: 1,
        defaultPricePerDay: 150000,
        monthDays: 30,
        pricePerMonth: 2200000,
        pricePerExtraDay: 75000,
        lateFeeGraceHours: 1,
        lateFeeHourlyAmount: 20000,
        lateFeeHourlyMaxHours: 8,
        note: 'Bảng giá gốc khởi tạo hệ thống',
        isActive: false,
        creatorId: admin.id,
        tiers: {
          create: [
            { minDays: 4, pricePerDay: 135000 },
            { minDays: 7, pricePerDay: 115000 },
            { minDays: 15, pricePerDay: 75000 },
          ],
        },
      },
    });

    const pv2 = await prisma.pricingVersion.create({
      data: {
        versionNumber: 2,
        defaultPricePerDay: 150000,
        monthDays: 30,
        pricePerMonth: 2100000,
        pricePerExtraDay: 70000,
        lateFeeGraceHours: 1,
        lateFeeHourlyAmount: 20000,
        lateFeeHourlyMaxHours: 8,
        note: 'Bảng giá tiêu chuẩn hiện hành (v2)',
        isActive: true,
        creatorId: admin.id,
        tiers: {
          create: [
            { minDays: 4, pricePerDay: 130000 },
            { minDays: 7, pricePerDay: 110000 },
            { minDays: 15, pricePerDay: 70000 },
          ],
        },
      },
    });
    activePricingId = pv2.id;
  }

  // 3. Seed Discount Codes
  const dc1 = await prisma.discountCode.upsert({
    where: { code: 'GIAMGIA10K' },
    update: {},
    create: {
      code: 'GIAMGIA10K',
      codeNormalized: 'GIAMGIA10K',
      name: 'Giảm giá 10k/Xe/Ngày',
      description: 'Giảm trực tiếp 10.000đ trên mỗi xe mỗi ngày thuê',
      scope: 'asset_daily',
      valueType: 'fixed',
      fixedAmount: 10000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
      active: true,
      usageCount: 3,
    },
  });

  await prisma.discountCode.upsert({
    where: { code: 'KHACHQUEN10' },
    update: {},
    create: {
      code: 'KHACHQUEN10',
      codeNormalized: 'KHACHQUEN10',
      name: 'Ưu đãi khách quen 10%',
      description: 'Giảm 10% tổng hóa đơn cho khách hàng thân thiết',
      scope: 'order',
      valueType: 'percent',
      percentBasisPoints: 1000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
      active: true,
      usageCount: 5,
    },
  });

  // 4. Seed Assets (Vehicles R1..R25 & Batteries PIN-01..PIN-10)
  const assetRecords = [];
  for (let i = 1; i <= 25; i++) {
    const qrCode = `XE-${String(100000 + i * 7321).slice(0, 6)}`;
    const name = `R${i}${i === 5 ? ' (Đen)' : i === 12 ? ' (Trắng)' : ''}`;
    const plate = `43MĐ1-${String(10000 + i * 111).slice(0, 5)}`;
    const a = await prisma.asset.upsert({
      where: { qrCode },
      update: {},
      create: {
        name,
        qrCode,
        type: 'electric_moto',
        status: i <= 6 ? 'rented' : i === 25 ? 'maintenance' : 'available',
        licensePlate: plate,
        notes: i === 25 ? 'Đang bảo dưỡng phanh & kiểm tra pin' : 'Xe máy điện VinFast Evo200',
      },
    });
    assetRecords.push(a);
  }

  for (let i = 1; i <= 10; i++) {
    const qrCode = `PIN-${String(200000 + i * 4111).slice(0, 6)}`;
    const name = `PIN-${String(i).padStart(2, '0')}`;
    await prisma.asset.upsert({
      where: { qrCode },
      update: {},
      create: {
        name,
        qrCode,
        type: 'battery',
        status: i <= 2 ? 'rented' : 'available',
        notes: 'Pin LFP dung lượng cao 3.5kWh',
      },
    });
  }

  // 5. Seed Sample Customers & Rentals if none exist yet
  const existingRentals = await prisma.rental.count();
  if (existingRentals === 0) {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const cust1 = await prisma.customer.create({
      data: {
        name: 'TRẦN TRUNG KIÊN',
        birthDate: new Date('2000-01-25'),
        idType: 'cccd',
        idNumber: '036200008935',
        gender: 'Nam',
        nationality: 'Việt Nam',
        placeOfOrigin: 'Nam Định',
        residenceAddress: '08 Loseby, Phường Phước Mỹ, Quận Sơn Trà, Đà Nẵng',
        contactChannels: {
          create: [{ channelType: 'zalo', contactValue: '0912345678', isPrimary: true }],
        },
      },
    });

    const cust2 = await prisma.customer.create({
      data: {
        name: 'NGUYỄN THỊ HỒNG NGỌC',
        birthDate: new Date('1998-06-14'),
        idType: 'cccd',
        idNumber: '048198004512',
        gender: 'Nữ',
        nationality: 'Việt Nam',
        placeOfOrigin: 'Đà Nẵng',
        residenceAddress: '124 Nguyễn Văn Thoại, Ngũ Hành Sơn, Đà Nẵng',
        contactChannels: {
          create: [{ channelType: 'phone', contactValue: '0835450800', isPrimary: true }],
        },
      },
    });

    const cust3 = await prisma.customer.create({
      data: {
        name: 'LÊ HOÀNG NAM',
        birthDate: new Date('1995-11-02'),
        idType: 'cccd',
        idNumber: '001095012388',
        gender: 'Nam',
        nationality: 'Việt Nam',
        placeOfOrigin: 'Hà Nội',
        residenceAddress: 'Khu phố Tây An Thượng 2, Đà Nẵng',
        contactChannels: {
          create: [{ channelType: 'phone', contactValue: '0988776655', isPrimary: true }],
        },
      },
    });

    const cust4 = await prisma.customer.create({
      data: {
        name: 'PHẠM MINH CHÂU',
        birthDate: new Date('2001-03-19'),
        idType: 'cccd',
        idNumber: '079301009911',
        gender: 'Nữ',
        nationality: 'Việt Nam',
        placeOfOrigin: 'TP. Hồ Chí Minh',
        residenceAddress: '215 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
        contactChannels: {
          create: [{ channelType: 'zalo', contactValue: '0933112244', isPrimary: true }],
        },
      },
    });

    // Rental 1: Active, partially paid (Cashflow remaining)
    const r1Start = new Date(now.getTime() - 1 * dayMs);
    const r1End = new Date(r1Start.getTime() + 4 * dayMs);
    await prisma.rental.create({
      data: {
        code: 'HD-03112026-0001',
        status: 'active',
        customerId: cust1.id,
        creatorId: admin.id,
        pricingVersionId: activePricingId,
        pricingVersionNumber: 2,
        durationDays: 4,
        startAt: r1Start,
        expectedReturnAt: r1End,
        originalTotalAmount: 520000,
        discountAmount: 0,
        totalAmount: 520000,
        deposit: 500000,
        heldDepositAmount: 500000,
        paidAmount: 200000,
        remainingBalance: 320000,
        notes: 'Giao xe tại 08 Loseby, khách cọc 500k',
        items: {
          create: [
            {
              assetId: assetRecords[0].id,
              status: 'active',
              startAt: r1Start,
              expectedReturnAt: r1End,
              durationDays: 4,
              baseAmount: 520000,
            },
          ],
        },
        payments: {
          create: [
            { amount: 200000, type: 'prepayment', method: 'bank_transfer', paidAt: r1Start },
            { amount: 500000, type: 'deposit_collect', method: 'bank_transfer', paidAt: r1Start },
          ],
        },
      },
    });

    // Rental 2: Active & OVERDUE return + unpaid balance (for action-required testing)
    const r2Start = new Date(now.getTime() - 6 * dayMs);
    const r2End = new Date(now.getTime() - 1 * dayMs); // Overdue by 1 day
    await prisma.rental.create({
      data: {
        code: 'HD-29102026-0002',
        status: 'active',
        customerId: cust2.id,
        creatorId: admin.id,
        pricingVersionId: activePricingId,
        pricingVersionNumber: 2,
        durationDays: 5,
        startAt: r2Start,
        expectedReturnAt: r2End,
        originalTotalAmount: 1300000,
        discountAmount: 0,
        totalAmount: 1300000,
        deposit: 1000000,
        heldDepositAmount: 1000000,
        paidAmount: 650000,
        remainingBalance: 650000,
        notes: 'Thuê 2 xe đi Hội An, quá hạn trả cần liên hệ khách',
        items: {
          create: [
            {
              assetId: assetRecords[1].id,
              status: 'active',
              startAt: r2Start,
              expectedReturnAt: r2End,
              durationDays: 5,
              baseAmount: 650000,
            },
            {
              assetId: assetRecords[2].id,
              status: 'active',
              startAt: r2Start,
              expectedReturnAt: r2End,
              durationDays: 5,
              baseAmount: 650000,
            },
          ],
        },
        payments: {
          create: [
            { amount: 650000, type: 'prepayment', method: 'cash', paidAt: r2Start },
          ],
        },
      },
    });

    // Rental 3: Active due today
    const r3Start = new Date(now.getTime() - 3 * dayMs);
    const r3End = new Date(now.getTime() + 3 * 60 * 60 * 1000); // Due in 3 hours today
    await prisma.rental.create({
      data: {
        code: 'HD-01112026-0003',
        status: 'active',
        customerId: cust3.id,
        creatorId: admin.id,
        pricingVersionId: activePricingId,
        pricingVersionNumber: 2,
        discountCodeId: dc1.id,
        durationDays: 3,
        startAt: r3Start,
        expectedReturnAt: r3End,
        originalTotalAmount: 450000,
        discountAmount: 30000,
        totalAmount: 420000,
        deposit: 0,
        heldDepositAmount: 0,
        paidAmount: 420000,
        remainingBalance: 0,
        notes: 'Đã thanh toán đủ 100%, đến hạn trả hôm nay',
        items: {
          create: [
            {
              assetId: assetRecords[3].id,
              status: 'active',
              startAt: r3Start,
              expectedReturnAt: r3End,
              durationDays: 3,
              baseAmount: 450000,
            },
          ],
        },
        payments: {
          create: [
            { amount: 420000, type: 'prepayment', method: 'bank_transfer', paidAt: r3Start },
          ],
        },
      },
    });

    // Rental 4: Monthly package active
    const r4Start = new Date(now.getTime() - 2 * dayMs);
    const r4End = new Date(r4Start.getTime() + 30 * dayMs);
    await prisma.rental.create({
      data: {
        code: 'HD-02112026-0004',
        status: 'active',
        customerId: cust4.id,
        creatorId: admin.id,
        pricingVersionId: activePricingId,
        pricingVersionNumber: 2,
        durationDays: 30,
        startAt: r4Start,
        expectedReturnAt: r4End,
        originalTotalAmount: 4200000,
        discountAmount: 0,
        totalAmount: 4200000,
        deposit: 1000000,
        heldDepositAmount: 1000000,
        paidAmount: 3000000,
        remainingBalance: 1200000,
        notes: 'Gói thuê tháng 2 xe R5 + R6',
        items: {
          create: [
            {
              assetId: assetRecords[4].id,
              status: 'active',
              startAt: r4Start,
              expectedReturnAt: r4End,
              durationDays: 30,
              baseAmount: 2100000,
            },
            {
              assetId: assetRecords[5].id,
              status: 'active',
              startAt: r4Start,
              expectedReturnAt: r4End,
              durationDays: 30,
              baseAmount: 2100000,
            },
          ],
        },
        payments: {
          create: [
            { amount: 3000000, type: 'prepayment', method: 'bank_transfer', paidAt: r4Start },
          ],
        },
      },
    });

    // Rental 5: Returned & completed today
    const r5Start = new Date(now.getTime() - 4 * dayMs);
    const r5End = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    await prisma.rental.create({
      data: {
        code: 'HD-31102026-0005',
        status: 'returned',
        customerId: cust1.id,
        creatorId: admin.id,
        pricingVersionId: activePricingId,
        pricingVersionNumber: 2,
        durationDays: 4,
        startAt: r5Start,
        expectedReturnAt: r5End,
        actualReturnAt: now,
        originalTotalAmount: 520000,
        discountAmount: 0,
        totalAmount: 520000,
        deposit: 0,
        heldDepositAmount: 0,
        paidAmount: 520000,
        remainingBalance: 0,
        notes: 'Đã trả xe đúng hạn và quyết toán đủ',
        items: {
          create: [
            {
              assetId: assetRecords[6].id,
              status: 'returned',
              startAt: r5Start,
              expectedReturnAt: r5End,
              actualReturnAt: now,
              durationDays: 4,
              baseAmount: 520000,
            },
          ],
        },
        payments: {
          create: [
            { amount: 520000, type: 'settlement', method: 'cash', paidAt: now },
          ],
        },
      },
    });

    // Seed sample upcoming booking
    await prisma.booking.create({
      data: {
        code: 'DL-20261105-001',
        status: 'confirmed',
        customerId: cust2.id,
        customerName: 'Nguyễn Thị Hồng Ngọc',
        customerPhone: '0835450800',
        pickupAt: new Date(now.getTime() + 1 * dayMs),
        expectedReturnAt: new Date(now.getTime() + 5 * dayMs),
        durationDays: 4,
        deliveryRequired: true,
        deliveryAddress: 'Sảnh khách sạn Mường Thanh, Đà Nẵng',
        depositAmount: 200000,
        notes: 'Khách đặt trước 2 xe giao tận nơi lúc 9h sáng',
        items: {
          create: [{ assetId: assetRecords[7].id }, { assetId: assetRecords[8].id }],
        },
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});

