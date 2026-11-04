import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

@Injectable()
export class SwapApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async executeSwap(
    userId: string | undefined,
    dto: {
      rental_id?: string;
      old_asset_id: string;
      new_asset_id: string;
      old_asset_status?: 'available' | 'maintenance';
      reason?: string;
    },
  ) {
    if (dto.old_asset_id === dto.new_asset_id) {
      throw new BadRequestException('Tài sản mới phải khác tài sản cũ');
    }

    return this.prisma.$transaction(async (tx) => {
      // Find active rental item for old_asset_id
      const rentalItem = await tx.rentalItem.findFirst({
        where: {
          assetId: dto.old_asset_id,
          status: 'active',
          ...(dto.rental_id ? { rentalId: dto.rental_id } : {}),
          rental: { status: 'active' },
        },
        include: {
          rental: { include: { customer: true } },
          asset: true,
        },
      });

      if (!rentalItem) {
        throw new NotFoundException('Không tìm thấy đơn thuê đang hoạt động gắn với tài sản cần đổi');
      }

      const newAsset = await tx.asset.findUnique({
        where: { id: dto.new_asset_id },
      });

      if (!newAsset) {
        throw new NotFoundException('Không tìm thấy tài sản thay thế');
      }
      if (newAsset.status !== 'available') {
        throw new BadRequestException(
          `Tài sản thay thế ${newAsset.name} (${newAsset.qrCode}) hiện không sẵn sàng (${newAsset.status})`,
        );
      }

      const targetOldStatus = dto.old_asset_status || 'available';

      // 1. Update old asset status
      await tx.asset.update({
        where: { id: dto.old_asset_id },
        data: { status: targetOldStatus },
      });

      // 2. Update new asset status to 'rented'
      await tx.asset.update({
        where: { id: dto.new_asset_id },
        data: { status: 'rented' },
      });

      // 3. Update RentalItem to use the new asset
      await tx.rentalItem.update({
        where: { id: rentalItem.id },
        data: {
          assetId: dto.new_asset_id,
          swappedToId: dto.new_asset_id,
          swappedAt: new Date(),
        },
      });

      // 4. Create AssetSwap history record
      const swapRecord = await tx.assetSwap.create({
        data: {
          rentalId: rentalItem.rentalId,
          oldAssetId: dto.old_asset_id,
          newAssetId: dto.new_asset_id,
          performedBy: userId || null,
          reason: dto.reason || 'Đổi xe/pin theo yêu cầu vận hành',
        },
        include: {
          oldAsset: true,
          newAsset: true,
          rental: { include: { customer: true } },
        },
      });

      return swapRecord;
    });
  }

  async listRecentSwaps(limit = 20) {
    return this.prisma.assetSwap.findMany({
      include: {
        oldAsset: true,
        newAsset: true,
        performer: true,
        rental: { include: { customer: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

