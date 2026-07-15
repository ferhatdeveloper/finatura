import type {
  BelgeTuru,
  IslemYonu,
  NoterSozlesmeOcr,
  TenantParty,
} from "../types/noter-sozlesme.js";
import {
  identitiesMatch,
  isIndividual,
  normalizeIdentity,
} from "../utils/identity.js";

export interface DirectionDecision {
  yon: IslemYonu;
  belgeTuru: BelgeTuru;
  reason: string;
}

/**
 * Galeri satıcı tarafındaysa → araç satışı → e-Fatura / e-Arşiv.
 * Galeri alıcı tarafındaysa ve karşı taraf şahıs ise → Gider Pusulası.
 */
export function detectDocumentDirection(
  noter: NoterSozlesmeOcr,
  tenant: TenantParty,
  forceBelgeTuru?: BelgeTuru,
): DirectionDecision {
  const tenantId = normalizeIdentity(tenant.vknOrTckn);
  const saticiId = normalizeIdentity(noter.satici.tcknOrVkn);
  const aliciId = normalizeIdentity(noter.alici.tcknOrVkn);

  if (!tenantId) {
    throw new TransformValidationError("Tenant vknOrTckn zorunludur.");
  }
  if (!saticiId || !aliciId) {
    throw new TransformValidationError("Alıcı ve satıcı TCKN/VKN OCR çıktısında zorunludur.");
  }

  const tenantIsSeller = identitiesMatch(tenantId, saticiId);
  const tenantIsBuyer = identitiesMatch(tenantId, aliciId);

  if (tenantIsSeller && tenantIsBuyer) {
    throw new TransformValidationError(
      "Tenant hem alıcı hem satıcı görünüyor; OCR kimliklerini kontrol edin.",
    );
  }

  if (!tenantIsSeller && !tenantIsBuyer) {
    throw new TransformValidationError(
      "Tenant kimliği noter sözleşmesindeki alıcı/satıcı ile eşleşmiyor.",
    );
  }

  if (forceBelgeTuru) {
    return {
      yon: forceBelgeTuru === "gider_pusulasi" ? "alis" : "satis",
      belgeTuru: forceBelgeTuru,
      reason: `forceBelgeTuru=${forceBelgeTuru}`,
    };
  }

  if (tenantIsSeller) {
    const belgeTuru: BelgeTuru = tenant.eFaturaMukellefi === false ? "earsiv" : "efatura";
    return {
      yon: "satis",
      belgeTuru,
      reason: "Tenant satıcı → galeri araç satışı (e-Fatura/e-Arşiv)",
    };
  }

  // tenantIsBuyer
  if (!isIndividual(noter.satici.tcknOrVkn)) {
    // Satıcı şirket/VKN ise gider pusulası yerine alış faturası beklenir;
    // bu pakette yine gider_pusulasi yerine uyarı ile efatura alis taslağı üretilmez —
    // galeri senaryosunda şahıs alışına odaklanıyoruz.
    throw new TransformValidationError(
      "Satıcı şahıs (TCKN) değil; şirket alış faturası bu transformer kapsamı dışında. " +
        "Şahıs alışında Gider Pusulası kullanılır.",
    );
  }

  return {
    yon: "alis",
    belgeTuru: "gider_pusulasi",
    reason: "Tenant alıcı + satıcı şahıs → Gider Pusulası",
  };
}

export class TransformValidationError extends Error {
  readonly code = "TRANSFORM_VALIDATION";

  constructor(message: string) {
    super(message);
    this.name = "TransformValidationError";
  }
}

export function assertNoterMinimum(noter: NoterSozlesmeOcr): void {
  if (!noter.arac?.plaka?.trim()) {
    throw new TransformValidationError("Araç plakası zorunludur.");
  }
  if (!noter.arac?.saseNo?.trim()) {
    throw new TransformValidationError("Araç şasi no zorunludur.");
  }
  if (!(noter.satisBedeli > 0)) {
    throw new TransformValidationError("Satış bedeli 0’dan büyük olmalıdır.");
  }
}
