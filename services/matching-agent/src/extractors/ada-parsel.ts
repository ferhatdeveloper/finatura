import type { AdaParselRef } from "../types.js";

/**
 * Ada / parsel süzümü.
 * Örnekler: "Ada:120 Parsel:5", "ADA 120 PARSEL 5", "120/5", "Ada/Parsel 120/5"
 */
const LABELED =
  /\bADA\s*[:=\-]?\s*(\d{1,6})\s*(?:[,;/|\-]?\s*)PARSEL\s*[:=\-]?\s*(\d{1,6})\b/gi;

const SLASH = /\b(\d{1,6})\s*\/\s*(\d{1,6})\b/g;

export function normalizeAdaParsel(ada: string, parsel: string): AdaParselRef {
  const a = String(Number(ada));
  const p = String(Number(parsel));
  return { ada: a, parsel: p, raw: `${a}/${p}` };
}

export function extractAdaParsel(description: string): AdaParselRef[] {
  const results: AdaParselRef[] = [];
  const seen = new Set<string>();

  const push = (ada: string, parsel: string, raw: string) => {
    if (!ada || !parsel) return;
    const ref = normalizeAdaParsel(ada, parsel);
    const key = `${ref.ada}/${ref.parsel}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ ...ref, raw });
  };

  for (const m of description.matchAll(LABELED)) {
    push(m[1], m[2], m[0]);
  }

  for (const m of description.matchAll(SLASH)) {
    // TCKN benzeri 11 haneli parçaları ve plaka parçalarını ele
    if (m[1].length > 5 || m[2].length > 5) continue;
    push(m[1], m[2], m[0]);
  }

  return results;
}

export function adaParselEquals(
  a: { ada?: string; parsel?: string },
  b: { ada?: string; parsel?: string },
): boolean {
  if (!a.ada || !a.parsel || !b.ada || !b.parsel) return false;
  return (
    String(Number(a.ada)) === String(Number(b.ada)) &&
    String(Number(a.parsel)) === String(Number(b.parsel))
  );
}
