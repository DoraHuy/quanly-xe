import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      console.error(
        '⚠️ [CRITICAL] DATABASE_URL (hoặc DIRECT_URL) không được thiết lập! Vui lòng thêm biến môi trường DATABASE_URL trong Vercel Settings -> Environment Variables.',
      );
    }
    const adapter = new PrismaPg({ connectionString: connectionString || '' });
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err: any) {
      console.error('⚠️ [CRITICAL] Không thể kết nối cơ sở dữ liệu qua PrismaPg:', err?.message || err);
      // Không crash tiến trình để exception filter có thể trả về phản hồi JSON có ý nghĩa cho client
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

