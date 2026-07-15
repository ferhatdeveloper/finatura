import { SHARED_FORM_CSS } from "../../templates/shared-styles.js";
import { dash, escapeHtml, formatDateTr, formatTry } from "../../utils/format.js";
import type { YerGostermeFormData } from "./types.js";

function propertyTypeLabel(t: YerGostermeFormData["property"]["propertyType"]): string {
  switch (t) {
    case "konut":
      return "Konut";
    case "isyeri":
      return "İşyeri";
    case "arsa":
      return "Arsa";
    case "diger":
      return "Diğer";
    default:
      return "—";
  }
}

/** Yer gösterme belgesi HTML şablonu. */
export function renderYerGostermeHtml(data: YerGostermeFormData): string {
  const { letterhead, meta, broker, client, owner, property, terms, signatures } = data;
  const clauses = [
    terms.commissionNote ??
      "İşbu gösterim belgesi, gayrimenkulün müşteriye gösterildiğini belgeler; taraflar arasında yazılı anlaşma ile düzenlenmiş komisyon hükümleri saklıdır.",
    terms.validityDays
      ? `Belge düzenleme tarihinden itibaren ${terms.validityDays} gün süreyle geçerlidir.`
      : null,
    terms.confidentiality !== false
      ? "Müşteri, gösterilen taşınmaza ilişkin bilgileri üçüncü kişilere aktarmamayı ve doğrudan malik ile görüşerek aracıyı devre dışı bırakmamayı kabul eder."
      : null,
    ...(terms.extraClauses ?? []),
  ].filter(Boolean) as string[];

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Yer Gösterme Belgesi — ${escapeHtml(meta.documentNo)}</title>
  <style>${SHARED_FORM_CSS}</style>
</head>
<body>
  <div class="sheet">
    <header class="letterhead">
      <h1>${escapeHtml(letterhead.companyName)}</h1>
      <div class="meta">
        ${letterhead.tradeName ? escapeHtml(letterhead.tradeName) + "<br/>" : ""}
        ${letterhead.address ? escapeHtml(letterhead.address) + "<br/>" : ""}
        ${letterhead.phone ? "Tel: " + escapeHtml(letterhead.phone) + " " : ""}
        ${letterhead.email ? " · " + escapeHtml(letterhead.email) : ""}
        ${letterhead.taxOffice || letterhead.taxNumber
          ? "<br/>V.D./VN: " +
            escapeHtml([letterhead.taxOffice, letterhead.taxNumber].filter(Boolean).join(" / "))
          : ""}
      </div>
    </header>

    <div class="doc-title">Yer Gösterme Belgesi</div>
    <div class="doc-sub">
      Belge No: ${escapeHtml(meta.documentNo)}
      · Tarih: ${formatDateTr(meta.issuedAt)}
      ${meta.place ? " · Yer: " + escapeHtml(meta.place) : ""}
    </div>

    <h2>1. Gösterim yapan (Emlak Ofisi / Danışman)</h2>
    <table class="grid">
      <tr><th>Unvan / Ad Soyad</th><td>${dash(broker.companyTitle ?? broker.fullName)}</td></tr>
      <tr><th>Danışman</th><td>${dash(broker.fullName)}</td></tr>
      <tr><th>TCKN / VKN</th><td>${dash(broker.tcknOrVkn)}</td></tr>
      <tr><th>Yetki / Sicil No</th><td>${dash(broker.licenseNo)}</td></tr>
      <tr><th>Telefon</th><td>${dash(broker.phone)}</td></tr>
    </table>

    <h2>2. Yer gösterilen müşteri</h2>
    <table class="grid">
      <tr><th>Ad Soyad</th><td>${dash(client.fullName)}</td></tr>
      <tr><th>TCKN / VKN</th><td>${dash(client.tcknOrVkn)}</td></tr>
      <tr><th>Telefon</th><td>${dash(client.phone)}</td></tr>
      <tr><th>Adres</th><td>${dash(client.address)}</td></tr>
    </table>

    ${
      owner
        ? `<h2>3. Malik (bilindiği ölçüde)</h2>
    <table class="grid">
      <tr><th>Ad Soyad / Unvan</th><td>${dash(owner.fullName)}</td></tr>
      <tr><th>TCKN / VKN</th><td>${dash(owner.tcknOrVkn)}</td></tr>
    </table>`
        : ""
    }

    <h2>${owner ? "4" : "3"}. Gösterilen taşınmaz</h2>
    <table class="grid">
      <tr><th>Portföy / İlan No</th><td>${dash(property.listingNo)}</td></tr>
      <tr><th>Tür</th><td>${escapeHtml(propertyTypeLabel(property.propertyType))}</td></tr>
      <tr><th>Konum</th><td>${dash(property.locationText)}</td></tr>
      <tr><th>Ada / Parsel</th><td>${dash(
        [property.ada, property.parsel].filter(Boolean).join(" / ") || undefined,
      )}</td></tr>
      <tr><th>Blok / Bağımsız Bölüm</th><td>${dash(
        [property.block, property.independentSection].filter(Boolean).join(" / ") || undefined,
      )}</td></tr>
      <tr><th>m² (net / brüt)</th><td>${dash(
        property.netM2 || property.grossM2
          ? `${property.netM2 ?? "—"} / ${property.grossM2 ?? "—"}`
          : undefined,
      )}</td></tr>
      <tr><th>İstenen bedel</th><td>${formatTry(property.askingPriceTry)}</td></tr>
      ${property.title ? `<tr><th>Açıklama</th><td>${dash(property.title)}</td></tr>` : ""}
    </table>

    <h2>${owner ? "5" : "4"}. Beyan ve hükümler</h2>
    <ol class="clauses">
      ${clauses.map((c) => `<li>${escapeHtml(c)}</li>`).join("\n      ")}
    </ol>

    ${
      meta.notes
        ? `<p><strong>Not:</strong> ${escapeHtml(meta.notes)}</p>`
        : ""
    }

    <div class="signatures">
      <div class="sig-box">
        <div class="role">Emlak Ofisi / Danışman</div>
        <div class="hint">${
          signatures?.brokerSignedAt
            ? "İmzalandı: " + formatDateTr(signatures.brokerSignedAt)
            : "Ad Soyad / İmza / Tarih"
        }</div>
      </div>
      <div class="sig-box">
        <div class="role">Müşteri</div>
        <div class="hint">${
          signatures?.clientSignedAt
            ? "İmzalandı: " + formatDateTr(signatures.clientSignedAt)
            : "Ad Soyad / İmza / Tarih"
        }</div>
      </div>
    </div>

    <footer class="footer">
      Finatura Dijital Maslak iskeleti · Bu belge bilgilendirme / ön anlaşma amaçlıdır; hukuki danışmanlık değildir.
    </footer>
  </div>
</body>
</html>`;
}
