import { apiConfig, endpoints } from "./config";
import { documentAgentFetch } from "./client";
import { mockAnalyze, type AnalyzeResult } from "./mock";

/**
 * POST {DOCUMENT_AGENT}/api/v1/documents/analyze
 * multipart: file (+ opsiyonel documentType)
 */
export async function analyzeDocument(
  file: File,
  documentType?: string,
): Promise<AnalyzeResult> {
  if (apiConfig.useMock) {
    await delay(600);
    return mockAnalyze(file.name);
  }

  const form = new FormData();
  form.append("file", file);
  if (documentType) form.append("documentType", documentType);

  const raw = await documentAgentFetch<Record<string, unknown>>(
    endpoints.documentsAnalyze,
    { method: "POST", body: form },
  );

  return normalizeAnalyze(raw);
}

function normalizeAnalyze(raw: Record<string, unknown>): AnalyzeResult {
  const documentType =
    typeof raw.documentType === "string"
      ? raw.documentType
      : typeof raw.type === "string"
        ? raw.type
        : "unknown";

  const confidence =
    typeof raw.confidence === "number"
      ? raw.confidence
      : typeof raw.score === "number"
        ? raw.score
        : 0;

  const fields: AnalyzeResult["fields"] = {};
  const parsed = raw.parsed ?? raw.data ?? raw.fields;
  if (parsed && typeof parsed === "object") {
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        v === null ||
        typeof v === "string" ||
        typeof v === "number"
      ) {
        fields[k] = v;
      } else if (v !== undefined) {
        fields[k] = String(v);
      }
    }
  }

  return {
    documentType,
    confidence,
    source: "live",
    fields,
    raw,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
