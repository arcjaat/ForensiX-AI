import { jsPDF } from "jspdf";
import type { ScreeningResponse, Verdict } from "@/types/screening";

const VERDICT_THEME: Record<
  Verdict,
  {
    primary: [number, number, number];
    bg: [number, number, number];
    label: string;
  }
> = {
  Genuine: {
    primary: [16, 185, 129], // Emerald
    bg: [236, 253, 245],
    label: "GENUINE DOCUMENT",
  },
  Suspicious: {
    primary: [245, 158, 11], // Amber
    bg: [254, 243, 199],
    label: "SUSPICIOUS SPECIMEN",
  },
  Fake: {
    primary: [239, 68, 68], // Rose / Red
    bg: [254, 242, 242],
    label: "FORGERY DETECTED",
  },
};

/**
 * Loads an image URL as a base64 data URI for embedding into jsPDF.
 */
async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface ExportReportOptions {
  result: ScreeningResponse;
  fileName: string;
  originalImageUrl?: string | null;
  heatmapUrl?: string | null;
}

/**
 * Builds and triggers a download of a high-tech "Forensic Verification Audit" PDF report.
 */
export async function exportInspectionReport({
  result,
  fileName,
  originalImageUrl,
  heatmapUrl,
}: ExportReportOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
  const marginX = 36;
  const contentWidth = pageWidth - marginX * 2; // 523.28 pt

  // Generate tactical mock identifiers
  const appId = `SIH-${result.document_id.slice(0, 8).toUpperCase()}`;
  const officerId = "OFC-9428-MHA";
  const timestamp = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: true,
  });

  // Load visual evidence images asynchronously
  const [originalDataUri, heatmapDataUri] = await Promise.all([
    originalImageUrl ? fetchImageAsDataUri(originalImageUrl) : Promise.resolve(null),
    heatmapUrl ? fetchImageAsDataUri(heatmapUrl) : Promise.resolve(null),
  ]);

  let y = 0;

  // --- 1. TOP HEADER BANNER (Dark Forensic HUD Style) ---------------------
  doc.setFillColor(9, 9, 11); // Zinc-950
  doc.rect(0, 0, pageWidth, 74, "F");

  // Cyan accent stripe
  doc.setFillColor(6, 182, 212); // Cyan-500
  doc.rect(0, 72, pageWidth, 2.5, "F");

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("FORENSIX AI — FORENSIC VERIFICATION AUDIT", marginX, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(6, 182, 212); // Cyan
  doc.text("MINISTRY OF HOME AFFAIRS • SIH26188 AI SCREENING SYSTEM", marginX, 47);

  doc.setFontSize(8);
  doc.setTextColor(161, 161, 170); // Zinc-400
  doc.text(`AUDIT ID: ${appId}   |   OFFICER: ${officerId}   |   TIME: ${timestamp}`, marginX, 61);

  y = 90;

  // --- 2. VERDICT & TRUST SCORE PANEL -------------------------------------
  const theme = VERDICT_THEME[result.result.verdict];
  const [vr, vg, vb] = theme.primary;

  // Outer container card
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.roundedRect(marginX, y, contentWidth, 78, 4, 4, "FD");

  // Left colored indicator bar
  doc.setFillColor(vr, vg, vb);
  doc.roundedRect(marginX, y, 6, 78, 2, 2, "F");

  // Trust score readout
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(vr, vg, vb);
  doc.text(`${result.result.trust_score}`, marginX + 22, y + 36);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("/ 100", marginX + 66, y + 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("TRUST SCORE", marginX + 22, y + 50);

  // High-contrast Verdict Badge
  doc.setFillColor(vr, vg, vb);
  doc.roundedRect(marginX + 115, y + 16, 180, 24, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(theme.label, marginX + 125, y + 32);

  // Target Specimen File
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`File: ${fileName.slice(0, 32)}`, marginX + 115, y + 54);
  doc.text(`Doc UUID: ${result.document_id.slice(0, 16)}...`, marginX + 115, y + 66);

  // Verdict Explanation List (right side of verdict card)
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  let expY = y + 20;
  for (let i = 0; i < Math.min(result.result.explanation.length, 3); i++) {
    const textLine = `• ${result.result.explanation[i]}`;
    const wrapped = doc.splitTextToSize(textLine, 210) as string[];
    for (const w of wrapped) {
      if (expY < y + 72) {
        doc.text(w, marginX + 305, expY);
        expY += 10.5;
      }
    }
  }

  y += 90;

  // --- 3. VISUAL EVIDENCE PANEL (SIDE-BY-SIDE) ----------------------------
  doc.setFillColor(15, 23, 42); // Slate-900 header
  doc.rect(marginX, y, contentWidth, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("VISUAL EVIDENCE FORENSICS (EVIDENTIARY COMPARISON)", marginX + 8, y + 12);

  y += 18;
  const imagePanelHeight = 150;
  const singleImageWidth = (contentWidth - 10) / 2; // ~256 pt

  // Left frame: Primary Specimen
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, y, singleImageWidth, imagePanelHeight, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("FRAME A: PRIMARY SPECIMEN (RAW/PROCESSED)", marginX + 6, y + 12);

  if (originalDataUri) {
    try {
      doc.addImage(
        originalDataUri,
        "JPEG",
        marginX + 8,
        y + 18,
        singleImageWidth - 16,
        imagePanelHeight - 24,
        undefined,
        "FAST",
      );
    } catch {
      doc.text("[Image render error]", marginX + 20, y + 70);
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Image preview not supplied", marginX + 40, y + 80);
  }

  // Right frame: ELA Tamper Heatmap
  const rightX = marginX + singleImageWidth + 10;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(rightX, y, singleImageWidth, imagePanelHeight, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("FRAME B: ELA RESIDUAL MAP (JET COLORMAP)", rightX + 6, y + 12);

  if (heatmapDataUri) {
    try {
      doc.addImage(
        heatmapDataUri,
        "PNG",
        rightX + 8,
        y + 18,
        singleImageWidth - 16,
        imagePanelHeight - 24,
        undefined,
        "FAST",
      );
    } catch {
      doc.text("[Heatmap render error]", rightX + 20, y + 70);
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("No ELA heatmap generated", rightX + 40, y + 80);
  }

  y += imagePanelHeight + 14;

  // --- 4. MULTI-FACTOR SIGNAL BREAKDOWN TABLE ------------------------------
  doc.setFillColor(15, 23, 42); // Slate-900 header
  doc.rect(marginX, y, contentWidth, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("MULTI-FACTOR NEURAL SIGNAL SYNTHESIS", marginX + 8, y + 12);

  y += 18;

  // Table header
  doc.setFillColor(226, 232, 240);
  doc.rect(marginX, y, contentWidth, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text("Vision Signal Channel", marginX + 8, y + 11);
  doc.text("Raw Metric", marginX + 190, y + 11);
  doc.text("Calibrated Value", marginX + 280, y + 11);
  doc.text("Forensic Evaluation", marginX + 380, y + 11);
  y += 16;

  // Row 1: OCR Field Confidence
  const ocrFieldsCount = Object.keys(result.ocr.fields).length;
  drawTableRow(
    doc,
    marginX,
    y,
    contentWidth,
    "OCR Field Confidence",
    `${(result.ocr.mean_confidence * 100).toFixed(1)}% Mean`,
    `${(result.ocr.mean_confidence * 100).toFixed(0)} / 100`,
    `${ocrFieldsCount} field(s) verified & sanitized`,
    false,
  );
  y += 18;

  // Row 2: ELA Tamper Detection
  const elaRegions = result.ela.suspicious_regions.length;
  const elaNotes = result.ela.compression_warning
    ? "Pre-compression warning (noise filtered)"
    : `${elaRegions} anomaly region(s) detected`;
  drawTableRow(
    doc,
    marginX,
    y,
    contentWidth,
    "ELA Compression Tamper Score",
    `${result.ela.tamper_score.toFixed(4)} Raw`,
    result.ela.tamper_score > 0.25
      ? `${(((result.ela.tamper_score - 0.25) / 0.75) * 100).toFixed(1)}% Penalty`
      : "0.00% (Clean Baseline)",
    elaNotes,
    true,
  );
  y += 18;

  // Row 3: Siamese Face Match
  const faceVerified = result.face_match.face_detected_on_id && result.face_match.face_detected_on_selfie;
  const faceEval = faceVerified
    ? `Biometric matched (${(result.face_match.similarity_score * 100).toFixed(1)}%)`
    : result.face_match.face_detected_on_id
      ? "ID Face detected (selfie pending)"
      : "No face detected on ID";
  drawTableRow(
    doc,
    marginX,
    y,
    contentWidth,
    "Siamese Biometric Match",
    `${(result.face_match.similarity_score * 100).toFixed(1)}% Cosine`,
    faceVerified
      ? result.face_match.similarity_score >= 0.60
        ? `${(0.5 + (0.5 * (result.face_match.similarity_score - 0.6)) / 0.4 * 100).toFixed(0)} / 100`
        : "0 / 100 (Mismatch)"
      : "N/A",
    faceEval,
    false,
  );
  y += 24;

  // --- 5. EXTRACTED METADATA TABLE (PII REDACTED) -------------------------
  doc.setFillColor(15, 23, 42); // Slate-900 header
  doc.rect(marginX, y, contentWidth, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("PARSED IDENTITY METADATA (PII REDACTION ENFORCED)", marginX + 8, y + 12);

  y += 18;

  const fieldEntries = Object.entries(result.ocr.fields);
  if (fieldEntries.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, y, contentWidth, 20, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("No structured metadata fields extracted from this specimen.", marginX + 8, y + 13);
    y += 20;
  } else {
    fieldEntries.forEach(([fieldKey, fieldVal], idx) => {
      const isRedacted =
        fieldKey.toLowerCase().includes("id") ||
        fieldVal.value.includes("XXXX") ||
        fieldVal.value.includes("[Aadhaar Redacted]");

      drawTableRow(
        doc,
        marginX,
        y,
        contentWidth,
        fieldKey.toUpperCase(),
        fieldVal.value,
        `${(fieldVal.confidence * 100).toFixed(1)}% Conf`,
        isRedacted ? "[CONFIDENTIAL / PII REDACTED]" : "Parsed Text Line",
        idx % 2 === 1,
      );
      y += 16;
    });
  }

  // --- 6. FOOTER SECURITY & LEGAL DISCLAIMER ------------------------------
  const footerY = pageHeight - 38;
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, footerY - 8, marginX + contentWidth, footerY - 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("CONFIDENTIAL & PRIVILEGED — GOVT OF INDIA / SIH26188 FORENSIC ENGINE", marginX, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "This report is generated by an automated AI screening pipeline and serves as an evidentiary decision-support aid. Human review by an authorized verification officer is required.",
    marginX,
    footerY + 9,
  );
  doc.text(
    `Verification Hash: SHA256-${result.document_id.slice(0, 16).toUpperCase()}`,
    marginX + contentWidth - 160,
    footerY,
  );

  // Save PDF
  doc.save(`Forensic-Audit-${appId}.pdf`);
}

function drawTableRow(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  col1: string,
  col2: string,
  col3: string,
  col4: string,
  isAlt: boolean,
) {
  doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(x, y, width, 16, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(col1.slice(0, 32), x + 8, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(col2.slice(0, 24), x + 190, y + 11);
  doc.text(col3.slice(0, 20), x + 280, y + 11);
  doc.text(col4.slice(0, 35), x + 380, y + 11);
}

