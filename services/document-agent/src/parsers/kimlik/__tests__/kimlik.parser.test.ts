/**
 * AŞAMA 2.3 — Kimlik/Ehliyet parser test iskeleti.
 * Çalıştırma (document-agent kökünden, paket kurulunca):
 *   npx vitest run src/parsers/kimlik
 * veya:
 *   npm test -- kimlik
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseKimlikOcr, parseKimlikOcrSync } from '../parse.js';
import { buildKimlikExtractionPrompt } from '../prompt.js';
import { isValidTckn } from '../validate-tckn.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'fixtures');

describe('isValidTckn', () => {
  it('geçerli örnek TCKN kabul eder', () => {
    expect(isValidTckn('10000000146')).toBe(true);
  });

  it('geçersiz TCKN reddeder', () => {
    expect(isValidTckn('12345678901')).toBe(false);
    expect(isValidTckn('01234567890')).toBe(false);
    expect(isValidTckn(null)).toBe(false);
  });
});

describe('parseKimlikOcrSync — T.C. Kimlik', () => {
  it('TCKN, ad-soyad ve doğum tarihini ayıklar', () => {
    const ocr = readFileSync(join(fixtures, 'sample-tc-kimlik.txt'), 'utf8');
    const result = parseKimlikOcrSync(ocr);

    expect(result.fields.belgeTuru).toBe('tc_kimlik');
    expect(result.fields.tckn).toBe('10000000146');
    expect(result.fields.soyad).toBe('YILMAZ');
    expect(result.fields.ad).toContain('AHMET');
    expect(result.fields.dogumTarihi).toBe('1990-03-15');
    expect(result.fields.adSoyad).toMatch(/YILMAZ/);
    expect(result.overallConfidence).toBeGreaterThan(0.5);
  });
});

describe('parseKimlikOcrSync — Ehliyet', () => {
  it('ehliyet alanlarını ayıklar', () => {
    const ocr = readFileSync(join(fixtures, 'sample-ehliyet.txt'), 'utf8');
    const result = parseKimlikOcrSync(ocr, { forceBelgeTuru: 'ehliyet' });

    expect(result.fields.belgeTuru).toBe('ehliyet');
    expect(result.fields.tckn).toBe('10000000146');
    expect(result.fields.soyad).toBe('DEMİR');
    expect(result.fields.ad).toBe('AYŞE');
    expect(result.fields.dogumTarihi).toBe('1985-07-22');
    expect(result.fields.ehliyetNo).toBe('34ABC12345');
    expect(result.fields.sinif).toBe('B');
    expect(result.fields.verilisTarihi).toBe('2018-03-15');
    expect(result.fields.bitisTarihi).toBe('2028-03-15');
  });
});

describe('parseKimlikOcr — LLM fallback iskeleti', () => {
  it('eksik alanlarda llmExtractor çağırır', async () => {
    const ocr = 'bulanık okuma; alan yok';
    const result = await parseKimlikOcr(ocr, {
      preferLlmFallback: true,
      llmExtractor: async () => ({
        tckn: '10000000146',
        ad: 'ALI',
        soyad: 'VELI',
        dogumTarihi: '2000-01-01',
        belgeTuru: 'tc_kimlik',
      }),
    });

    expect(result.fields.tckn).toBe('10000000146');
    expect(result.fields.ad).toBe('ALI');
    expect(result.extractedBy.tckn).toBe('llm');
  });
});

describe('buildKimlikExtractionPrompt', () => {
  it('OCR metnini user prompta gömer', () => {
    const { system, user } = buildKimlikExtractionPrompt('ORNEK METIN');
    expect(system).toMatch(/Kimlik/i);
    expect(user).toContain('ORNEK METIN');
    expect(user).toContain('tckn');
  });
});

// TODO: gerçek OCR çıktıları (fotoğraf → Tesseract/Vision) ile golden fixture testleri
// TODO: MRZ TD1 satır 1–3 checksum doğrulaması
// TODO: schema.json ile Ajv validasyonu
