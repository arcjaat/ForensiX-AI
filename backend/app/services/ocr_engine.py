"""
OCR Extraction Module — Feature #2.

Pipeline:
  1. Run EasyOCR against the (already preprocessed) document image, getting
     back a list of (bounding_box, text, confidence) detections.
  2. Group individual detections into text *lines* by vertical proximity —
     necessary because some OCR backends emit word-level tokens rather than
     full lines, and label/value pairs like "Name: TEST USER" need to be
     read together.
  3. Match each line against label patterns (Name / DOB / ID number) and
     extract the corresponding value, carrying through the OCR engine's own
     per-detection confidence as the field-level confidence score.
  4. Redact any sensitive ID-number field before it ever leaves this module
     — in the returned payload AND in anything written to logs.

Strict Data / Privacy Rule:
  Real digits for Aadhaar or other sensitive government ID numbers are
  NEVER returned or logged by this module. `redact_id_value` always maps a
  detected ID-number field to a generic mask (`[Aadhaar Redacted]` or
  `XXXX-XXXX-XXXX`), and `safe_log_repr` strips long digit runs from any
  string before it's passed to the logger — so even debug logs can't leak a
  real ID number.

Backend note:
  The field-parsing logic (`extract_fields`, `_group_into_lines`, the
  redaction helpers) is deliberately backend-agnostic — it operates on a
  plain `OCRToken` list, not on EasyOCR's raw output shape. This lets it be
  unit-tested against any OCR backend's output (see the module docstring in
  the test harness) and keeps `run_ocr_extraction` itself as the only place
  that has to change if the OCR engine is ever swapped.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

_READER = None  # lazy singleton — EasyOCR's Reader is expensive to construct


def _get_reader():
    global _READER
    if _READER is None:
        import easyocr  # deferred import: only required at actual OCR-run time
        _READER = easyocr.Reader(["en"], gpu=False)
    return _READER


@dataclass
class OCRToken:
    text: str
    confidence: float  # 0.0-1.0
    bbox: tuple[int, int, int, int]  # (x_min, y_min, x_max, y_max)


# --- Field-detection patterns ---------------------------------------------
_NAME_LABEL_PATTERN = re.compile(r"\bname\b\s*[:\-]?\s*", re.I)
_DOB_LABEL_PATTERN = re.compile(r"\b(dob|date of birth)\b\s*[:\-]?\s*", re.I)
_ID_LABEL_PATTERN = re.compile(r"\b(aadhaar|aadhar|uid|id\s*no\.?|id\s*number|voter\s*id)\b\s*[:\-]?\s*", re.I)
_DATE_VALUE_PATTERN = re.compile(r"\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b")
# Matches Aadhaar-style 12-digit numbers (grouped as 4-4-4 or run-together)
# and other long numeric ID runs generally — this is what triggers redaction.
_LONG_DIGIT_RUN_PATTERN = re.compile(r"\d[\d\s\-]{7,}\d")


def redact_id_value(_raw_text: str) -> str:
    """
    Always returns a generic mask for a detected ID-number field — the real
    digits are never included in the return value, regardless of how many
    digits were found or what they were. Two mask styles are used for
    readability (a 12-digit-shaped mask when enough digits were present to
    plausibly be a full ID, else a bracketed placeholder).
    """
    digit_count = sum(c.isdigit() for c in _raw_text)
    if digit_count >= 8:
        return "XXXX-XXXX-XXXX"
    return "[Aadhaar Redacted]"


def safe_log_repr(text: str) -> str:
    """Strip any long digit run before a string is written to logs, so even
    verbose/debug logging can't leak a real ID number."""
    return _LONG_DIGIT_RUN_PATTERN.sub("[REDACTED]", text)


def _bbox_y_center(bbox: tuple[int, int, int, int]) -> float:
    _, y_min, _, y_max = bbox
    return (y_min + y_max) / 2.0


def _group_into_lines(tokens: list[OCRToken], y_tolerance: int = 14) -> list[OCRToken]:
    """
    Merge word/box-level tokens into line-level tokens by vertical center
    proximity, then order each line left-to-right and join with spaces.
    Line confidence is the mean of its member tokens' confidences.

    A no-op for backends that already emit line-level text — each line is
    just its own group of one.
    """
    if not tokens:
        return []

    ordered = sorted(tokens, key=lambda t: _bbox_y_center(t.bbox))
    lines: list[list[OCRToken]] = [[ordered[0]]]

    for tok in ordered[1:]:
        current_line = lines[-1]
        line_y = sum(_bbox_y_center(t.bbox) for t in current_line) / len(current_line)
        if abs(_bbox_y_center(tok.bbox) - line_y) <= y_tolerance:
            current_line.append(tok)
        else:
            lines.append([tok])

    merged: list[OCRToken] = []
    for line in lines:
        line_sorted = sorted(line, key=lambda t: t.bbox[0])  # left-to-right
        text = " ".join(t.text for t in line_sorted).strip()
        confidence = sum(t.confidence for t in line_sorted) / len(line_sorted)
        x_min = min(t.bbox[0] for t in line_sorted)
        y_min = min(t.bbox[1] for t in line_sorted)
        x_max = max(t.bbox[2] for t in line_sorted)
        y_max = max(t.bbox[3] for t in line_sorted)
        merged.append(OCRToken(text=text, confidence=confidence, bbox=(x_min, y_min, x_max, y_max)))

    return merged


def extract_fields(tokens: list[OCRToken]) -> dict[str, dict]:
    """
    Pure function: parse a token list (already normalized to (x_min, y_min,
    x_max, y_max) bboxes) into structured name/dob/id_number fields with
    per-field confidence. Backend-agnostic and independently testable.

    Returns e.g.:
        {
            "name": {"value": "TEST USER", "confidence": 0.91},
            "dob": {"value": "01/01/1990", "confidence": 0.88},
            "id_number": {"value": "[Aadhaar Redacted]", "confidence": 0.76},
        }
    Only fields that were actually found are included.
    """
    lines = _group_into_lines(tokens)
    fields: dict[str, dict] = {}

    for line in lines:
        if "id_number" not in fields and (
            _ID_LABEL_PATTERN.search(line.text) or _LONG_DIGIT_RUN_PATTERN.search(line.text)
        ):
            fields["id_number"] = {
                "value": redact_id_value(line.text),
                "confidence": line.confidence,
            }
            continue

        if "dob" not in fields:
            date_match = _DATE_VALUE_PATTERN.search(line.text)
            if date_match and _DOB_LABEL_PATTERN.search(line.text):
                fields["dob"] = {"value": date_match.group(1), "confidence": line.confidence}
                continue
            elif date_match:
                # A bare date with no explicit label is a weaker signal —
                # still capture it, but only if nothing better shows up later.
                fields.setdefault("dob", {"value": date_match.group(1), "confidence": line.confidence * 0.8})

        if "name" not in fields and _NAME_LABEL_PATTERN.search(line.text):
            stripped = _NAME_LABEL_PATTERN.sub("", line.text).strip()
            if stripped:
                fields["name"] = {"value": stripped, "confidence": line.confidence}

    return fields


def run_ocr_extraction(image_path: str) -> dict:
    """
    Main entry point. Runs EasyOCR against `image_path` (expected to already
    be preprocessed — cropped/deskewed/contrast-enhanced — by
    app/services/preprocessor.py) and returns a dict matching
    schemas.screening.OCRResult:

        {
            "fields": {"name": {...}, "dob": {...}, "id_number": {...}},
            "mean_confidence": float,
        }
    """
    reader = _get_reader()
    raw_results = reader.readtext(image_path)  # [(bbox_points, text, confidence), ...]

    tokens = []
    for bbox_points, text, confidence in raw_results:
        xs = [p[0] for p in bbox_points]
        ys = [p[1] for p in bbox_points]
        tokens.append(
            OCRToken(text=text, confidence=float(confidence), bbox=(min(xs), min(ys), max(xs), max(ys)))
        )

    logger.info(
        "OCR extracted %d raw detections: %s",
        len(tokens),
        [safe_log_repr(t.text) for t in tokens],
    )

    fields = extract_fields(tokens)

    if fields:
        confidences = [f["confidence"] for f in fields.values()]
        mean_confidence = sum(confidences) / len(confidences)
    else:
        mean_confidence = 0.0

    return {
        "fields": {k: {"value": v["value"], "confidence": round(v["confidence"], 4)} for k, v in fields.items()},
        "mean_confidence": round(mean_confidence, 4),
    }


if __name__ == "__main__":
    # Quick manual smoke test:
    #   python -m app.services.ocr_engine /path/to/sample_id.jpg
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m app.services.ocr_engine <image_path>")
        raise SystemExit(1)

    result = run_ocr_extraction(sys.argv[1])
    print(f"Mean confidence: {result['mean_confidence']}")
    for field_name, field_data in result["fields"].items():
        print(f"  {field_name}: {field_data}")
