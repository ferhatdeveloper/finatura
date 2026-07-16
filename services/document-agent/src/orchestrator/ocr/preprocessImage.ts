import sharp from 'sharp';

export interface PreprocessOptions {
  /** Kısa kenar hedefi (px); küçük görüntüleri büyütür */
  minShortEdge?: number;
  /** Uzun kenar üst sınırı (px) — hız/okunabilirlik dengesi */
  maxLongEdge?: number;
}

/**
 * Yerel OCR ön işleme (hızlı):
 * grayscale → normalize → hafif keskinleştirme → JPEG.
 */
export async function preprocessImageForOcr(
  buffer: Buffer,
  options: PreprocessOptions = {},
): Promise<Buffer> {
  const minShort = options.minShortEdge ?? 900;
  const maxLong = options.maxLongEdge ?? 1600;

  const base = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await base.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  let pipeline = sharp(buffer, { failOn: 'none' }).rotate();

  if (w > 0 && h > 0) {
    const shortEdge = Math.min(w, h);
    const longEdge = Math.max(w, h);
    if (shortEdge < minShort) {
      const scale = minShort / shortEdge;
      pipeline = pipeline.resize(Math.round(w * scale), Math.round(h * scale), {
        kernel: sharp.kernel.lanczos3,
      });
    } else if (longEdge > maxLong) {
      const scale = maxLong / longEdge;
      pipeline = pipeline.resize(Math.round(w * scale), Math.round(h * scale), {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true,
      });
    }
  }

  return pipeline
    .grayscale()
    .normalize()
    .sharpen({ sigma: 0.8 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}
