"""
Error Level Analysis (ELA) Tamper Detection — Feature #3.

How ELA works:
  A genuine, single-source JPEG has a roughly uniform compression error
  across the whole frame, because every region has been through the same
  number of compression passes. When a region is spliced in from another
  image (or edited and re-saved), that patch has a *different* compression
  history than the rest of the document. Re-saving the whole image at a
  known quality (e.g. 90%) and diffing against the original exaggerates
  those inconsistencies — spliced/edited regions "light up" brighter than
  their surroundings in the difference map.

This module:
  1. Loads the image and re-encodes it to JPEG at a fixed quality.
  2. Computes the per-pixel absolute difference (the raw ELA signal).
  3. Amplifies and colorizes that difference into a heatmap for the UI.
  4. Extracts a 0.0-1.0 tamper_score and bounding boxes of the most
     suspicious high-error regions, so the fusion engine and UI don't have
     to re-derive them from the raw heatmap.

Notes / limitations (worth surfacing to an officer, not hiding):
  - ELA is a heuristic, not proof. Scanned documents, heavy re-compression
    by messaging apps, or low-quality source photos can all raise the
    apparent tamper_score without actual forgery. It should feed into the
    fused Trust Score alongside OCR and face-match signals, not be used
    alone to reject a document.
  - Works best on JPEG inputs. PNGs have no native compression-artifact
    history, so this function still runs (by round-tripping through JPEG)
    but the signal is inherently weaker/noisier — this is reflected by
    widening the noise-floor threshold for non-JPEG sources.
"""
from __future__ import annotations

import io
import os
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image

# --- Tunables -----------------------------------------------------------
ELA_JPEG_QUALITY = 90
ELA_AMPLIFICATION = 15          # multiplies the raw diff so it's visible in the heatmap
MIN_REGION_AREA_PX = 400        # ignore tiny noise blobs when finding suspicious regions
MAX_REGIONS_RETURNED = 8
# Tamper score is derived from the max of a global high-percentile signal and
# the strongest localized region's error, normalized against these bounds
# (tuned empirically for ID-card scans).
SCORE_LOW_BOUND = 4.0
SCORE_HIGH_BOUND = 55.0
# Background (non-suspicious-region) noise floor above which we flag the
# image as having gone through heavy/repeated JPEG re-compression — e.g. an
# ID photographed once, then forwarded through WhatsApp/Telegram a few times,
# each hop re-encoding the whole frame at a lower quality. This is measured
# from the *source* image's own JPEG quantization table (see
# `_assess_compression_warning`), not from the ELA diff map: heavy prior
# compression actually *flattens* high-frequency detail, which tends to
# reduce, not increase, the residual diff our own 90%-quality re-save
# produces — so the diff map itself is an inverted, unreliable signal for
# this specific check.
COMPRESSION_WARNING_QUANT_MEAN_THRESHOLD = 15.0  # roughly below source JPEG quality ~85
COMPRESSION_WARNING_MESSAGE = (
    "High compression detected. ELA score should be evaluated alongside "
    "OCR and face-match verification."
)


@dataclass
class ELARegion:
    x: int
    y: int
    width: int
    height: int
    mean_error: float


def _load_image_bgr(image_path: str) -> np.ndarray:
    img = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Could not read image at {image_path}. Is it a valid JPEG/PNG?")
    return img


def _is_jpeg(image_path: str) -> bool:
    ext = os.path.splitext(image_path)[1].lower()
    return ext in (".jpg", ".jpeg")


def _recompress_and_diff(img_bgr: np.ndarray, quality: int = ELA_JPEG_QUALITY) -> np.ndarray:
    """Re-save at a fixed JPEG quality in-memory and return the per-pixel
    absolute difference (grayscale, uint8) against the original."""
    pil_img = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))

    buffer = io.BytesIO()
    pil_img.save(buffer, "JPEG", quality=quality)
    buffer.seek(0)
    recompressed = Image.open(buffer).convert("RGB")
    recompressed_bgr = cv2.cvtColor(np.array(recompressed), cv2.COLOR_RGB2BGR)

    diff = cv2.absdiff(img_bgr, recompressed_bgr)
    diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    return diff_gray


def _build_heatmap(diff_gray: np.ndarray) -> np.ndarray:
    """Amplify the diff and apply a color map so tampered regions stand out
    visually (JET: blue = low error, red = high error)."""
    amplified = np.clip(diff_gray.astype(np.float32) * ELA_AMPLIFICATION, 0, 255).astype(np.uint8)
    heatmap = cv2.applyColorMap(amplified, cv2.COLORMAP_JET)
    return heatmap


def _overlay_heatmap(original_bgr: np.ndarray, heatmap: np.ndarray, alpha: float = 0.55) -> np.ndarray:
    if original_bgr.shape[:2] != heatmap.shape[:2]:
        heatmap = cv2.resize(heatmap, (original_bgr.shape[1], original_bgr.shape[0]))
    return cv2.addWeighted(original_bgr, 1 - alpha, heatmap, alpha, 0)


def _find_suspicious_regions(diff_gray: np.ndarray) -> list[ELARegion]:
    """Threshold the raw diff map and return bounding boxes of the highest-
    error connected components, sorted by mean error descending."""
    # Otsu gives an adaptive threshold rather than a hardcoded magic number.
    _, thresh = cv2.threshold(diff_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    regions: list[ELARegion] = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < MIN_REGION_AREA_PX:
            continue
        x, y, w, h = cv2.boundingRect(c)
        mask = np.zeros(diff_gray.shape, dtype=np.uint8)
        cv2.drawContours(mask, [c], -1, 255, thickness=cv2.FILLED)
        mean_error = float(cv2.mean(diff_gray, mask=mask)[0])
        regions.append(ELARegion(x=int(x), y=int(y), width=int(w), height=int(h), mean_error=mean_error))

    regions.sort(key=lambda r: r.mean_error, reverse=True)
    return regions[:MAX_REGIONS_RETURNED]


def _compute_tamper_score(
    diff_gray: np.ndarray,
    is_jpeg_source: bool,
    regions: list[ELARegion],
    score_low_bound: float,
    score_high_bound: float,
) -> float:
    """Map the ELA error signal onto a 0.0-1.0 tamper score.

    A pure global percentile (e.g. p95 of the whole frame) under-detects
    realistic forgeries: a spliced photo or altered number field is often a
    small fraction of a full ID-card image, so it gets diluted by the
    uniform background before it reaches the top percentiles. To catch
    localized tampering, the score takes the *max* of:
      (a) a global high-percentile signal (p99) — catches broad, frame-wide
          recompression inconsistencies, and
      (b) the strongest connected-component's mean error from
          `_find_suspicious_regions` — catches small, localized splices.

    Non-JPEG sources get a wider noise floor since they lack a native
    compression-artifact baseline, which otherwise inflates false positives.
    """
    p99 = float(np.percentile(diff_gray, 99))
    strongest_region_error = max((r.mean_error for r in regions), default=0.0)
    raw_signal = max(p99, strongest_region_error)

    low = score_low_bound if is_jpeg_source else score_low_bound * 1.8
    high = score_high_bound if is_jpeg_source else score_high_bound * 1.3

    normalized = (raw_signal - low) / max(high - low, 1e-6)
    return float(np.clip(normalized, 0.0, 1.0))


def _assess_compression_warning(image_path: str, quant_mean_threshold: float) -> tuple[bool, str]:
    """
    Distinguish "this file has already been through heavy/repeated JPEG
    re-compression" (e.g. an ID photo forwarded through several rounds of
    WhatsApp/Telegram, each hop re-encoding at a lower quality) from a
    fresh, single-generation photo or scan.

    Reads the *source* image's own luminance quantization table directly —
    larger quantization step sizes mean a lower encoding quality was used
    upstream, before this file ever reached us. This is a more reliable
    signal than the ELA diff map for this purpose: heavy prior compression
    destroys high-frequency detail, so a further 90%-quality re-save has
    less residual detail to disturb and can actually produce a *smaller*
    diff — the opposite of what "high compression" would naively suggest by
    looking at the ELA output alone.

    Returns (compression_warning, forensic_notes). Non-JPEG sources (no
    quantization table available) return (False, "") — CLAHE/PNG inputs
    aren't assessed by this check.
    """
    try:
        with Image.open(image_path) as im:
            qtables = getattr(im, "quantization", None)
            if not qtables or 0 not in qtables:
                return False, ""
            luma_quant_mean = float(np.mean(qtables[0]))
    except Exception:
        return False, ""

    if luma_quant_mean > quant_mean_threshold:
        return True, COMPRESSION_WARNING_MESSAGE
    return False, ""


def run_ela_analysis(
    image_path: str,
    output_dir: str = "app/static/ela_outputs",
    quality: int = ELA_JPEG_QUALITY,
    score_low_bound: float = SCORE_LOW_BOUND,
    score_high_bound: float = SCORE_HIGH_BOUND,
    compression_quant_threshold: float = COMPRESSION_WARNING_QUANT_MEAN_THRESHOLD,
) -> dict:
    """
    Main entry point. Runs the full ELA pipeline against a single image and
    returns a dict matching schemas.screening.ELAResult's fields.

    `quality`, `score_low_bound`, `score_high_bound`, and
    `compression_quant_threshold` default to this module's tuned constants,
    but are overridable so the API layer can wire them to
    app.core.config.settings (env-configurable) without this module itself
    needing a pydantic dependency — keeps it runnable standalone via
    `python -m app.services.ela_detector <image>` for quick calibration
    against new sample data.

        {
            "tamper_score": float (0.0-1.0),
            "heatmap_path": str,
            "compression_warning": bool,
            "forensic_notes": str,
            "suspicious_regions": [{"x": int, "y": int, "width": int,
                                     "height": int, "mean_error": float}, ...]
        }

    Raises ValueError if the image can't be read.
    """
    os.makedirs(output_dir, exist_ok=True)

    original = _load_image_bgr(image_path)
    diff_gray = _recompress_and_diff(original, quality=quality)

    heatmap = _build_heatmap(diff_gray)
    overlay = _overlay_heatmap(original, heatmap)

    base_name = os.path.splitext(os.path.basename(image_path))[0]
    heatmap_filename = f"{base_name}_ela_heatmap.png"
    heatmap_path = os.path.join(output_dir, heatmap_filename)
    cv2.imwrite(heatmap_path, overlay)

    regions = _find_suspicious_regions(diff_gray)
    tamper_score = _compute_tamper_score(
        diff_gray,
        is_jpeg_source=_is_jpeg(image_path),
        regions=regions,
        score_low_bound=score_low_bound,
        score_high_bound=score_high_bound,
    )
    compression_warning, forensic_notes = _assess_compression_warning(image_path, compression_quant_threshold)

    return {
        "tamper_score": round(tamper_score, 4),
        "heatmap_path": heatmap_path,
        "compression_warning": compression_warning,
        "forensic_notes": forensic_notes,
        "suspicious_regions": [
            {
                "x": r.x,
                "y": r.y,
                "width": r.width,
                "height": r.height,
                "mean_error": round(r.mean_error, 2),
            }
            for r in regions
        ],
    }


if __name__ == "__main__":
    # Quick manual smoke test:
    #   python -m app.services.ela_detector /path/to/sample_id.jpg
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m app.services.ela_detector <image_path>")
        raise SystemExit(1)

    result = run_ela_analysis(sys.argv[1])
    print(f"Tamper score : {result['tamper_score']}")
    print(f"Compression warning: {result['compression_warning']}")
    if result["forensic_notes"]:
        print(f"Forensic notes: {result['forensic_notes']}")
    print(f"Heatmap saved: {result['heatmap_path']}")
    print(f"Suspicious regions found: {len(result['suspicious_regions'])}")
    for i, region in enumerate(result["suspicious_regions"], 1):
        print(f"  [{i}] {region}")
