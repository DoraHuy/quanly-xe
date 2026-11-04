import { describe, it, expect } from 'vitest';
import { CccdParserDomainService } from './cccd-parser.domain-service.js';
import { PricingCalculatorDomainService } from './pricing-calculator.domain-service.js';
import { RentalSettlementDomainService } from './rental-settlement.domain-service.js';

describe('Clean Architecture Domain Services', () => {
  describe('CccdParserDomainService (ported from my_cccd.py)', () => {
    it('removes Vietnamese accents accurately', () => {
      expect(CccdParserDomainService.removeAccents('CĂN CƯỚC CÔNG DÂN')).toBe('CAN CUOC CONG DAN');
      expect(CccdParserDomainService.removeAccents('Đặng Thị Hồng Ngọc')).toBe('Dang Thi Hong Ngoc');
    });

    it('extracts structured CCCD fields from OCR lines using my_cccd.py regex patterns', () => {
      const sampleOcrText = [
        'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
        'Độc lập - Tự do - Hạnh phúc',
        'CĂN CƯỚC CÔNG DÂN',
        'Số / No.: 036200008935',
        'Họ và tên / Full name:',
        'TRẦN TRUNG KIÊN',
        'Ngày sinh / Date of birth: 25/01/2000',
        'Giới tính / Sex: Nam   Quốc tịch / Nationality: Việt Nam',
        'Quê quán / Place of origin: Nam Trực, Nam Định',
        'Nơi thường trú / Place of residence: 08 Loseby, Phước Mỹ',
        'Sơn Trà, Đà Nẵng',
        'Có giá trị đến: 25/01/2040',
      ].join('\n');

      const result = CccdParserDomainService.extractStructuredFields(sampleOcrText);
      expect(result.id_type).toBe('cccd');
      expect(result.id_number).toBe('036200008935');
      expect(result.name).toBe('TRẦN TRUNG KIÊN');
      expect(result.birth_date).toBe('2000-01-25');
      expect(result.gender).toBe('Nam');
      expect(result.place_of_origin).toContain('Nam Trực, Nam Định');
      expect(result.residence_address).toContain('08 Loseby, Phước Mỹ');
      expect(result.expiry_date).toBe('2040-01-25');
    });

    it('parses Vietnamese chip-based CCCD QR code format instantaneously', () => {
      const qr =
        '048198004512|201712345|NGUYỄN THỊ HỒNG NGỌC|14061998|Nữ|124 Nguyễn Văn Thoại, Ngũ Hành Sơn, Đà Nẵng|10052022';
      const parsed = CccdParserDomainService.extractStructuredFields('', qr);
      expect(parsed.id_number).toBe('048198004512');
      expect(parsed.name).toBe('NGUYỄN THỊ HỒNG NGỌC');
      expect(parsed.birth_date).toBe('1998-06-14');
      expect(parsed.gender).toBe('Nữ');
      expect(parsed.residence_address).toBe('124 Nguyễn Văn Thoại, Ngũ Hành Sơn, Đà Nẵng');
      expect(parsed.source_method).toBe('qr');
    });
  });

  describe('PricingCalculatorDomainService', () => {
    const samplePricing = {
      id: 'pv-2',
      versionNumber: 2,
      defaultPricePerDay: 150000,
      monthDays: 30,
      pricePerMonth: 2100000,
      pricePerExtraDay: 70000,
      lateFeeGraceHours: 1,
      lateFeeHourlyAmount: 20000,
      lateFeeHourlyMaxHours: 8,
      tiers: [
        { minDays: 4, pricePerDay: 130000 },
        { minDays: 7, pricePerDay: 110000 },
        { minDays: 15, pricePerDay: 70000 },
      ],
    };

    it('calculates tiered daily prices and monthly packages accurately', () => {
      expect(PricingCalculatorDomainService.calculateAssetPriceFromDays(2, samplePricing).totalAmount).toBe(
        300000,
      );
      expect(PricingCalculatorDomainService.calculateAssetPriceFromDays(4, samplePricing).totalAmount).toBe(
        520000,
      );
      expect(PricingCalculatorDomainService.calculateAssetPriceFromDays(7, samplePricing).totalAmount).toBe(
        770000,
      );
      expect(PricingCalculatorDomainService.calculateAssetPriceFromDays(30, samplePricing).totalAmount).toBe(
        2100000,
      );
      expect(PricingCalculatorDomainService.calculateAssetPriceFromDays(32, samplePricing).totalAmount).toBe(
        2240000,
      );
    });
  });

  describe('RentalSettlementDomainService', () => {
    it('maintains strict financial balance invariant', () => {
      const res = RentalSettlementDomainService.computeFinancials({
        originalTotalAmount: 520000,
        discountAmount: 40000,
        surchargeAmount: 0,
        lateFee: 60000,
        deposit: 500000,
        paidAmount: 200000,
        heldDepositAmount: 500000,
      });
      expect(res.totalAmount).toBe(480000);
      expect(res.totalPayable).toBe(540000);
      expect(res.remainingBalance).toBe(340000);
      expect(res.paidAmount + res.remainingBalance).toBe(res.totalPayable);
    });
  });
});

