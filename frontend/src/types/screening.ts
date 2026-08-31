// Mirrors backend/app/schemas/screening.py and the preprocess/health endpoints.
// Keep these in sync manually — there's no shared codegen step yet.

export interface OCRField {
  value: string;
  confidence: number; // 0.0–1.0
}

export interface OCRResult {
  fields: Record<string, OCRField>;
  mean_confidence: number;
}

export interface ELARegion {
  x: number;
  y: number;
  width: number;
  height: number;
  mean_error: number;
}

export interface ELAResult {
  tamper_score: number; // 0.0–1.0, higher = more evidence of splicing
  heatmap_path: string;
  compression_warning: boolean;
  forensic_notes: string;
  suspicious_regions: ELARegion[];
}

export interface FaceMatchResult {
  similarity_score: number; // 0.0–1.0
  face_detected_on_id: boolean;
  face_detected_on_selfie: boolean;
}

export type Verdict = "Genuine" | "Suspicious" | "Fake";

export interface ScreeningVerdict {
  trust_score: number; // 0–100
  verdict: Verdict;
  explanation: string[];
}

export interface ScreeningResponse {
  document_id: string;
  ocr: OCRResult;
  ela: ELAResult;
  face_match: FaceMatchResult;
  result: ScreeningVerdict;
}

export interface PreprocessResponse {
  document_id: string;
  processed_image_path: string;
  crop_method: "perspective_warp" | "bounding_box" | "none";
  corners_detected: number[][] | null;
}

export interface HealthResponse {
  status: string;
}

// --- Local UI state (not backend-mirrored) --------------------------------

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO
  fileName: string;
  trustScore: number;
  verdict: Verdict;
  documentId: string;
}
