import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

export interface DashboardFilterQuery {
  period?: 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';
  from?: string;
  to?: string;
}

@Injectable()
export class DashboardApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateRange(filter: DashboardFilterQuery): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (filter.from && filter.to) {
      return {
        startDate: new Date(filter.from),
        endDate: new Date(new Date(filter.to).setHours(23, 59, 59, 999)),
      };
    }

    switch (filter.period) {
      case 'day': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        return { startDate: start, endDate: endOfToday };
      }
      case 'week': {
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
        return { startDate: monday, endDate: endOfToday };
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return { startDate: start, endDate: endOfToday };
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        return { startDate: start, endDate: endOfToday };
      }
      default: {
        const start = new Date(now.getFullYear() - 5, 0, 1);
        return { startDate: start, endDate: endOfToday };
      }
    }
  }

  async getDashboardData(filter: DashboardFilterQuery = {}) {
    const now = new Date();
    const { startDate, endDate } = this.getDateRange(filter);

    const [allAssets, allRentals, allPayments, pendingBookingsCount, upcomingBookings] =
      await Promise.all([
        this.prisma.asset.findMany(),
        this.prisma.rental.findMany({
          where: { status: { not: 'cancelled' } },
          include: {
            customer: true,
            items: { include: { asset: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.payment.findMany({
          orderBy: { paidAt: 'desc' },
        }),
        this.prisma.booking.count({
          where: { status: { in: ['pending', 'confirmed'] } },
        }),
        this.prisma.booking.findMany({
          where: { status: { in: ['pending', 'confirmed'] } },
          include: { items: { include: { asset: true } } },
          orderBy: { pickupAt: 'asc' },
          take: 5,
        }),
      ]);

    // Filter rentals in selected date range for financial metrics
    const filteredRentals = allRentals.filter(
      (r) => r.startAt >= startDate && r.startAt <= endDate,
    );

    const totalRevenue = filteredRentals.reduce(
      (sum, r) => sum + r.totalAmount + r.lateFee,
      0,
    );
    const collectedRevenue = filteredRentals.reduce((sum, r) => sum + r.paidAmount, 0);
    const outstandingRevenue = filteredRentals.reduce(
      (sum, r) => sum + r.remainingBalance,
      0,
    );
    const heldDeposit = allRentals
      .filter((r) => r.status === 'active')
      .reduce((sum, r) => sum + r.heldDepositAmount, 0);

    // Active & Overdue calculations
    const activeRentalsList = allRentals.filter((r) => r.status === 'active');
    const overdueReturnList = activeRentalsList.filter((r) => r.expectedReturnAt < now);
    const overdueCashflowList = allRentals.filter((r) => r.remainingBalance > 0);

    // Asset counts
    const assetStatusCounts = {
      available: allAssets.filter((a) => a.status === 'available').length,
      rented: allAssets.filter((a) => a.status === 'rented').length,
      maintenance: allAssets.filter((a) => a.status === 'maintenance').length,
      total: allAssets.length,
    };

    const vehicles = allAssets.filter((a) => a.type === 'electric_moto');
    const batteries = allAssets.filter((a) => a.type === 'battery');
    const accessories = allAssets.filter((a) => a.type === 'accessory');

    const assetStatusByType = {
      vehicle: {
        available: vehicles.filter((a) => a.status === 'available').length,
        rented: vehicles.filter((a) => a.status === 'rented').length,
        maintenance: vehicles.filter((a) => a.status === 'maintenance').length,
        total: vehicles.length,
      },
      battery: {
        available: batteries.filter((a) => a.status === 'available').length,
        rented: batteries.filter((a) => a.status === 'rented').length,
        maintenance: batteries.filter((a) => a.status === 'maintenance').length,
        total: batteries.length,
      },
      accessory: {
        available: accessories.filter((a) => a.status === 'available').length,
        rented: accessories.filter((a) => a.status === 'rented').length,
        maintenance: accessories.filter((a) => a.status === 'maintenance').length,
        total: accessories.length,
      },
    };

    const utilizationRate =
      vehicles.length > 0
        ? Math.round(
            (vehicles.filter((v) => v.status === 'rented').length / vehicles.length) * 100,
          )
        : 0;

    // Milestones: Today, This Week, This Month, This Year
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);

    const buildMilestone = (label: string, period: string, from: Date) => {
      const sub = allRentals.filter((r) => r.startAt >= from);
      const subPayments = allPayments.filter((p) => p.paidAt >= from && p.amount > 0);
      return {
        label,
        period,
        orderRevenue: sub.reduce((s, r) => s + r.totalAmount + r.lateFee, 0),
        collectedRevenue: sub.reduce((s, r) => s + r.paidAmount, 0),
        outstandingRevenue: sub.reduce((s, r) => s + r.remainingBalance, 0),
        bookings: sub.length,
        payments: subPayments.length,
      };
    };

    const revenueMilestones = [
      buildMilestone('Hôm nay', 'day', startOfToday),
      buildMilestone('Tuần này', 'week', startOfWeek),
      buildMilestone('Tháng này', 'month', startOfMonth),
      buildMilestone('Năm nay', 'year', startOfYear),
    ];

    // Weekly revenue (Mon..Sun of current week)
    const weekLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const weeklyRevenue = weekLabels.map((label, idx) => {
      const dayStart = new Date(
        startOfWeek.getFullYear(),
        startOfWeek.getMonth(),
        startOfWeek.getDate() + idx,
        0,
        0,
        0,
      );
      const dayEnd = new Date(
        startOfWeek.getFullYear(),
        startOfWeek.getMonth(),
        startOfWeek.getDate() + idx,
        23,
        59,
        59,
        999,
      );
      const dayRentals = allRentals.filter((r) => r.startAt >= dayStart && r.startAt <= dayEnd);
      const orderRev = dayRentals.reduce((s, r) => s + r.totalAmount + r.lateFee, 0);
      const collectedRev = dayRentals.reduce((s, r) => s + r.paidAmount, 0);
      const outstandingRev = dayRentals.reduce((s, r) => s + r.remainingBalance, 0);
      return {
        label,
        value: orderRev,
        orderRevenue: orderRev,
        collectedRevenue: collectedRev,
        outstandingRevenue: outstandingRev,
        bookings: dayRentals.length,
      };
    });

    // Monthly daily breakdown (last 14 days or days in current month)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthDaysData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dStart = new Date(now.getFullYear(), now.getMonth(), d, 0, 0, 0);
      const dEnd = new Date(now.getFullYear(), now.getMonth(), d, 23, 59, 59, 999);
      const dayRentals = allRentals.filter((r) => r.startAt >= dStart && r.startAt <= dEnd);
      const orderRev = dayRentals.reduce((s, r) => s + r.totalAmount + r.lateFee, 0);
      const collectedRev = dayRentals.reduce((s, r) => s + r.paidAmount, 0);
      const outstandingRev = dayRentals.reduce((s, r) => s + r.remainingBalance, 0);
      monthDaysData.push({
        label: String(d).padStart(2, '0'),
        revenue: orderRev,
        orderRevenue: orderRev,
        collectedRevenue: collectedRev,
        outstandingRevenue: outstandingRev,
        bookings: dayRentals.length,
      });
    }

    const monthRentals = allRentals.filter((r) => r.startAt >= startOfMonth);
    const monthOrderTotal = monthRentals.reduce((s, r) => s + r.totalAmount + r.lateFee, 0);
    const monthCollectedTotal = monthRentals.reduce((s, r) => s + r.paidAmount, 0);
    const monthOutstandingTotal = monthRentals.reduce((s, r) => s + r.remainingBalance, 0);

    return {
      filterApplied: {
        period: filter.period || 'all',
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      metrics: {
        activeRentals: activeRentalsList.length,
        rentedVehiclesCount: vehicles.filter((v) => v.status === 'rented').length,
        availableAssets: assetStatusCounts.available,
        overdueRentals: overdueReturnList.length,
        overdueCashflowCount: overdueCashflowList.length,
        pendingBookings: pendingBookingsCount,
        totalRevenue,
        collectedRevenue,
        outstandingRevenue,
        heldDeposit,
        utilizationRate,
        filteredOrderCount: filteredRentals.length,
      },
      revenueMilestones,
      weeklyRevenue,
      monthlyRevenue: [
        {
          month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          label: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`,
          total: monthOrderTotal,
          collectedTotal: monthCollectedTotal,
          outstandingTotal: monthOutstandingTotal,
          target: 150000000,
          bookings: monthRentals.length,
          averageOrderValue:
            monthRentals.length > 0 ? Math.round(monthOrderTotal / monthRentals.length) : 0,
          days: monthDaysData,
        },
      ],
      assetStatusCounts,
      assetStatusByType,
      rentalStatusCounts: {
        active: activeRentalsList.length,
        returned: allRentals.filter((r) => r.status === 'returned').length,
        overdue: overdueReturnList.length,
        overdueCashflow: overdueCashflowList.length,
        total: allRentals.length,
      },
      attentionRentals: activeRentalsList
        .filter((r) => r.expectedReturnAt < now || r.remainingBalance > 0)
        .slice(0, 6)
        .map((r) => ({
          id: r.id,
          code: r.code,
          customerName: r.customer.name,
          totalAmount: r.totalAmount + r.lateFee,
          paidAmount: r.paidAmount,
          remainingBalance: r.remainingBalance,
          expectedReturnAt: r.expectedReturnAt,
          isOverdueReturn: r.expectedReturnAt < now,
          assets: r.items.map((i) => ({ name: i.asset.name, qrCode: i.asset.qrCode })),
        })),
      upcomingBookings,
    };
  }

  async getActionRequiredCounts() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
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

    const activeRentals = await this.prisma.rental.findMany({
      where: { status: 'active' },
    });

    const overdue = activeRentals.filter((r) => r.expectedReturnAt < now).length;
    const dueToday = activeRentals.filter(
      (r) => r.expectedReturnAt >= now && r.expectedReturnAt <= endOfToday,
    ).length;
    const dueTomorrow = activeRentals.filter(
      (r) => r.expectedReturnAt > endOfToday && r.expectedReturnAt <= endOfTomorrow,
    ).length;
    const overdueFull = activeRentals.filter((r) => r.remainingBalance > 0).length;

    const activeBookings = await this.prisma.booking.findMany({
      where: { status: { in: ['pending', 'confirmed'] } },
    });

    const bookingPending = activeBookings.filter((b) => b.status === 'pending').length;
    const bookingToday = activeBookings.filter(
      (b) => b.pickupAt >= startOfToday && b.pickupAt <= endOfToday,
    ).length;
    const bookingTomorrow = activeBookings.filter(
      (b) => b.pickupAt > endOfToday && b.pickupAt <= endOfTomorrow,
    ).length;

    return {
      rentals: {
        due_today: dueToday,
        due_tomorrow: dueTomorrow,
        overdue,
        warning: dueToday,
        overdue_full: overdueFull,
        total: new Set([
          ...activeRentals.filter((r) => r.expectedReturnAt <= endOfTomorrow).map((r) => r.id),
          ...activeRentals.filter((r) => r.remainingBalance > 0).map((r) => r.id),
        ]).size,
      },
      bookings: {
        pending: bookingPending,
        today: bookingToday,
        tomorrow: bookingTomorrow,
        total: activeBookings.length,
      },
    };
  }
}

