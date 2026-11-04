import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { AuthApplicationService } from '../../application/services/auth.application-service.js';
import {
  DashboardApplicationService,
  type DashboardFilterQuery,
} from '../../application/services/dashboard.application-service.js';
import {
  RentalApplicationService,
  type CreateRentalPayload,
} from '../../application/services/rental.application-service.js';
import { ReturnApplicationService } from '../../application/services/return.application-service.js';
import { SwapApplicationService } from '../../application/services/swap.application-service.js';
import { OperationsApplicationService } from '../../application/services/operations.application-service.js';
import { DocumentOcrService } from '../../infrastructure/ocr/document-ocr.service.js';
import { SupabaseStorageService } from '../../infrastructure/storage/supabase-storage.service.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { CccdParserDomainService } from '../../domain/services/cccd-parser.domain-service.js';

@Controller('api')
export class ApiController {
  constructor(
    private readonly authService: AuthApplicationService,
    private readonly dashboardService: DashboardApplicationService,
    private readonly rentalService: RentalApplicationService,
    private readonly returnService: ReturnApplicationService,
    private readonly swapService: SwapApplicationService,
    private readonly opsService: OperationsApplicationService,
    private readonly ocrService: DocumentOcrService,
    private readonly storageService: SupabaseStorageService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== HEALTH ====================
  @Get('health')
  async health() {
    const hasDbUrl = Boolean(process.env.DATABASE_URL);
    const hasDirectUrl = Boolean(process.env.DIRECT_URL);
    let dbStatus = 'disconnected';
    let dbError: string | null = null;
    let userCount = 0;
    try {
      userCount = await this.prisma.user.count();
      dbStatus = 'connected';
    } catch (e: any) {
      dbError = e?.message || String(e);
    }
    return {
      status: 'ok',
      service: 'trengdien',
      timestamp: new Date().toISOString(),
      env: {
        hasDbUrl,
        hasDirectUrl,
      },
      database: {
        status: dbStatus,
        userCount,
        error: dbError,
      },
    };
  }

  // ==================== AUTH ====================
  @Post('auth/login')
  async login(@Body() body: { username?: string; password?: string }) {
    if (!body?.username || !body?.password) {
      throw new BadRequestException('Vui lòng nhập tên đăng nhập và mật khẩu');
    }
    const data = await this.authService.login(body.username, body.password);
    return { success: true, data };
  }

  @Post('auth/logout')
  async logout() {
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  async getMe(@Req() req: { user: { userId: string } }) {
    const user = await this.authService.getMe(req.user.userId);
    return { success: true, data: { user } };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('auth/profile')
  async updateProfile(
    @Req() req: { user: { userId: string } },
    @Body() body: { name?: string; email?: string; phone?: string },
  ) {
    const user = await this.authService.updateProfile(req.user.userId, body);
    return { success: true, data: { user } };
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/change-password')
  async changePassword(
    @Req() req: { user: { userId: string } },
    @Body() body: { current_password: string; new_password: string },
  ) {
    const data = await this.authService.changePassword(
      req.user.userId,
      body.current_password,
      body.new_password,
    );
    return { success: true, data };
  }

  // ==================== DASHBOARD & COUNTS ====================
  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async getDashboard(@Query() query: DashboardFilterQuery) {
    const data = await this.dashboardService.getDashboardData(query);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('action-required/counts')
  async getActionRequiredCounts() {
    const data = await this.dashboardService.getActionRequiredCounts();
    return { success: true, data };
  }

  // ==================== DOCUMENT OCR (my_cccd.py + QR + Tesseract) ====================
  @UseGuards(JwtAuthGuard)
  @Post('document-ocr/extract')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 12 * 1024 * 1024 },
    }),
  )
  async extractDocumentOcr(
    @UploadedFile()
    file:
      | { buffer: Buffer; mimetype?: string; originalname?: string; size?: number }
      | undefined,
    @Body() body: { source_option?: string; raw_text?: string; qr_payload?: string },
  ) {
    // Support direct text/QR parsing or image file upload
    if (!file && (body.raw_text || body.qr_payload)) {
      const fields = CccdParserDomainService.extractStructuredFields(
        body.raw_text || '',
        body.qr_payload,
      );
      return {
        success: true,
        data: {
          attempt_id: null,
          fields,
          raw_text: body.raw_text || body.qr_payload || '',
        },
      };
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn hoặc chụp ảnh CCCD / giấy tờ');
    }

    const [ocrResult, uploaded] = await Promise.all([
      this.ocrService.extractFromImageBuffer(file.buffer),
      this.storageService.uploadDocumentImage(
        file.buffer,
        file.mimetype || 'image/jpeg',
        file.originalname || 'cccd.jpg',
      ),
    ]);

    const docImage = await this.prisma.documentImage.create({
      data: {
        storageKey: uploaded.storageKey,
        bucket: uploaded.bucket,
        publicUrl: uploaded.publicUrl,
        mimeType: file.mimetype || 'image/jpeg',
        sizeBytes: file.size || file.buffer.length,
        sourceOption: body.source_option || 'upload',
        extractedData: ocrResult.fields as object,
      },
    });

    // Check if customer already exists in database by id_number
    let existingCustomer = null;
    if (ocrResult.fields.id_number) {
      existingCustomer = await this.prisma.customer.findFirst({
        where: { idNumber: ocrResult.fields.id_number },
        include: { contactChannels: true },
      });
    }

    return {
      success: true,
      data: {
        attempt_id: docImage.id,
        document_image_id: docImage.id,
        public_url: uploaded.publicUrl,
        fields: ocrResult.fields,
        qr_detected: ocrResult.qrDetected,
        raw_text: ocrResult.rawText,
        existing_customer: existingCustomer,
      },
    };
  }

  // ==================== RENTALS ====================
  @UseGuards(JwtAuthGuard)
  @Get('rentals')
  async listRentals(
    @Query()
    query: {
      status?: string;
      action_filter?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const data = await this.rentalService.listRentals(query);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('rentals/list')
  async listRentalsAlias(
    @Query()
    query: {
      status?: string;
      action_filter?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const data = await this.rentalService.listRentals(query);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('rentals/:id')
  async getRentalDetail(@Param('id') id: string) {
    const data = await this.rentalService.getRentalDetail(id);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rentals')
  async createRental(
    @Req() req: { user: { userId: string } },
    @Body() payload: CreateRentalPayload,
  ) {
    const data = await this.rentalService.createRental(req.user.userId, payload);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rentals/:id/payments')
  async addRentalPayment(
    @Param('id') id: string,
    @Body() body: { amount: number; type?: string; method?: string; note?: string },
  ) {
    const data = await this.rentalService.addPayment(id, body);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rentals/:id/extend')
  async extendRental(
    @Param('id') id: string,
    @Body() body: { extra_days: number; paid_amount?: number; method?: string; note?: string },
  ) {
    const data = await this.rentalService.extendRental(id, body);
    return { success: true, data };
  }

  // ==================== RETURNS ====================
  @UseGuards(JwtAuthGuard)
  @Get('returns/scan')
  async scanReturn(@Query('q') q: string) {
    const data = await this.returnService.scanOrSearchForReturn(q || '');
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('returns/sessions')
  async processReturn(
    @Req() req: { user: { userId: string } },
    @Body()
    body: {
      rental_id: string;
      item_ids?: string[];
      late_fee?: number;
      collected_amount?: number;
      deposit_refunded?: number;
      payment_method?: string;
      notes?: string;
    },
  ) {
    const data = await this.returnService.processReturnSession(req.user.userId, body);
    return { success: true, data };
  }

  // ==================== SWAP ====================
  @UseGuards(JwtAuthGuard)
  @Get('swap')
  async listSwaps() {
    const data = await this.swapService.listRecentSwaps();
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('swap')
  async executeSwap(
    @Req() req: { user: { userId: string } },
    @Body()
    body: {
      rental_id?: string;
      old_asset_id: string;
      new_asset_id: string;
      old_asset_status?: 'available' | 'maintenance';
      reason?: string;
    },
  ) {
    const data = await this.swapService.executeSwap(req.user.userId, body);
    return { success: true, data };
  }

  // ==================== ASSETS ====================
  @UseGuards(JwtAuthGuard)
  @Get('assets')
  async listAssets(
    @Query()
    query: {
      status?: string;
      type?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const data = await this.opsService.listAssets(query);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('assets')
  async createAsset(
    @Body()
    body: {
      name: string;
      qr_code?: string;
      type?: string;
      status?: string;
      license_plate?: string;
      notes?: string;
    },
  ) {
    const data = await this.opsService.createAsset(body);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('assets/:id')
  async updateAsset(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      qr_code?: string;
      type?: string;
      status?: string;
      license_plate?: string;
      notes?: string;
    },
  ) {
    const data = await this.opsService.updateAsset(id, body);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('assets/:id')
  async deleteAsset(@Param('id') id: string) {
    const data = await this.opsService.deleteAsset(id);
    return { success: true, data };
  }

  // ==================== CUSTOMERS ====================
  @UseGuards(JwtAuthGuard)
  @Get('customers')
  async listCustomers(@Query() query: { search?: string; page?: number; limit?: number }) {
    const data = await this.opsService.listCustomers(query);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('customers')
  async upsertCustomer(
    @Body()
    body: {
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
    },
  ) {
    const data = await this.opsService.upsertCustomer(body);
    return { success: true, data };
  }

  // ==================== BOOKINGS ====================
  @UseGuards(JwtAuthGuard)
  @Get('bookings')
  async listBookings(
    @Query() query: { status?: string; search?: string; page?: number; limit?: number },
  ) {
    const data = await this.opsService.listBookings(query);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('bookings')
  async createBooking(
    @Body()
    body: {
      customer_name: string;
      customer_phone: string;
      pickup_at: string;
      duration_days: number;
      asset_ids: string[];
      delivery_required?: boolean;
      delivery_address?: string;
      deposit_amount?: number;
      notes?: string;
    },
  ) {
    const data = await this.opsService.createBooking(body);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bookings/:id/status')
  async updateBookingStatus(@Param('id') id: string, @Body() body: { status: string }) {
    const data = await this.opsService.updateBookingStatus(id, body.status);
    return { success: true, data };
  }

  // ==================== PRICING ====================
  @UseGuards(JwtAuthGuard)
  @Get('pricing/active')
  async getActivePricing() {
    const data = await this.opsService.getActivePricing();
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('pricing/versions')
  async listPricingVersions() {
    const data = await this.opsService.listPricingVersions();
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('pricing/versions')
  async createPricingVersion(
    @Req() req: { user: { userId: string } },
    @Body()
    body: {
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
    const data = await this.opsService.createNewPricingVersion(req.user.userId, body);
    return { success: true, data };
  }

  // ==================== DISCOUNT CODES ====================
  @UseGuards(JwtAuthGuard)
  @Get('discount-codes')
  async listDiscountCodes() {
    const data = await this.opsService.listDiscountCodes();
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('discount-codes')
  async createDiscountCode(
    @Body()
    body: {
      code: string;
      name: string;
      description?: string;
      scope?: string;
      value_type?: string;
      fixed_amount?: number;
      percent_basis_points?: number;
      start_date?: string;
      end_date?: string;
    },
  ) {
    const data = await this.opsService.createDiscountCode(body);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('discount-codes/:id')
  async toggleDiscountCode(@Param('id') id: string, @Body() body: { active: boolean }) {
    const data = await this.opsService.toggleDiscountCode(id, body.active);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('discount-codes/:id')
  async deleteDiscountCode(@Param('id') id: string) {
    const data = await this.opsService.deleteDiscountCode(id);
    return { success: true, data };
  }

  // ==================== STAFF ====================
  @UseGuards(JwtAuthGuard)
  @Get('staff')
  async listStaff() {
    const data = await this.opsService.listStaff();
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('staff')
  async createStaff(
    @Body()
    body: {
      username: string;
      email?: string;
      password?: string;
      name: string;
      phone?: string;
      role?: string;
    },
  ) {
    const data = await this.opsService.createStaff(body);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('staff/:id')
  async toggleStaff(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: { active: boolean },
  ) {
    const data = await this.opsService.toggleStaff(id, body.active, req.user.userId);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('staff/:id')
  async deleteStaff(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    const data = await this.opsService.deleteStaff(id, req.user.userId);
    return { success: true, data };
  }
}
