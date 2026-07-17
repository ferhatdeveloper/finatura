import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { fetchSystemSettings, saveSystemSettings } from "../api/admin";
import { useAuth } from "../auth/AuthContext";

export function SistemAyarlariPage() {
  const { session } = useAuth();
  const isAdmin = Boolean(session?.user.isPlatformAdmin);

  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState("openrouter");
  const [baseUrl, setBaseUrl] = useState("https://openrouter.ai/api/v1");
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const [keySet, setKeySet] = useState(false);
  const [httpReferer, setHttpReferer] = useState("https://finatura.app");
  const [appTitle, setAppTitle] = useState("Finatura");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await fetchSystemSettings();
        if (cancelled) return;
        setEnabled(String(s["llm.enabled"]) === "true");
        setProvider(String(s["llm.provider"] ?? "openrouter"));
        setBaseUrl(
          String(s["llm.base_url"] ?? "https://openrouter.ai/api/v1"),
        );
        setModel(String(s["llm.model"] ?? "openai/gpt-4o-mini"));
        setKeySet(Boolean(s["llm.api_key_set"]));
        setApiKey("");
        setHttpReferer(String(s["llm.http_referer"] ?? "https://finatura.app"));
        setAppTitle(String(s["llm.app_title"] ?? "Finatura"));
        setSource(String(s._source ?? ""));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ayarlar yüklenemedi");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const payload: Record<string, string> = {
        "llm.enabled": enabled ? "true" : "false",
        "llm.provider": provider,
        "llm.base_url": baseUrl,
        "llm.model": model,
        "llm.http_referer": httpReferer,
        "llm.app_title": appTitle,
      };
      if (apiKey.trim()) payload["llm.api_key"] = apiKey.trim();

      const res = await saveSystemSettings(payload);
      setMsg(
        res.warning
          ? `Kaydedildi (uyarı): ${res.warning}`
          : "Sistem ayarları kaydedildi. Document-agent ~60 sn içinde yeniler.",
      );
      if (apiKey.trim()) {
        setKeySet(true);
        setApiKey("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Sistem ayarları</h1>
          <p>
            Platform superadmin — OCR LLM (OpenRouter) ve genel entegrasyon
            anahtarları.
            {source ? ` Kaynak: ${source}` : ""}
          </p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {msg ? <p className="form-ok">{msg}</p> : null}

      <form className="panel form-grid" onSubmit={(e) => void onSubmit(e)}>
        <h2 className="panel-title">OpenRouter / OCR LLM</h2>

        <label className="field checkbox-row">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          LLM alan çıkarımını etkinleştir (OCR sonrası)
        </label>

        <div className="field">
          <label htmlFor="llm-provider">Sağlayıcı</label>
          <select
            id="llm-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI</option>
            <option value="openai_compatible">OpenAI-compatible</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="llm-base">Base URL</label>
          <input
            id="llm-base"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://openrouter.ai/api/v1"
          />
        </div>

        <div className="field">
          <label htmlFor="llm-model">Model</label>
          <input
            id="llm-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="openai/gpt-4o-mini"
          />
        </div>

        <div className="field">
          <label htmlFor="llm-key">
            API anahtarı {keySet ? "(kayıtlı — yeni girerseniz güncellenir)" : ""}
          </label>
          <input
            id="llm-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={keySet ? "••••••••" : "sk-or-v1-…"}
          />
        </div>

        <div className="field">
          <label htmlFor="llm-ref">OpenRouter HTTP-Referer</label>
          <input
            id="llm-ref"
            value={httpReferer}
            onChange={(e) => setHttpReferer(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="llm-title">OpenRouter X-Title</label>
          <input
            id="llm-title"
            value={appTitle}
            onChange={(e) => setAppTitle(e.target.value)}
          />
        </div>

        <p className="meta-hint">
          Alternatif: document-agent env —{" "}
          <code>OPENROUTER_API_KEY</code>, <code>LLM_ENABLED=true</code>,{" "}
          <code>LLM_PROVIDER=openrouter</code>. Env varsa panel değerinin önüne
          geçer.
        </p>

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>
    </>
  );
}
