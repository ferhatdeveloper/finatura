import { useMemo, useState } from "react";
import {
  approvePeriod,
  downloadXml,
  exportLucaJson,
  mockLucaXml,
  verifyCode,
} from "../api/accountant";
import {
  ONAY_BEKLEYENLER,
  OnayBekleyen,
  formatTRY,
  formatTarih,
} from "../data/mock";

const DEFAULT_TENANT = "anadolu-oto";
const DEFAULT_CODE = "MM-2026-DEMO";
const DEFAULT_PERIOD = "2026-07";

function tipToSelection(o: OnayBekleyen): "invoice" | "bank" {
  return o.tip === "Banka Mutabakat" ? "bank" : "invoice";
}

export function TopluOnay() {
  const [kuyruk, setKuyruk] = useState<OnayBekleyen[]>(ONAY_BEKLEYENLER);
  const [secilen, setSecilen] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tenantId, setTenantId] = useState(DEFAULT_TENANT);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [token, setToken] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState<string | null>(null);

  const seciliToplam = useMemo(
    () =>
      kuyruk
        .filter((o) => secilen.has(o.id))
        .reduce((s, o) => s + o.tutar, 0),
    [kuyruk, secilen],
  );

  const hepsiSecili = kuyruk.length > 0 && secilen.size === kuyruk.length;

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }

  function toggle(id: string) {
    setSecilen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleHepsi() {
    if (hepsiSecili) setSecilen(new Set());
    else setSecilen(new Set(kuyruk.map((o) => o.id)));
  }

  async function ensureToken(): Promise<string | null> {
    if (token) return token;
    try {
      const res = await verifyCode(tenantId, code);
      setToken(res.token);
      setSessionLabel(`${res.accountantName} · ${res.tenantName}`);
      return res.token;
    } catch {
      return null;
    }
  }

  async function dogrulaKod() {
    setBusy(true);
    try {
      const res = await verifyCode(tenantId, code);
      setToken(res.token);
      setSessionLabel(`${res.accountantName} · ${res.tenantName}`);
      showToast("Müşavir kodu doğrulandı.");
    } catch (err) {
      setToken(null);
      setSessionLabel(null);
      showToast(
        `Kod doğrulanamadı (mock devam): ${err instanceof Error ? err.message : "ağ hatası"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function isle(aksiyon: "onay" | "red") {
    if (secilen.size === 0) return;
    const adet = secilen.size;
    const seciliKayitlar = kuyruk.filter((o) => secilen.has(o.id));

    if (aksiyon === "red") {
      setKuyruk((prev) => prev.filter((o) => !secilen.has(o.id)));
      setSecilen(new Set());
      showToast(`${adet} belge reddedildi (yerel).`);
      return;
    }

    setBusy(true);
    const invoiceIds = seciliKayitlar
      .filter((o) => tipToSelection(o) === "invoice")
      .map((o) => o.id);
    const bankIds = seciliKayitlar
      .filter((o) => tipToSelection(o) === "bank")
      .map((o) => o.id);

    try {
      const t = await ensureToken();
      if (!t) throw new Error("oturum yok");

      const approved = await approvePeriod({
        token: t,
        tenantId,
        period,
        includeInvoices: invoiceIds.length > 0,
        includeBank: bankIds.length > 0,
        invoiceIds,
        bankIds,
      });

      let downloadNote = "";
      try {
        const exported = await exportLucaJson({
          token: t,
          tenantId,
          period,
          approvalId: approved.approval.id,
        });
        downloadXml(exported.filename, exported.xml);
        downloadNote = ` Luca XML indirildi (${exported.fisAdedi} fiş).`;
      } catch {
        const refs = seciliKayitlar.map((o) => o.referans);
        downloadXml(
          `luca-${tenantId}-${period}-mock.xml`,
          mockLucaXml(period, refs),
        );
        downloadNote = " Luca XML mock indirildi (export API başarısız).";
      }

      setKuyruk((prev) => prev.filter((o) => !secilen.has(o.id)));
      setSecilen(new Set());
      showToast(`${adet} belge onaylandı.${downloadNote}`);
    } catch (err) {
      const refs = seciliKayitlar.map((o) => o.referans);
      downloadXml(
        `luca-${tenantId}-${period}-mock.xml`,
        mockLucaXml(period, refs),
      );
      setKuyruk((prev) => prev.filter((o) => !secilen.has(o.id)));
      setSecilen(new Set());
      showToast(
        `${adet} belge onaylandı (mock fallback). ${err instanceof Error ? err.message : ""}`.trim(),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Toplu onay</h1>
          <p>
            Kod doğrula → dönem onayla → Luca XML. API yoksa yerel mock ile
            devam eder.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-danger"
            disabled={secilen.size === 0 || busy}
            onClick={() => void isle("red")}
          >
            Reddet
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={secilen.size === 0 || busy}
            onClick={() => void isle("onay")}
          >
            Seçilenleri onayla ({secilen.size})
          </button>
        </div>
      </header>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div
          className="filters"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "end",
          }}
        >
          <div className="field">
            <label htmlFor="acc-tenant">Tenant</label>
            <input
              id="acc-tenant"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="acc-code">Müşavir kodu</label>
            <input
              id="acc-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="acc-period">Dönem</label>
            <input
              id="acc-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="YYYY-MM"
              disabled={busy}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void dogrulaKod()}
          >
            Kodu doğrula
          </button>
        </div>
        {sessionLabel && (
          <p style={{ margin: "0.75rem 0 0", opacity: 0.85 }}>
            Oturum: {sessionLabel}
          </p>
        )}
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">Kuyruk</div>
          <div className="value">{kuyruk.length}</div>
        </div>
        <div className="stat">
          <div className="label">Seçili</div>
          <div className="value">{secilen.size}</div>
        </div>
        <div className="stat">
          <div className="label">Seçili tutar</div>
          <div className="value">{formatTRY(seciliToplam)}</div>
        </div>
      </div>

      <div className="panel">
        {kuyruk.length === 0 ? (
          <div className="empty-hint">Onay bekleyen belge kalmadı.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="check-col">
                  <input
                    type="checkbox"
                    checked={hepsiSecili}
                    onChange={toggleHepsi}
                    aria-label="Tümünü seç"
                  />
                </th>
                <th>Tip</th>
                <th>Referans</th>
                <th>Mükellef</th>
                <th>Tarih</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {kuyruk.map((o) => (
                <tr key={o.id}>
                  <td className="check-col">
                    <input
                      type="checkbox"
                      checked={secilen.has(o.id)}
                      onChange={() => toggle(o.id)}
                      aria-label={`${o.referans} seç`}
                    />
                  </td>
                  <td>{o.tip}</td>
                  <td>{o.referans}</td>
                  <td>{o.mukellef}</td>
                  <td>{formatTarih(o.tarih)}</td>
                  <td className="num">{formatTRY(o.tutar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
