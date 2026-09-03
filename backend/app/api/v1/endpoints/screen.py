"""
POST /api/v1/screen — Risk Fusion Engine & Database Audit Logger.

Runs OCR extraction, ELA tamper detection, and face matching concurrently,
fuses the three signals into a single 0-100 Trust Score + Verdict, and
asynchronously records the full audit log into PostgreSQL (Supabase).

Strict PII Mandate:
  All detected numeric ID values are strictly sanitized (e.g. '[Aadhaar Redacted]'
  or 'XXXX-XXXX-XXXX') before insertion into extracted_metadata table.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, BackgroundTasks

from app.core.config import settings
from app.core.validators import validate_upload, safe_file_suffix
from app.database import SessionLocal
from app.models import ScreeningLog, ExtractedMetadata, ForensicRegion
from app.schemas.screening import (
    ScreeningResponse,
    OCRResult,
    OCRField,
    ELAResult,
    FaceMatchResult,
    ScreeningVerdict,
)
from app.services.ela_detector import run_ela_analysis
from app.services.ocr_engine import run_ocr_extraction, redact_id_value
from app.services.face_matcher import run_face_match

logger = logging.getLogger(__name__)

router = APIRouter()


async def _run_ocr(image_path: Path) -> OCRResult:
    """Runs EasyOCR extraction in a worker thread. Falls back gracefully on error."""
    try:
        result = await asyncio.to_thread(run_ocr_extraction, str(image_path))
    except Exception as e:
        logger.warning("OCR extraction failed: %s", e)
        return OCRResult(fields={}, mean_confidence=0.0)
    fields = {k: OCRField(**v) for k, v in result.get("fields", {}).items()}
    return OCRResult(fields=fields, mean_confidence=result.get("mean_confidence", 0.0))


async def _run_ela(image_path: Path) -> ELAResult:
    """Runs ELA tamper detection in a worker thread using configured thresholds."""
    result = await asyncio.to_thread(
        run_ela_analysis,
        str(image_path),
        output_dir=settings.ELA_OUTPUT_DIR,
        quality=settings.ELA_JPEG_QUALITY,
        score_low_bound=settings.ELA_SCORE_LOW_BOUND,
        score_high_bound=settings.ELA_SCORE_HIGH_BOUND,
        compression_quant_threshold=settings.ELA_COMPRESSION_WARNING_QUANT_MEAN_THRESHOLD,
    )
    return ELAResult(**result)


async def _run_face_match(id_image_path: Path, selfie_path: Path | None) -> FaceMatchResult:
    """Runs biometric face detection & cosine similarity in a worker thread."""
    try:
        result = await asyncio.to_thread(
            run_face_match,
            str(id_image_path),
            str(selfie_path) if selfie_path is not None else None,
        )
    except Exception as e:
        logger.warning("Face matching failed: %s", e)
        return FaceMatchResult(
            similarity_score=0.0,
            face_detected_on_id=False,
            face_detected_on_selfie=False,
        )
    return FaceMatchResult(**result)


def _calibrate_face_score(raw_score: float, threshold: float = 0.60) -> float:
    """
    Calibrate face match cosine similarity score.
    Cosine similarity naturally hovers around 0.3-0.4 even for different faces.
    - If raw_score < threshold (0.60): returns 0.0 (Definite Mismatch).
    - If raw_score >= threshold (0.60): linearly scales [threshold, 1.0] -> [0.5, 1.0].
    """
    if raw_score < threshold:
        return 0.0
    if raw_score >= 1.0:
        return 1.0
    scaled = 0.5 + 0.5 * ((raw_score - threshold) / (1.0 - threshold))
    return max(0.0, min(1.0, scaled))


def _calibrate_ela_score(raw_score: float, baseline: float = 0.25) -> float:
    """
    Calibrate ELA tamper score to account for baseline JPEG compression noise.
    - If raw_score <= baseline (0.25): returns 0.0 (treated as clean).
    - If raw_score > baseline: linearly scales [baseline, 1.0] -> [0.0, 1.0].
    """
    if raw_score <= baseline:
        return 0.0
    if raw_score >= 1.0:
        return 1.0
    scaled = (raw_score - baseline) / (1.0 - baseline)
    return max(0.0, min(1.0, scaled))


def _fuse_scores(ocr: OCRResult, ela: ELAResult, face: FaceMatchResult) -> ScreeningVerdict:
    """
    Calculates non-linear, penalty-based 0-100 Trust Score and actionable verdict.

    1. Calibrate Face Match & ELA Signals.
    2. Base Identity Score:
       - 50% OCR Confidence + 50% Calibrated Face Match (if selfie biometric match active)
       - 100% OCR Confidence (if no selfie provided)
    3. Tamper Penalty:
       - Multiplicative penalty: Final Trust Score = Base Score * (1.0 - Calibrated ELA Penalty)
    """
    raw_face = face.similarity_score
    calibrated_face = _calibrate_face_score(raw_face, settings.FACE_MATCH_THRESHOLD)

    raw_ela = ela.tamper_score
    calibrated_ela = _calibrate_ela_score(raw_ela, settings.ELA_NOISE_BASELINE)

    # Base Identity Score
    has_selfie_match = face.face_detected_on_id and face.face_detected_on_selfie
    if has_selfie_match:
        base_score = 0.50 * ocr.mean_confidence + 0.50 * calibrated_face
    else:
        base_score = ocr.mean_confidence

    # Tamper Penalty (Multiplicative)
    tamper_penalty = calibrated_ela
    final_score_fraction = base_score * (1.0 - tamper_penalty)
    trust_score = round(max(0.0, min(1.0, final_score_fraction)) * 100)

    explanation = [
        f"OCR mean field confidence: {ocr.mean_confidence:.2f}",
        f"Base identity score: {base_score:.2f}" + (
            f" (50% OCR + 50% Face Match [raw {raw_face:.2f} -> calibrated {calibrated_face:.2f}])"
            if has_selfie_match else " (100% OCR — no selfie biometric intake)"
        ),
        f"ELA tamper penalty: {calibrated_ela:.2f} (raw {raw_ela:.2f}, baseline {settings.ELA_NOISE_BASELINE:.2f})",
    ]
    if ela.compression_warning:
        explanation.append(f"⚠ {ela.forensic_notes}")

    if trust_score >= settings.THRESHOLD_GENUINE:
        verdict = "Genuine"
    elif trust_score >= settings.THRESHOLD_SUSPICIOUS:
        verdict = "Suspicious"
    else:
        verdict = "Fake"

    return ScreeningVerdict(trust_score=trust_score, verdict=verdict, explanation=explanation)


def _persist_screening_sync(
    document_id: str,
    raw_hash: str,
    ocr: OCRResult,
    ela: ELAResult,
    face: FaceMatchResult,
    verdict: ScreeningVerdict,
) -> None:
    """Synchronous database persistence helper intended to run via FastAPI BackgroundTasks."""
    db = SessionLocal()
    try:
        log_entry = ScreeningLog(
            id=document_id,
            officer_id=None,
            document_type="ID_CARD",
            verdict=verdict.verdict,
            trust_score=verdict.trust_score,
            ocr_confidence=ocr.mean_confidence,
            ela_tamper_score=ela.tamper_score,
            compression_warning=ela.compression_warning,
            face_match_score=face.similarity_score,
            raw_image_hash=raw_hash,
        )
        db.add(log_entry)

        # Persist extracted metadata with strict PII redaction
        for field_name, field_data in ocr.fields.items():
            val = field_data.value
            if field_name.lower() in ("id_number", "aadhaar", "aadhar", "uid", "pan", "passport"):
                val = redact_id_value(val)
            meta_entry = ExtractedMetadata(
                screening_id=document_id,
                field_name=field_name,
                field_value_redacted=val,
                confidence=field_data.confidence,
            )
            db.add(meta_entry)

        # Persist suspicious forensic regions
        for region in ela.suspicious_regions:
            x = int(region.get("x", 0))
            y = int(region.get("y", 0))
            w = int(region.get("width", 0))
            h = int(region.get("height", 0))
            err = float(region.get("mean_error", 0.0))
            forensic_entry = ForensicRegion(
                screening_id=document_id,
                x_min=x,
                y_min=y,
                x_max=x + w,
                y_max=y + h,
                anomaly_score=err,
            )
            db.add(forensic_entry)

        db.commit()
        logger.info("Persisted screening audit record for document %s", document_id)
    except Exception as e:
        db.rollback()
        logger.error("Failed to persist screening log for document %s: %s", document_id, e)
    finally:
        db.close()


@router.post("", response_model=ScreeningResponse)
async def screen_document(
    background_tasks: BackgroundTasks,
    id_document: UploadFile = File(...),
    selfie: UploadFile | None = File(None),
):
    validate_upload(id_document)
    if selfie is not None:
        validate_upload(selfie)

    document_id = str(uuid.uuid4())
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    id_bytes = await id_document.read()
    raw_hash = hashlib.sha256(id_bytes).hexdigest()

    id_suffix = safe_file_suffix(id_document.filename)
    id_path = upload_dir / f"{document_id}_id{id_suffix}"
    id_path.write_bytes(id_bytes)

    selfie_path = None
    if selfie is not None:
        selfie_bytes = await selfie.read()
        selfie_suffix = safe_file_suffix(selfie.filename)
        selfie_path = upload_dir / f"{document_id}_selfie{selfie_suffix}"
        selfie_path.write_bytes(selfie_bytes)

    # Run detection signals concurrently
    ocr_result, ela_result, face_result = await asyncio.gather(
        _run_ocr(id_path),
        _run_ela(id_path),
        _run_face_match(id_path, selfie_path),
    )

    verdict = _fuse_scores(ocr_result, ela_result, face_result)

    # Persist audit logs via FastAPI background tasks
    background_tasks.add_task(
        _persist_screening_sync,
        document_id,
        raw_hash,
        ocr_result,
        ela_result,
        face_result,
        verdict,
    )

    return ScreeningResponse(
        document_id=document_id,
        ocr=ocr_result,
        ela=ela_result,
        face_match=face_result,
        result=verdict,
    )
