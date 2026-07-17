import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import {
  creditTenantKontor,
  debitTenantKontor,
  fetchAdminKontorLedger,
  fetchAdminTenantDetail,
  fetchAdminTenants,
  patchTenantStatus,
  type AdminTenantListItem,
  type AdminTenantUser,
  type KontorBalance,
  type KontorLedgerEntry,
} from "../api/adminTenants";
import { useAuth } from "../auth/AuthContext";

function formatKontor(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(n);
}

export function TenantYonetimiPage() {
  const { session } = useAuth();
  const isAdmin = Boolean(session?.user.isPlatformAdmin);

  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminTenantListItem[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailStatus, setDetailStatus] = useState<string>("");
  const [balance, setBalance] = useState<KontorBalance | null>(null);
  const [users, setUsers] = useState<AdminTenantUser[]>([]);
  const [ledger, setLedger] = useState<KontorLedgerEntry[]>([]);
  const [amount, setAmount] = useState("100");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminTenants({ q: q.trim() || undefined });
      setItems(data.items);
      setWarning(data.warning ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tenant listesi alınamadı");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadList();
  }, [isAdmin, loadList]);

  async function selectTenant(id: string) {
    setSelectedId(id);
    setMsg(null);
    setError(null);
    setBusy(true);
    try {
      const [detail, led] = await Promise.all([
        fetchAdminTenantDetail(id),
        fetchAdminKontorLedger(id, 40),
      ]);
      setDetailStatus(detail.tenant.status);
      setBalance(detail.kontor);
      setUsers(detail.users);
      setLedger(led.items);
      if (detail.warning) setWarning(detail.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detay yüklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function runKontor(action: "credit" | "debit") {
    if (!selectedId) return;
    const n = Number(amount);
    if (!(n > 0)) {
      setError("Tutar pozitif olmalı");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res =
        action === "credit"
          ? await creditTenantKontor(
              selectedId,
              n,
              description.trim() || undefined,
            )
          : await debitTenantKontor(
              selectedId,
              n,
              description.trim() || undefined,
            );
      setBalance(res.balance);
      setMsg(
        action === "credit"
          ? `${formatKontor(n)} kontör yüklendi. Yeni bakiye: ${formatKontor(res.balance.available)}`
          : `${formatKontor(n)} kontör düşüldü. Yeni bakiye: ${formatKontor(res.balance.available)}`,
      );
      setDescription("");
      const led = await fetchAdminKontorLedger(selectedId, 40);
      setLedger(led.items);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  function onCreditSubmit(e: FormEvent) {
    e.preventDefault();
    void runKontor("credit");
  }

  async function toggleStatus() {
    if (!selectedId) return;
    const next = detailStatus === "suspended" ? "active" : "suspended";
    setBusy(true);
    setError(null);
    try {
      await patchTenantStatus(selectedId, next);
      setDetailStatus(next);
      setMsg(next === "suspended" ? "Tenant askıya alındı." : "Tenant aktifleştirildi.");
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi");
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const selected = items.find((i) => i.id === selectedId);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Tenant & kontör yönetimi</h1>
          <p>
            Superadmin — firmalara kontör ata/düş, ledger izle, kullanıcıları gör,
            askıya al.
          </p>
        </div>
      </header>

      {warning ? <p className="form-ok">{warning}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {msg ? <p className="form-ok">{msg}</p> : null}

      <div className="admin-split">
        <section className="panel">
          <div className="toolbar" style={{ marginBottom: "0.75rem" }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="tenant-q">Ara</label>
              <input
                id="tenant-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="slug, ünvan, e-posta…"
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={() => void loadList()}
            >
              Yenile
            </button>
          </div>

          {loading ? (
            <p className="meta-hint">Yükleniyor…</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Firma</th>
                  <th>Durum</th>
                  <th>Kontör</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-hint">
                      Tenant yok
                    </td>
                  </tr>
                ) : (
                  items.map((t) => (
                    <tr
                      key={t.id}
                      className={
                        selectedId === t.id ? "row-selected" : undefined
                      }
                      style={{ cursor: "pointer" }}
                      onClick={() => void selectTenant(t.id)}
                    >
                      <td>
                        <strong>{t.displayName}</strong>
                        <br />
                        <span className="meta-hint">{t.slug}</span>
                      </td>
                      <td>{t.status}</td>
                      <td className="num">
                        {formatKontor(t.kontor.available)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          {!selectedId ? (
            <p className="empty-hint">Soldan bir tenant seçin.</p>
          ) : (
            <>
              <h2 className="panel-title">
                {selected?.displayName ?? "Tenant"}
              </h2>
              <p className="meta-hint">
                {selected?.slug} · durum: <strong>{detailStatus}</strong>
                {balance
                  ? ` · bakiye ${formatKontor(balance.balance)} (kullanılabilir ${formatKontor(balance.available)}, rezerv ${formatKontor(balance.reserved)})`
                  : null}
              </p>

              <div className="toolbar" style={{ margin: "0.75rem 0" }}>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() => void toggleStatus()}
                >
                  {detailStatus === "suspended"
                    ? "Aktifleştir"
                    : "Askıya al"}
                </button>
              </div>

              <form
                className="form-grid"
                onSubmit={onCreditSubmit}
                style={{ marginBottom: "1rem" }}
              >
                <h3 className="panel-title">Kontör işlemi</h3>
                <div className="field">
                  <label htmlFor="kontor-amount">Tutar</label>
                  <input
                    id="kontor-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="kontor-desc">Açıklama</label>
                  <input
                    id="kontor-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="örn. Kampanya hediyesi"
                  />
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={busy}
                  >
                    Kontör yükle
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={busy}
                    onClick={() => void runKontor("debit")}
                  >
                    Kontör düş
                  </button>
                </div>
              </form>

              <h3 className="panel-title">Kullanıcılar</h3>
              <table>
                <thead>
                  <tr>
                    <th>Ad</th>
                    <th>E-posta</th>
                    <th>Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="empty-hint">
                        Üye yok
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.fullName}</td>
                        <td>{u.email}</td>
                        <td>
                          {u.role}
                          {u.isPlatformAdmin ? " · platform" : ""}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <h3 className="panel-title" style={{ marginTop: "1.25rem" }}>
                Kontör ledger
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Tip</th>
                    <th>Tutar</th>
                    <th>Bakiye</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-hint">
                        Hareket yok
                      </td>
                    </tr>
                  ) : (
                    ledger.map((e) => (
                      <tr key={e.id}>
                        <td>{e.createdAt.slice(0, 19).replace("T", " ")}</td>
                        <td>{e.entryType}</td>
                        <td className="num">{formatKontor(e.amount)}</td>
                        <td className="num">
                          {formatKontor(e.balanceAfter)}
                        </td>
                        <td>{e.description ?? e.referenceType ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </section>
      </div>
    </>
  );
}
