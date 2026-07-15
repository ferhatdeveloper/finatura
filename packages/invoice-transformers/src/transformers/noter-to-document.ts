import type { TransformResult } from "../models/ubl-tr/gider-pusulasi-draft.js";
import type {
  NoterSozlesmeOcr,
  TenantParty,
  TransformOptions,
} from "../types/noter-sozlesme.js";
import { detectDocumentDirection } from "./detect-direction.js";
import { EFaturaTransformer } from "./efatura-transformer.js";
import { GiderPusulasiTransformer } from "./gider-pusulasi-transformer.js";

/**
 * Tek giriş noktası: OCR noter JSON + tenant → uygun belge taslağı.
 */
export class NoterToDocumentTransformer {
  private readonly eFatura = new EFaturaTransformer();
  private readonly giderPusulasi = new GiderPusulasiTransformer();

  transform(
    noter: NoterSozlesmeOcr,
    tenant: TenantParty,
    options: TransformOptions = {},
  ): TransformResult {
    const decision = detectDocumentDirection(noter, tenant, options.forceBelgeTuru);

    if (decision.belgeTuru === "gider_pusulasi") {
      const { draft, summary } = this.giderPusulasi.transform(noter, tenant, {
        ...options,
        forceBelgeTuru: "gider_pusulasi",
      });
      return { belgeTuru: "gider_pusulasi", draft, summary };
    }

    const { draft, summary } = this.eFatura.transform(noter, tenant, {
      ...options,
      forceBelgeTuru: decision.belgeTuru,
    });
    return { belgeTuru: draft.kind, draft, summary };
  }

  /** Yönü önceden görmek için (UI “tek tık” öncesi özet). */
  previewDirection(noter: NoterSozlesmeOcr, tenant: TenantParty, forceBelgeTuru?: TransformOptions["forceBelgeTuru"]) {
    return detectDocumentDirection(noter, tenant, forceBelgeTuru);
  }
}
