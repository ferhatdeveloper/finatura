import { useEffect, useState } from "react";
import {
  createManualCariMovement,
  fetchCariOptions,
  fetchCariSummary,
} from "../api/tenant";
import type { CariOption, CariSummary } from "../api/mock";
import { formatTry } from "../lib/format";
import { endpoints } from "../api/config";

export function CariPage() {
  const [data, setData] = useState<CariSummary | null>(null);
  const [caris, setCaris] = useState<CariOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    cariId: "",
    operation: "tahsilat",
    assetKind: "tl",
    amount: "",
    currencyCode: "TRY",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCariSummary(), fetchCariOptions()])
      .then(([summary, cariItems]) => {
        if (cancelled) return;
        setData(summary);
        setCaris(cariItems);
        setForm((current) => ({
          ...current,
          cariId: current.cariId || cariItems[0]?.id || summary.topCaris[0]?.id || "",
        }));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Yüklenemedi");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(null);

    const amount = Number(form.amount.replace(",", "."));
    if (!form.cariId || !Number.isFinite(amount) || amount <= 0) {
      setError("Cari ve pozitif tutar zorunlu.");
      return;
    }

    setSaving(true);
    try {
      await createManualCariMovement({
        cariId: form.cariId,
        operation: form.operation as "tahsilat" | "tediye",
        assetKind: form.assetKind as "tl" | "gold" | "fx",
        amount,
        currencyCode: form.currencyCode,
        description: form.description.trim() || undefined,
      });
      setSaved(
        form.operation === "tahsilat"
          ? "Elden tahsilat kaydedildi."
          : "Elden tediye kaydedildi.",
      );
      setForm((current) => ({ ...current, amount: "", description: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Elden işlem kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Cari / Veresiye</h1>
        <p>
          Açık borç-alacak özeti · path{" "}
          <code>{endpoints.cariSummary}</code>
        </p>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      {!data && !error ? <p className="muted-note">Yükleniyor…</p> : null}

      {data ? (
        <>
          <div className="stat-grid compact">
            <div className="stat-tile static">
              <span className="stat-label">Cari kart</span>
              <strong>{data.cariCount}</strong>
            </div>
            <div className="stat-tile static">
              <span className="stat-label">Açık veresiye</span>
              <strong>{data.openVeresiyeCount}</strong>
            </div>
            <div className="stat-tile static">
              <span className="stat-label">Açık borç (borçlu)</span>
              <strong>{formatTry(data.openDebitTry)}</strong>
            </div>
            <div className="stat-tile static">
              <span className="stat-label">Açık alacak</span>
              <strong>{formatTry(data.openCreditTry)}</strong>
            </div>
          </div>

          <section className="panel">
            <h2>Öne çıkan cariler</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unvan</th>
                  <th>Açık bakiye</th>
                </tr>
              </thead>
              <tbody>
                {data.topCaris.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{formatTry(c.openBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel manual-cari-panel">
            <div>
              <h2>Elden işlem</h2>
              <p className="panel-lede">
                Nakit tahsilat veya tediye banka hareketi oluşturmadan
                veresiye defterine yazılır.
              </p>
            </div>
            {saved ? <p className="form-success">{saved}</p> : null}
            <form className="manual-cari-form" onSubmit={handleSubmit}>
              <label className="field">
                Cari
                <select
                  value={form.cariId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cariId: event.target.value,
                    }))
                  }
                >
                  {caris.map((cari) => (
                    <option key={cari.id} value={cari.id}>
                      {cari.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                İşlem
                <select
                  value={form.operation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      operation: event.target.value,
                    }))
                  }
                >
                  <option value="tahsilat">Elden tahsilat</option>
                  <option value="tediye">Elden tediye</option>
                </select>
              </label>
              <label className="field">
                Varlık
                <select
                  value={form.assetKind}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      assetKind: event.target.value,
                      currencyCode:
                        event.target.value === "fx" ? "USD" : "TRY",
                    }))
                  }
                >
                  <option value="tl">TL</option>
                  <option value="gold">Altın</option>
                  <option value="fx">Döviz</option>
                </select>
              </label>
              <label className="field">
                Tutar
                <input
                  value={form.amount}
                  inputMode="decimal"
                  placeholder="1250"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                Para birimi
                <select
                  value={form.currencyCode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      currencyCode: event.target.value,
                    }))
                  }
                >
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>
              <label className="field manual-note">
                Not
                <textarea
                  value={form.description}
                  placeholder="Örn. elden kapora alındı"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <button className="btn-primary" disabled={saving || !form.cariId}>
                {saving ? "Kaydediliyor…" : "Elden işlemi kaydet"}
              </button>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}
