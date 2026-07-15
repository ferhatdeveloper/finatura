/**
 * AŞAMA 2.1 — Noter Satış Sözleşmesi parser birim test iskeleti.
 * Çalıştırma: document-agent kökünde `npm test` (Vitest/Jest bağlandığında).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { buildNoterExtractionPrompt } from '../prompt.js';
import { parseNoterOcrSync } from '../parse.js';
import {
  normalizePlaka,
  normalizeSase,
  parseTurkishMoney,
} from '../regex.js';
import { isValidTckn } from '../validate-tckn.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '../fixtures/sample-noter-sozlesme.txt');

describe('validate-tckn', () => {
  it('geçerli TCKN kabul eder', () => {
    expect(isValidTckn('10000000146')).toBe(true);
    expect(isValidTckn('23456789060')).toBe(true);
  });

  it('geçersiz TCKN reddeder', () => {
    expect(isValidTckn('12345678901')).toBe(false);
    expect(isValidTckn('01234567890')).toBe(false);
  });
});

describe('normalize helpers', () => {
  it('plakayı normalize eder', () => {
    expect(normalizePlaka('06abc123')).toBe('06 ABC 123');
    expect(normalizePlaka('34 AB 1234')).toBe('34 AB 1234');
  });

  it('şasi / VIN doğrular', () => {
    expect(normalizeSase('WVWZZZ3CZWE123456')).toBe('WVWZZZ3CZWE123456');
    expect(normalizeSase('SHORT')).toBeNull();
  });

  it('TR para formatını çözer', () => {
    expect(parseTurkishMoney('1.850.000,00')).toBe(1850000);
    expect(parseTurkishMoney('850000')).toBe(850000);
  });
});

describe('parseNoterOcrSync — fixture', () => {
  it('örnek noter sözleşmesinden alanları çeker', () => {
    const text = readFileSync(fixturePath, 'utf8');
    const result = parseNoterOcrSync(text);

    expect(result.fields.belgeTuru).toBe('noter_satis_sozlesmesi');
    expect(result.fields.plaka).toBe('06 ABC 123');
    expect(result.fields.saseNo).toBe('WVWZZZ3CZWE123456');
    expect(result.fields.satisBedeli).toBe(1850000);
    expect(result.fields.paraBirimi).toBe('TRY');
    expect(result.fields.aliciTckn).toBe('10000000146');
    expect(result.fields.saticiTckn).toBe('23456789060');
    expect(result.overallConfidence).toBeGreaterThan(0.7);
  });
});

describe('LLM prompt şablonu', () => {
  it('OCR metnini şablona yerleştirir', () => {
    const { system, user } = buildNoterExtractionPrompt('Plaka: 34 ABC 123');
    expect(system).toContain('noter satış sözleşmesi');
    expect(user).toContain('34 ABC 123');
    expect(user).toContain('aliciTckn');
  });
});

describe.todo('parseNoterOcr — LLM fallback entegrasyonu');
