import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: pg.Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
    if (!connectionString) {
      console.error(
        '⚠️ [CRITICAL] DATABASE_URL (hoặc DIRECT_URL) không được thiết lập! Vui lòng thêm biến môi trường DATABASE_URL trong Vercel Settings -> Environment Variables.',
      );
    }

    const isLocalhost =
      connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

    const pool = new pg.Pool({
      connectionString,
      ssl: isLocalhost
        ? false
        : {
            rejectUnauthorized: false,
          },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Prisma connected to PostgreSQL successfully');
    } catch (err: any) {
      console.error('⚠️ [CRITICAL] Không thể kết nối cơ sở dữ liệu qua PrismaPg:', err?.message || err);
      // Không crash tiến trình để exception filter có thể trả về phản hồi JSON có ý nghĩa cho client
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      await this.pool?.end();
    } catch {
      // ignore
    }
  }
}

