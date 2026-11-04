export interface CccdMatchedPattern {
  label: string;
  text: string;
  pattern: string;
}

export interface ExtractedCccdFields {
  id_type: 'cccd' | 'passport' | 'gplx';
  id_number: string;
  name: string;
  birth_date: string; // YYYY-MM-DD
  gender: string;
  nationality: string;
  place_of_origin: string;
  residence_address: string;
  expiry_date?: string;
  raw_matches: CccdMatchedPattern[];
  source_method: 'qr' | 'ocr_my_cccd' | 'hybrid';
}

/**
 * Ported directly from https://github.com/DucLong06/ocr-api/blob/main/my_cccd.py
 * Enhanced with Vietnamese CCCD QR Code standard parser and field value normalizer.
 */
export class CccdParserDomainService {
  /**
   * Remove Vietnamese accents (`_remove_accents` in my_cccd.py)
   */
  static removeAccents(inputStr: string): string {
    if (!inputStr) return '';
    return inputStr
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  private static addToResult(label: string, text: string, pattern: string): CccdMatchedPattern {
    return {
      label,
      text: text.trim(),
      pattern,
    };
  }

  /**
   * Core line-by-line regex matcher ported from `handle_CCCD(text, list_area)` in my_cccd.py
   */
  static handleCCCD(text: string): CccdMatchedPattern[] {
    const patternLoaiGiayTo = /C.N\s*C..C\s*C.NG\s*D.N|CAN\s*CUOC/i;
    const patternSoCCCD = /((^(s.|so|.{1,3}no).+[^<<]\d)|\b\d{12}\b)/i;
    const patternHoVaTen = /(h..v..t.n|ho\s*va\s*ten|full\s*name)/i;
    const patternNgaySinh = /(ng.y\s*sinh|date\s*of\s*b)(.+)/i;
    const patternGioiTinh = /(((g..i\s*t.nh|gioi\s*tinh|sex)(.+))(qu.c\s*t.ch|nationality)|nationality)(.+)/i;
    const patternQueQuan = /(qu.\s*qu.n|place\s*of\s*origin).?(:|\s{1,3})(.+)?/i;
    const patternNoiThuongTru = /(n.i\s*th..ng\s*tr.|place\s*of\s*residence).*(:|\s{1,3})/i;
    const patternCoGiaTriDen = /(c.\s*gi.\s*tr.|date\s*of\s*expiry).+/i;
    const patternDacDiemNhanDang = /(..c\s*.i.m\s*nh.n\s*d.ng|personal\s*identification)/i;
    const patternNgayLamCCCD = /(ng.y\s*[^sinh]|month|year).+/i;
    const patternChucVu = /(C.C|TR..NG|C.NH)\s+[A-Z]+/i;
    const patternNguoiKy = /[A-Z0-9]+<<\d/i;

    const listRes: CccdMatchedPattern[] = [];
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineRemove = this.removeAccents(line);

      if (patternLoaiGiayTo.test(lineRemove)) {
        listRes.push(this.addToResult('loai_giay_to', line, patternLoaiGiayTo.source));
        continue;
      }
      if (patternSoCCCD.test(lineRemove)) {
        listRes.push(this.addToResult('so_CCCD', line, patternSoCCCD.source));
        continue;
      }
      if (patternHoVaTen.test(lineRemove)) {
        // In my_cccd.py: `lines[i+1]` or inline after colon
        const inlineName = line.split(/[:/]/).slice(1).join(':').trim();
        const nextLine = lines[i + 1] ?? '';
        const nameCandidate =
          inlineName.length >= 4 && !/full\s*name/i.test(inlineName) ? inlineName : nextLine;
        listRes.push(this.addToResult('ho_va_ten', nameCandidate || line, patternHoVaTen.source));
        continue;
      }
      if (patternNgaySinh.test(lineRemove)) {
        listRes.push(this.addToResult('ngay_sinh', line, patternNgaySinh.source));
        continue;
      }
      if (patternGioiTinh.test(lineRemove)) {
        listRes.push(this.addToResult('gioi_tinh', line, patternGioiTinh.source));
        continue;
      }
      if (patternQueQuan.test(lineRemove)) {
        const nextLine = lines[i + 1] && !this.isLabelLine(lines[i + 1]) ? `, ${lines[i + 1]}` : '';
        listRes.push(this.addToResult('que_quan', `${line}${nextLine}`, patternQueQuan.source));
        continue;
      }
      if (patternNoiThuongTru.test(lineRemove)) {
        const nextLine = lines[i + 1] && !this.isLabelLine(lines[i + 1]) ? `, ${lines[i + 1]}` : '';
        listRes.push(
          this.addToResult('noi_thuong_tru', `${line}${nextLine}`, patternNoiThuongTru.source),
        );
        continue;
      }
      if (patternCoGiaTriDen.test(lineRemove)) {
        listRes.push(this.addToResult('co_gia_tri_den', line, patternCoGiaTriDen.source));
        continue;
      }
      if (patternDacDiemNhanDang.test(lineRemove)) {
        listRes.push(
          this.addToResult('dac_diem_nhan_dang', line, patternDacDiemNhanDang.source),
        );
        continue;
      }
      if (patternNgayLamCCCD.test(lineRemove)) {
        listRes.push(this.addToResult('ngay_lam_CCCD', line, patternNgayLamCCCD.source));
        continue;
      }
      if (patternChucVu.test(lineRemove)) {
        listRes.push(this.addToResult('chuc_vu', line, patternChucVu.source));
        continue;
      }
      if (patternNguoiKy.test(lineRemove)) {
        listRes.push(this.addToResult('nguoi_ky', line, patternNguoiKy.source));
        continue;
      }
    }

    return listRes;
  }

  private static isLabelLine(line: string): boolean {
    const clean = this.removeAccents(line).toLowerCase();
    return (
      clean.includes('ngay sinh') ||
      clean.includes('gioi tinh') ||
      clean.includes('quoc tich') ||
      clean.includes('que quan') ||
      clean.includes('noi thuong tru') ||
      clean.includes('co gia tri')
    );
  }

  /**
   * Parse Vietnamese chip-based CCCD QR payload:
   * Format: "036208008935|123456789|TRẦN TRUNG KIÊN|25012008|Nam|08 Loseby, Sơn Trà, Đà Nẵng|15052023"
   */
  static parseQrCodeString(qrRaw: string): Partial<ExtractedCccdFields> | null {
    if (!qrRaw || !qrRaw.includes('|')) return null;
    const parts = qrRaw.split('|').map((p) => p.trim());
    if (parts.length < 6) return null;

    const [idNumber, , fullName, dobRaw, gender, residenceAddress] = parts;
    if (!/^\d{9,12}$/.test(idNumber)) return null;

    return {
      id_type: 'cccd',
      id_number: idNumber,
      name: fullName.toUpperCase(),
      birth_date: this.normalizeDateString(dobRaw),
      gender: this.normalizeGender(gender),
      nationality: 'Việt Nam',
      residence_address: residenceAddress,
      source_method: 'qr',
    };
  }

  /**
   * Convert `handleCCCD` raw matches and/or QR payload into clean Customer fields
   */
  static extractStructuredFields(
    ocrText: string,
    qrPayload?: string | null,
  ): ExtractedCccdFields {
    const rawMatches = this.handleCCCD(ocrText || '');
    const qrFields = qrPayload ? this.parseQrCodeString(qrPayload) : null;

    let idNumber = '';
    let name = '';
    let birthDate = '';
    let gender = '';
    let nationality = 'Việt Nam';
    let placeOfOrigin = '';
    let residenceAddress = '';
    let expiryDate = '';

    for (const item of rawMatches) {
      switch (item.label) {
        case 'so_CCCD': {
          const m = item.text.match(/\b(\d{12}|\d{9})\b/);
          if (m && !idNumber) idNumber = m[1];
          break;
        }
        case 'ho_va_ten': {
          const cleaned = item.text
            .replace(/^(họ và tên|ho va ten|full name)\s*[:/.-]*\s*/i, '')
            .replace(/[^a-zA-ZÀ-ỹ\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleaned.length >= 3 && !name) {
            name = cleaned.toUpperCase();
          }
          break;
        }
        case 'ngay_sinh': {
          const dateMatch = item.text.match(/(\d{2}[/-]\d{2}[/-]\d{4}|\d{8})/);
          if (dateMatch && !birthDate) {
            birthDate = this.normalizeDateString(dateMatch[1]);
          }
          break;
        }
        case 'gioi_tinh': {
          const cleanLine = this.removeAccents(item.text).toLowerCase();
          if (cleanLine.includes('nu') || cleanLine.includes('female')) {
            gender = 'Nữ';
          } else if (cleanLine.includes('nam') || cleanLine.includes('male')) {
            gender = 'Nam';
          }
          const natMatch = item.text.match(/(?:quốc tịch|quoc tich|nationality)\s*[:/.-]*\s*([A-Za-zÀ-ỹ\s]+)/i);
          if (natMatch?.[1]) {
            nationality = natMatch[1].trim();
          }
          break;
        }
        case 'que_quan': {
          const val = item.text
            .replace(/^.*?(?:quê quán|que quan|place of origin)\s*[:/.-]*\s*/i, '')
            .trim();
          if (val && !placeOfOrigin) placeOfOrigin = val;
          break;
        }
        case 'noi_thuong_tru': {
          const val = item.text
            .replace(/^.*?(?:nơi thường trú|noi thuong tru|place of residence)\s*[:/.-]*\s*/i, '')
            .trim();
          if (val && !residenceAddress) residenceAddress = val;
          break;
        }
        case 'co_gia_tri_den': {
          const dateMatch = item.text.match(/(\d{2}[/-]\d{2}[/-]\d{4})/);
          if (dateMatch) expiryDate = this.normalizeDateString(dateMatch[1]);
          break;
        }
      }
    }

    // Fallback scan across full text if 12-digit ID or date wasn't caught on the exact label line
    if (!idNumber && ocrText) {
      const any12 = ocrText.match(/\b(\d{12})\b/);
      if (any12) idNumber = any12[1];
    }
    if (!birthDate && ocrText) {
      const anyDate = ocrText.match(/\b(\d{2}\/\d{2}\/(?:19|20)\d{2})\b/);
      if (anyDate) birthDate = this.normalizeDateString(anyDate[1]);
    }

    return {
      id_type: 'cccd',
      id_number: qrFields?.id_number || idNumber,
      name: qrFields?.name || name,
      birth_date: qrFields?.birth_date || birthDate,
      gender: qrFields?.gender || gender || 'Nam',
      nationality: qrFields?.nationality || nationality || 'Việt Nam',
      place_of_origin: placeOfOrigin,
      residence_address: qrFields?.residence_address || residenceAddress || placeOfOrigin,
      expiry_date: expiryDate || undefined,
      raw_matches: rawMatches,
      source_method: qrFields && rawMatches.length > 0 ? 'hybrid' : qrFields ? 'qr' : 'ocr_my_cccd',
    };
  }

  static normalizeDateString(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 8) {
      const dd = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);
      return `${yyyy}-${mm}-${dd}`;
    }
    const parts = raw.split(/[/-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return raw;
  }

  static normalizeGender(raw: string): string {
    const clean = this.removeAccents(raw).toLowerCase().trim();
    if (clean === 'nu' || clean === 'female' || clean === 'f') return 'Nữ';
    return 'Nam';
  }
}

