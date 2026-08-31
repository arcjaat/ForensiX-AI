import type { HealthResponse, PreprocessResponse, ScreeningResponse } from "@/types/screening";

// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.ts).
// In prod, set VITE_API_BASE_URL to the deployed backend origin.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string | unknown };
    if (typeof body?.detail === "string") return body.detail;
    return JSON.stringify(body?.detail ?? body);
  } catch {
    return response.statusText || `Request failed with status ${response.status}`;
  }
}

/** GET /health — used by the header's connection status indicator. */
export async function checkHealth(signal?: AbortSignal): Promise<{ ok: boolean; latencyMs: number }> {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal });
    const latencyMs = Math.round(performance.now() - startedAt);
    if (!response.ok) return { ok: false, latencyMs };
    const data = (await response.json()) as HealthResponse;
    return { ok: data.status === "ok", latencyMs };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - startedAt) };
  }
}

/** POST /preprocess — auto-crop / deskew / contrast-enhance a raw upload. */
export async function preprocessDocument(file: File): Promise<PreprocessResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/preprocess`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as PreprocessResponse;
}

/** POST /screen — the Risk Fusion Engine: OCR + ELA + face-match -> Trust Score. */
export async function screenDocument(idDocument: File, selfie?: File | null): Promise<ScreeningResponse> {
  const formData = new FormData();
  formData.append("id_document", idDocument);
  if (selfie) formData.append("selfie", selfie);

  const response = await fetch(`${API_BASE_URL}/screen`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as ScreeningResponse;
}

/** Resolve a backend-relative static path (e.g. an ELA heatmap) to a fetchable URL. */
export function resolveAssetUrl(backendPath: string): string {
  // Backend paths look like "app/static/ela_outputs/xyz.png". main.py mounts
  // StaticFiles at /static pointing at the app/static directory, so stripping
  // the leading "app/" gives the correct served path.
  const relative = backendPath.replace(/^app\//, "");
  const origin = API_BASE_URL.startsWith("http") ? new URL(API_BASE_URL).origin : "";
  return `${origin}/${relative}`;
}
