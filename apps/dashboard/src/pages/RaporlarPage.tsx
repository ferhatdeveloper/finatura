import { useEffect, useState } from "react";
import {
  currentPeriod,
  fetchBankReport,
  fetchInvoiceReport,
  fetchKdvReport,
  fetchOverviewReport,
  fetchVeresiyeAgingReport,
  type OverviewReport,
} from "../api/reports";

type Tab = "ozet" | "fatura" | "banka" | "veresiye" | "kdv";

function formatTRY(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

export function RaporlarPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [tab, setTab] = useState<Tab>("ozet");
  const [overview, setOverview] = useState<OverviewReport | null>(null);
  const [invoiceRep, setInvoiceRep] = useState<Awaited<
    ReturnType<typeof fetchInvoiceReport>
  > | null>(null);
  const [bankRep, setBankRep] = useState<Awaited<
    ReturnType<typeof fetchBankReport>
  > | null>(null);
  const [veresiyeRep, setVeresiyeRep] = useState<Awaited<
    ReturnType<typeof fetchVeresiyeAgingReport>
  > | null>(null);
  const [kdvRep, setKdvRep] = useState<Awaited<
    ReturnType<typeof fetchKdvReport>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (tab === "ozet") {
          const data = await fetchOverviewReport(period);
          if (!cancelled) setOverview(data);
        } else if (tab === "fatura") {
          const data = await fetchInvoiceReport(period);
          if (!cancelled) setInvoiceRep(data);
        } else if (tab === "banka") {
          const data = await fetchBankReport(period);
          if (!cancelled) setBankRep(data);
        } else if (tab === "veresiye") {
          const data = await fetchVeresiyeAgingReport();
          if (!cancelled) setVeresiyeRep(data);
        } else if (tab === "kdv") {
          const data = await fetchKdvReport(period);
          if (!cancelled) setKdvRep(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Rapor yüklenemedi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, period]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "ozet", label: "Dönem özeti" },
    { id: "fatura", label: "Fatura listesi" },
    { id: "banka", label: "Banka mutabakat" },
    { id: "veresiye", label: "Veresiye yaşlandırma" },
    { id: "kdv", label: "KDV özeti" },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Raporlar</h1>
          <p>Dönemsel fatura, banka, veresiye ve KDV raporları.</p>
        </div>
        <div className="field" style={{ minWidth: 160 }}>
          <label htmlFor="rapor-period">Dönem</label>
          <input
            id="rapor-period"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </header>

      <div className="toolbar" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "btn-primary" : "btn-ghost"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="meta-hint">Yükleniyor…</p> : null}

      {tab === "ozet" && overview ? (
        <div className="stats">
          <div className="stat">
            <div className="label">Fatura adedi</div>
            <div className="value">{overview.invoices.totalCount}</div>
          </div>
          <div className="stat">
            <div className="label">Fatura toplam</div>
            <div className="value">
              {formatTRY(overview.invoices.totalGrand)}
            </div>
          </div>
          <div className="stat">
            <div className="label">KDV toplam</div>
            <div className="value">{formatTRY(overview.invoices.totalVat)}</div>
          </div>
          <div className="stat">
            <div className="label">Banka eşleşme %</div>
            <div className="value">{overview.bank.matchRatePercent}%</div>
          </div>
          <div className="stat">
            <div className="label">Eşleşmeyen hareket</div>
            <div className="value">{overview.bank.unmatchedCount}</div>
          </div>
          <div className="stat">
            <div className="label">Açık veresiye (net)</div>
            <div className="value">
              {formatTRY(overview.veresiye.netOpenTry)}
            </div>
          </div>
          <div className="stat">
            <div className="label">Aktif cari</div>
            <div className="value">{overview.cariActiveCount}</div>
          </div>
        </div>
      ) : null}

      {tab === "fatura" && invoiceRep ? (
        <div className="panel">
          <p className="meta-hint">
            Toplam {invoiceRep.totals.count} belge ·{" "}
            {formatTRY(invoiceRep.totals.grandTotal)} (KDV{" "}
            {formatTRY(invoiceRep.totals.vatTotal)})
          </p>
          <table>
            <thead>
              <tr>
                <th>Belge</th>
                <th>Tarih</th>
                <th>Karşı taraf</th>
                <th>Tür</th>
                <th>Durum</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {invoiceRep.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-hint">
                    Kayıt yok
                  </td>
                </tr>
              ) : (
                invoiceRep.items.map((i) => (
                  <tr key={String(i.id)}>
                    <td>{String(i.documentNumber ?? "—")}</td>
                    <td>{String(i.issueDate ?? "").slice(0, 10)}</td>
                    <td>{String(i.counterpartyTitle ?? "—")}</td>
                    <td>{String(i.kind)}</td>
                    <td>{String(i.status)}</td>
                    <td className="num">
                      {formatTRY(Number(i.grandTotal ?? 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "banka" && bankRep ? (
        <div className="panel">
          <p className="meta-hint">
            {bankRep.summary.matched}/{bankRep.summary.total} eşleşti (
            {bankRep.summary.matchRatePercent}%) · açık tutar{" "}
            {formatTRY(bankRep.summary.unmatchedAmount)}
          </p>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Banka</th>
                <th>Açıklama</th>
                <th>Yön</th>
                <th>Durum</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {bankRep.items.map((i) => (
                <tr key={String(i.id)}>
                  <td>{String(i.transactionAt ?? "").slice(0, 10)}</td>
                  <td>{String(i.bankAccountAlias ?? "")}</td>
                  <td>{String(i.description ?? i.counterpartyName ?? "")}</td>
                  <td>{String(i.direction)}</td>
                  <td>{String(i.matchStatus)}</td>
                  <td className="num">{formatTRY(Number(i.amount ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "veresiye" && veresiyeRep ? (
        <>
          <div className="stats">
            {Object.entries(veresiyeRep.bucketTotals).map(([k, v]) => (
              <div className="stat" key={k}>
                <div className="label">{k} gün</div>
                <div className="value">{formatTRY(v)}</div>
              </div>
            ))}
            <div className="stat">
              <div className="label">Toplam açık</div>
              <div className="value">{formatTRY(veresiyeRep.totalOpen)}</div>
            </div>
          </div>
          <div className="panel">
            <table>
              <thead>
                <tr>
                  <th>Cari</th>
                  <th>Bakiye</th>
                  <th>Yaş (gün)</th>
                  <th>Kova</th>
                </tr>
              </thead>
              <tbody>
                {veresiyeRep.items.map((i) => (
                  <tr key={i.cariId}>
                    <td>{i.cariTitle}</td>
                    <td className="num">{formatTRY(i.openBalance)}</td>
                    <td>{i.agingDays}</td>
                    <td>{i.bucket}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "kdv" && kdvRep ? (
        <div className="panel">
          <div className="stats">
            <div className="stat">
              <div className="label">Satış KDV</div>
              <div className="value">{formatTRY(kdvRep.summary.salesVat)}</div>
            </div>
            <div className="stat">
              <div className="label">Alış KDV</div>
              <div className="value">
                {formatTRY(kdvRep.summary.purchaseVat)}
              </div>
            </div>
            <div className="stat">
              <div className="label">Ödenecek net KDV</div>
              <div className="value">
                {formatTRY(kdvRep.summary.netVatPayable)}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
