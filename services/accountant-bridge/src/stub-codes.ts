import type { StubAccountantCode } from "./types.js";

/**
 * Demo mali müşavir erişim kodları (SQL / IdP yokken stub).
 * Portal ve testler aynı kodları kullanır.
 */
export const STUB_ACCOUNTANT_CODES: StubAccountantCode[] = [
  {
    tenantId: "anadolu-oto",
    tenantName: "Anadolu Oto Galeri Ltd.",
    code: "MM-2026-DEMO",
    accountantName: "Ayşe Yılmaz, SMMM",
    firmaUnvan: "Anadolu Oto Galeri Ltd. Şti.",
    firmaVkn: "1234567890",
  },
  {
    tenantId: "pirlanta-kuyum",
    tenantName: "Pırlanta Altın Kuyumculuk",
    code: "MM-PIRLANTA-01",
    accountantName: "Mehmet Kaya, SMMM",
    firmaUnvan: "Pırlanta Altın Kuyumculuk Ltd. Şti.",
    firmaVkn: "0987654321",
  },
];

export function findStubCode(
  tenantId: string,
  code: string,
): StubAccountantCode | undefined {
  const t = tenantId.trim().toLowerCase();
  const c = code.trim().toUpperCase();
  return STUB_ACCOUNTANT_CODES.find(
    (row) => row.tenantId === t && row.code.toUpperCase() === c,
  );
}
