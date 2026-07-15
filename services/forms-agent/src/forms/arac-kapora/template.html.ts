import { SHARED_FORM_CSS } from "../../templates/shared-styles.js";
import { dash, escapeHtml, formatDateTr, formatTry } from "../../utils/format.js";
import type { AracKaporaFormData } from "./types.js";

function paymentLabel(
  m: AracKaporaFormData["deposit"]["paymentMethod"],
): string {
  switch (m) {
    case "nakit":
      return "Nakit";
    case "havale":
      return "Havale";
    case "eft":
      return "EFT";
    case "kredi_karti":
      return "Kredi kartı";
    case "diger":
      return "Diğer";
    default:
      return "—";
  }
}

/** Araç kapora formu HTML şablonu. */
export function renderAracKaporaHtml(data: AracKaporaFormData): string {
  const { letterhead, meta, seller, buyer, vehicle, deposit, terms, signatures } = data;

  const clauses = [
    `Alıcı adayı, yukarıda tanımlı araç için ${formatTry(deposit.amountTry)} tutarında kapora / ön ödeme yatırmıştır.`,
    deposit.agreedSalePriceTry !== undefined
      ? `Tarafların mutabık kaldığı satış bedeli ${formatTry(deposit.agreedSalePriceTry)} olup kapora bu bedelden mahsup edilir.`
      : "Kesin satış bedeli noter sözleşmesi / nihai satış aşamasında belirlenecek veya ayrıca yazılı olarak teyit edilecektir.",
    deposit.holdUntil
      ? `Araç, ${formatDateTr(deposit.holdUntil)} tarihine kadar alıcı adayı lehine rezerve tutulur.`
      : "Rezervasyon süresi satıcı ile ayrıca yazılı olarak belirlenir.",
    deposit.refundPolicy ??
      "Cayma ve iade koşulları: Alıcının kusuruyla satışın gerçekleşmemesi halinde kapora satıcıda kalabilir; satıcının kusuruyla gerçekleşmemesi halinde kapora iade edilir. Detaylar tarafların yazılı anlaşmasına tabidir.",
    "Kesin satış noter / yasal devir işlemleriyle tamamlanır; işbu form ön anlaşma niteliğindedir.",
    ...(terms.extraClauses ?? []),
  ];

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Araç Kapora Formu — ${escapeHtml(meta.documentNo)}</title>
  <style>${SHARED_FORM_CSS}</style>
</head>
<body>
  <div class="sheet">
    <header class="letterhead">
      <h1>${escapeHtml(letterhead.companyName)}</h1>
      <div class="meta">
        ${letterhead.tradeName ? escapeHtml(letterhead.tradeName) + "<br/>" : ""}
        ${letterhead.address ? escapeHtml(letterhead.address) + "<br/>" : ""}
        ${letterhead.phone ? "Tel: " + escapeHtml(letterhead.phone) : ""}
        ${letterhead.taxOffice || letterhead.taxNumber
          ? "<br/>V.D./VN: " +
            escapeHtml([letterhead.taxOffice, letterhead.taxNumber].filter(Boolean).join(" / "))
          : ""}
      </div>
    </header>

    <div class="doc-title">Araç Kapora / Ön Ödeme Formu</div>
    <div class="doc-sub">
      Belge No: ${escapeHtml(meta.documentNo)}
      · Tarih: ${formatDateTr(meta.issuedAt)}
      ${meta.place ? " · Yer: " + escapeHtml(meta.place) : ""}
    </div>

    <h2>1. Satıcı (Galeri)</h2>
    <table class="grid">
      <tr><th>Unvan / Ad Soyad</th><td>${dash(seller.companyTitle ?? seller.fullName)}</td></tr>
      <tr><th>Yetkili</th><td>${dash(seller.fullName)}</td></tr>
      <tr><th>TCKN / VKN</th><td>${dash(seller.tcknOrVkn)}</td></tr>
      <tr><th>Telefon</th><td>${dash(seller.phone)}</td></tr>
      <tr><th>Adres</th><td>${dash(seller.address)}</td></tr>
    </table>

    <h2>2. Alıcı adayı</h2>
    <table class="grid">
      <tr><th>Ad Soyad</th><td>${dash(buyer.fullName)}</td></tr>
      <tr><th>TCKN / VKN</th><td>${dash(buyer.tcknOrVkn)}</td></tr>
      <tr><th>Telefon</th><td>${dash(buyer.phone)}</td></tr>
      <tr><th>Adres</th><td>${dash(buyer.address)}</td></tr>
    </table>

    <h2>3. Araç bilgileri</h2>
    <table class="grid">
      <tr><th>Marka / Model</th><td>${dash(vehicle.brand)} ${dash(vehicle.model)}</td></tr>
      <tr><th>Model yılı</th><td>${dash(vehicle.modelYear)}</td></tr>
      <tr><th>Plaka</th><td>${dash(vehicle.plate)}</td></tr>
      <tr><th>Şasi (VIN)</th><td>${dash(vehicle.vin)}</td></tr>
      <tr><th>Motor No</th><td>${dash(vehicle.engineNo)}</td></tr>
      <tr><th>Renk / Km</th><td>${dash(
        [vehicle.color, vehicle.km !== undefined ? `${vehicle.km} km` : undefined]
          .filter(Boolean)
          .join(" · ") || undefined,
      )}</td></tr>
      <tr><th>Yakıt / Vites</th><td>${dash(
        [vehicle.fuelType, vehicle.gearType].filter(Boolean).join(" / ") || undefined,
      )}</td></tr>
    </table>

    <h2>4. Kapora</h2>
    <table class="grid">
      <tr><th>Kapora tutarı</th><td><strong>${formatTry(deposit.amountTry)}</strong></td></tr>
      <tr><th>Ödeme şekli</th><td>${escapeHtml(paymentLabel(deposit.paymentMethod))}</td></tr>
      <tr><th>Banka / Referans</th><td>${dash(deposit.bankRef)}</td></tr>
      <tr><th>Mutabık satış bedeli</th><td>${formatTry(deposit.agreedSalePriceTry)}</td></tr>
      <tr><th>Rezerve bitiş</th><td>${formatDateTr(deposit.holdUntil)}</td></tr>
    </table>

    <h2>5. Hükümler</h2>
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
        <div class="role">Satıcı</div>
        <div class="hint">${
          signatures?.sellerSignedAt
            ? "İmzalandı: " + formatDateTr(signatures.sellerSignedAt)
            : "Ad Soyad / İmza / Tarih"
        }</div>
      </div>
      <div class="sig-box">
        <div class="role">Alıcı adayı</div>
        <div class="hint">${
          signatures?.buyerSignedAt
            ? "İmzalandı: " + formatDateTr(signatures.buyerSignedAt)
            : "Ad Soyad / İmza / Tarih"
        }</div>
      </div>
    </div>

    <footer class="footer">
      Finatura Dijital Maslak iskeleti · Ön anlaşma formu; noter satışı ve e-fatura süreçlerinden bağımsızdır.
    </footer>
  </div>
</body>
</html>`;
}
