/**
 * AŞAMA 2.2 — Tapu Senedi parser test iskeleti.
 * Çalıştırma (document-agent kökünden, paket kurulunca):
 *   npx vitest run src/parsers/tapu
 * veya:
 *   npm test -- tapu
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseTapuOcr, parseTapuOcrSync } from '../parse.js';
import { buildTapuExtractionPrompt } from '../prompt.js';
import { parseAreaSqm } from '../regex.js';
import { isValidTckn } from '../validate-tckn.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'fixtures');

describe('parseAreaSqm', () => {
  it('TR binlik ve ondalık biçimini çözer', () => {
    expect(parseAreaSqm('1.250,50')).toBe(1250.5);
    expect(parseAreaSqm('250')).toBe(250);
    expect(parseAreaSqm('85,25 m²')).toBe(85.25);
  });
});

describe('isValidTckn', () => {
  it('geçerli örnek TCKN kabul eder', () => {
    expect(isValidTckn('10000000146')).toBe(true);
  });

  it('geçersiz TCKN reddeder', () => {
    expect(isValidTckn('12345678901')).toBe(false);
  });
});

describe('parseTapuOcrSync — örnek tapu senedi', () => {
  it('İl/İlçe, Ada, Parsel, Yüzölçümü ve Malik alanlarını ayıklar', () => {
    const ocr = readFileSync(join(fixtures, 'sample-tapu.txt'), 'utf8');
    const result = parseTapuOcrSync(ocr);

    expect(result.fields.city).toBe('ANKARA');
    expect(result.fields.district).toBe('ÇANKAYA');
    expect(result.fields.neighborhood).toBe('BAHÇELİEVLER');
    expect(result.fields.ada).toBe('1523');
    expect(result.fields.parsel).toBe('48');
    expect(result.fields.areaSqm).toBe(1250.5);
    expect(result.fields.ownerName).toMatch(/MEHMET/);
    expect(result.fields.ownerIdentity).toBe('10000000146');
    expect(result.fields.propertyType).toBe('ARSA');
    expect(result.overallConfidence).toBeGreaterThan(0.5);
  });
});

describe('parseTapuOcr — LLM fallback iskeleti', () => {
  it('eksik alanlarda llmExtractor çağırır', async () => {
    const ocr = 'bulanık okuma; alan yok';
    const result = await parseTapuOcr(ocr, {
      preferLlmFallback: true,
      llmExtractor: async () => ({
        city: 'İSTANBUL',
        district: 'KADIKÖY',
        ada: '10',
        parsel: '20',
        areaSqm: 100,
        ownerName: 'AYŞE DEMİR',
      }),
    });

    expect(result.fields.city).toBe('İSTANBUL');
    expect(result.fields.district).toBe('KADIKÖY');
    expect(result.fields.ada).toBe('10');
    expect(result.fields.parsel).toBe('20');
    expect(result.fields.areaSqm).toBe(100);
    expect(result.extractedBy.city).toBe('llm');
  });
});

describe('buildTapuExtractionPrompt', () => {
  it('OCR metnini user prompta gömer', () => {
    const { system, user } = buildTapuExtractionPrompt('ORNEK TAPU');
    expect(system).toMatch(/tapu/i);
    expect(user).toContain('ORNEK TAPU');
    expect(user).toContain('areaSqm');
    expect(user).toContain('ownerName');
  });
});

// TODO: gerçek OCR çıktıları (fotoğraf → Tesseract/Vision) ile golden fixture testleri
// TODO: kat mülkiyeti / paylı mülkiyet çoklu malik satırları
// TODO: schema.json ile Ajv validasyonu
