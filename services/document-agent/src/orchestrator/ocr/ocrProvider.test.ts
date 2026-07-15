import { describe, expect, it } from 'vitest';

import {
  createOcrProvider,
  parseOcrProviderName,
  StubOcrProvider,
  TesseractOcrProvider,
} from './index.js';

describe('parseOcrProviderName', () => {
  it('varsayılan stub döner', () => {
    expect(parseOcrProviderName(undefined)).toBe('stub');
    expect(parseOcrProviderName('')).toBe('stub');
    expect(parseOcrProviderName('unknown')).toBe('stub');
  });

  it('tesseract kabul eder', () => {
    expect(parseOcrProviderName('tesseract')).toBe('tesseract');
    expect(parseOcrProviderName('Tesseract')).toBe('tesseract');
  });
});

describe('createOcrProvider', () => {
  it('stub örneği üretir', () => {
    expect(createOcrProvider('stub')).toBeInstanceOf(StubOcrProvider);
  });

  it('tesseract örneği üretir', () => {
    expect(createOcrProvider('tesseract')).toBeInstanceOf(TesseractOcrProvider);
  });
});

describe('StubOcrProvider', () => {
  const provider = new StubOcrProvider();

  it('istemci ocrText varsa onu döner', async () => {
    const result = await provider.recognize({
      ocrText: '  T.C. KİMLİK KARTI  ',
    });
    expect(result.text).toBe('T.C. KİMLİK KARTI');
    expect(result.stubbed).toBe(false);
    expect(result.provider).toBe('stub');
  });

  it('metin yoksa OCR_STUB placeholder üretir', async () => {
    const result = await provider.recognize({
      filename: 'scan.png',
      mimeType: 'image/png',
      buffer: Buffer.from([1, 2, 3]),
    });
    expect(result.stubbed).toBe(true);
    expect(result.text).toContain('[OCR_STUB]');
    expect(result.text).toContain('scan.png');
    expect(result.text).toContain('Boyut: 3 bayt');
  });
});

describe('TesseractOcrProvider', () => {
  it('ocrText varsa tesseract çağırmadan döner', async () => {
    const provider = new TesseractOcrProvider();
    const result = await provider.recognize({
      ocrText: 'NOTER SÖZLEŞMESİ',
      buffer: Buffer.from('fake-image'),
      mimeType: 'image/png',
    });
    expect(result.text).toBe('NOTER SÖZLEŞMESİ');
    expect(result.stubbed).toBe(false);
    expect(result.provider).toBe('tesseract');
  });

  it('görüntü yoksa stub placeholder’a düşer', async () => {
    const provider = new TesseractOcrProvider();
    const result = await provider.recognize({
      filename: 'note.txt',
      mimeType: 'text/plain',
    });
    expect(result.stubbed).toBe(true);
    expect(result.text).toContain('[OCR_STUB]');
    expect(result.provider).toBe('tesseract');
  });
});
