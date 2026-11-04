import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';
import {
  CccdParserDomainService,
  ExtractedCccdFields,
} from '../../domain/services/cccd-parser.domain-service.js';

@Injectable()
export class DocumentOcrService {
  private readonly logger = new Logger(DocumentOcrService.name);

  /**
   * Process CCCD / ID image buffer using:
   * 1. Sharp image normalization & grayscale (like OpenCV cvtColor in my_ocr.py)
   * 2. jsQR scan (full image + top-right quadrant where Vietnamese CCCD QR resides)
   * 3. Tesseract.js (`vie+eng`) text recognition
   * 4. `CccdParserDomainService.extractStructuredFields` ported from `my_cccd.py`
   */
  async extractFromImageBuffer(buffer: Buffer): Promise<{
    fields: ExtractedCccdFields;
    rawText: string;
    qrDetected: boolean;
  }> {
    let qrPayload: string | null = null;

    try {
      // 1. Try decoding QR code from full image and top-right region
      qrPayload = await this.tryDecodeQr(buffer);
    } catch (e) {
      this.logger.debug(`QR decode skipped: ${(e as Error).message}`);
    }

    // If QR code on Vietnamese CCCD is decoded, it contains 100% accurate fields immediately!
    const qrCheck = qrPayload ? CccdParserDomainService.parseQrCodeString(qrPayload) : null;
    if (qrCheck && qrCheck.id_number && qrCheck.name) {
      const fields = CccdParserDomainService.extractStructuredFields('', qrPayload);
      return {
        fields,
        rawText: qrPayload || '',
        qrDetected: true,
      };
    }

    // 2. Preprocess image with Sharp (auto-orient, resize for crisp OCR, grayscale & normalize)
    let processedBuffer = buffer;
    try {
      processedBuffer = await sharp(buffer)
        .rotate() // auto-orient based on EXIF
        .resize({ width: 1600, withoutEnlargement: true })
        .grayscale()
        .normalize()
        .sharpen()
        .jpeg({ quality: 92 })
        .toBuffer();
    } catch (e) {
      this.logger.warn(`Sharp preprocess fallback: ${(e as Error).message}`);
    }

    // 3. Run Tesseract OCR with Vietnamese + English language model
    let rawText = '';
    try {
      const worker = await createWorker(['vie', 'eng']);
      try {
        const ret = await worker.recognize(processedBuffer);
        rawText = ret.data.text || '';
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      this.logger.error(`Tesseract OCR error: ${(err as Error).message}`);
    }

    // 4. Parse extracted text using `my_cccd.py` regex & accent-removal engine
    const fields = CccdParserDomainService.extractStructuredFields(rawText, qrPayload);

    return {
      fields,
      rawText,
      qrDetected: Boolean(qrPayload),
    };
  }

  private async tryDecodeQr(buffer: Buffer): Promise<string | null> {
    const image = sharp(buffer).rotate();
    const metadata = await image.metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Attempt 1: Full image scaled to max 1200px
    const fullRaw = await image
      .clone()
      .resize({ width: Math.min(width, 1200) })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const decodeQr = ((jsQR as unknown as { default?: unknown }).default || jsQR) as (
      data: Uint8ClampedArray,
      width: number,
      height: number,
    ) => { data: string } | null;

    const codeFull = decodeQr(
      new Uint8ClampedArray(fullRaw.data),
      fullRaw.info.width,
      fullRaw.info.height,
    );
    if (codeFull?.data) return codeFull.data;

    // Attempt 2: Crop top-right quadrant (where QR sits on Vietnamese chip CCCD)
    if (width > 300 && height > 200) {
      const cropRaw = await sharp(buffer)
        .rotate()
        .extract({
          left: Math.floor(width * 0.5),
          top: 0,
          width: Math.floor(width * 0.5),
          height: Math.floor(height * 0.6),
        })
        .resize({ width: 800 })
        .normalize()
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const codeCrop = decodeQr(
        new Uint8ClampedArray(cropRaw.data),
        cropRaw.info.width,
        cropRaw.info.height,
      );
      if (codeCrop?.data) return codeCrop.data;
    }

    return null;
  }
}
