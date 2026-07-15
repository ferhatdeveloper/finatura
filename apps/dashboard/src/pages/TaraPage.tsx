import { useState, type ChangeEvent } from "react";
import { analyzeDocument } from "../api/documents";
import type { AnalyzeResult } from "../api/mock";
import { apiConfig, endpoints } from "../api/config";

export function TaraPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    setFile(next);
    setResult(null);
    setError(null);
  }

  async function onAnalyze() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const data = await analyzeDocument(file);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analiz başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Tara</h1>
        <p>
          Belge yükleyin; document-agent{" "}
          <code>{endpoints.documentsAnalyze}</code> ile analiz edilir
          {apiConfig.useMock ? " (mock)" : ""}.
        </p>
      </header>

      <section className="panel upload-panel">
        <label className="dropzone">
          <input
            type="file"
            accept="image/*,.pdf,.txt"
            onChange={onFile}
          />
          <span className="dropzone-title">
            {file ? file.name : "Belge seç veya sürükle"}
          </span>
          <span className="dropzone-hint">
            Noter, tapu, kimlik — PNG / JPG / PDF
          </span>
        </label>

        <div className="row-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={!file || busy}
            onClick={onAnalyze}
          >
            {busy ? "Analiz ediliyor…" : "Analiz et"}
          </button>
          <span className="muted-note">
            {apiConfig.useMock
              ? "Mock yanıt · dosya adına göre tip tahmini"
              : apiConfig.documentAgentUrl}
          </span>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
      </section>

      {result ? (
        <section className="panel">
          <div className="result-head">
            <h2>Sonuç</h2>
            <span className={`badge tone-${result.source === "mock" ? "warn" : "ok"}`}>
              {result.source === "mock" ? "mock" : "canlı"} ·{" "}
              {result.documentType} · %{" "}
              {Math.round(result.confidence * 100)}
            </span>
          </div>
          <dl className="field-grid">
            {Object.entries(result.fields).map(([key, value]) => (
              <div key={key} className="field-row">
                <dt>{key}</dt>
                <dd>{value == null ? "—" : String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
