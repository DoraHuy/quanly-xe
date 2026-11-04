import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './infrastructure/database/prisma.service.js';
import { SupabaseStorageService } from './infrastructure/storage/supabase-storage.service.js';
import { DocumentOcrService } from './infrastructure/ocr/document-ocr.service.js';
import { AuthApplicationService } from './application/services/auth.application-service.js';
import { DashboardApplicationService } from './application/services/dashboard.application-service.js';
import { RentalApplicationService } from './application/services/rental.application-service.js';
import { ReturnApplicationService } from './application/services/return.application-service.js';
import { SwapApplicationService } from './application/services/swap.application-service.js';
import { OperationsApplicationService } from './application/services/operations.application-service.js';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard.js';
import { ApiController } from './presentation/controllers/api.controller.js';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'ev-rental-super-secret-jwt-key-2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AppController, ApiController],
  providers: [
    AppService,
    PrismaService,
    SupabaseStorageService,
    DocumentOcrService,
    AuthApplicationService,
    DashboardApplicationService,
    RentalApplicationService,
    ReturnApplicationService,
    SwapApplicationService,
    OperationsApplicationService,
    JwtAuthGuard,
  ],
})
export class AppModule {}
