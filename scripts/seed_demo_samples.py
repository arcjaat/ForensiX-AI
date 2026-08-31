"""
Generate synthetic demo sample images for the SIH26188 live pitch.

Produces three files in /samples:
  1. sample_clean.jpg            - a clean, well-lit, single-generation JPEG.
  2. sample_tampered_dob.jpg     - the same card with a localized edit over
                                    the DOB field, to trigger ELA region
                                    detection.
  3. sample_whatsapp_forward.jpg - the same card put through several
                                    resize + low-quality resave passes, to
                                    trigger the compression_warning flag via
                                    the source JPEG's own quantization table.

Strict Data Rule: every field on this card is clearly synthetic ("DEMO
CITIZEN", a placeholder DOB, an all-zero ID number) and the card is
watermarked "SPECIMEN — NOT A REAL DOCUMENT". No realistic-looking ID
numbers are ever generated, per the project's data-handling rule.

Usage:
    python scripts/seed_demo_samples.py
"""
from __future__ import annotations

import os

import cv2
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLES_DIR = os.path.join(SCRIPT_DIR, "..", "samples")

CARD_W, CARD_H = 640, 400


def _draw_base_card(dob_text: str = "01/01/1990") -> np.ndarray:
    """Draws a synthetic, clearly-labeled specimen ID card."""
    card = np.full((CARD_H, CARD_W, 3), 235, dtype=np.uint8)

    # Header band
    cv2.rectangle(card, (0, 0), (CARD_W, 70), (40, 60, 110), -1)
    cv2.putText(card, "SPECIMEN NATIONAL ID", (24, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

    # Card border
    cv2.rectangle(card, (0, 0), (CARD_W - 1, CARD_H - 1), (30, 30, 30), 2)

    # Photo placeholder block
    cv2.rectangle(card, (30, 100), (170, 300), (170, 150, 130), -1)
    cv2.rectangle(card, (30, 100), (170, 300), (90, 90, 90), 2)
    cv2.putText(card, "PHOTO", (65, 205), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

    # Fields — every value here is a clearly-fake placeholder.
    field_x = 200
    cv2.putText(card, "Name: DEMO CITIZEN", (field_x, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    cv2.putText(card, f"DOB: {dob_text}", (field_x, 175), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    cv2.putText(card, "ID: 0000 0000 0000", (field_x, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    cv2.putText(card, "Address: DEMO STREET, SAMPLE CITY", (field_x, 265), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 1)

    # Watermark — unambiguous this is not a real document.
    overlay = card.copy()
    cv2.putText(
        overlay,
        "SPECIMEN - NOT A REAL DOCUMENT",
        (30, 355),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.65,
        (180, 40, 40),
        2,
    )
    card = cv2.addWeighted(overlay, 0.55, card, 0.45, 0)

    return card


def generate_clean_sample(output_path: str) -> None:
    """A clean, well-lit, single-generation JPEG — the 'Genuine' baseline."""
    card = _draw_base_card(dob_text="01/01/1990")
    cv2.imwrite(output_path, card, [cv2.IMWRITE_JPEG_QUALITY, 93])


def generate_tampered_dob_sample(output_path: str) -> None:
    """
    Starts from the clean, already-JPEG-compressed card, then overwrites
    the DOB field with a pasted-in patch — simulating a splice/digit-edit
    on that field. The patch fill is a few shades off the true background
    (a common real-world tell when a forger doesn't exactly color-match the
    surrounding paper/scan) and the replacement text is bold, so the patch
    has both a different compression history AND enough contiguous area for
    ELA's region detector to flag it — a thin, exactly-background-matched
    text edit is realistic but too small an area for this detector to
    reliably catch, which isn't a useful demo of the capability.
    """
    clean_path = os.path.join(SAMPLES_DIR, "_tmp_clean_source.jpg")
    generate_clean_sample(clean_path)
    base = cv2.imread(clean_path)
    os.remove(clean_path)

    tampered = base.copy()
    # A saturated color patch — not just an off-shade of the background —
    # stresses JPEG's chroma subsampling much more than a similar-luminance
    # neutral tone, which is what actually makes the patch's edges register
    # as a large, isolable contour rather than getting lost among the JPEG
    # edge artifacts every other text field on this card already carries.
    # (A subtler, exactly-background-matched edit is more realistic but
    # too faint for this region detector to isolate — verified empirically
    # against several patch colors before landing here.)
    patch_fill = (30, 30, 220)  # BGR — saturated red "correction" block
    cv2.rectangle(tampered, (196, 150), (432, 190), patch_fill, -1)
    cv2.putText(tampered, "DOB: 01/01/1985", (200, 176), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

    cv2.imwrite(output_path, tampered, [cv2.IMWRITE_JPEG_QUALITY, 93])


def generate_whatsapp_forward_sample(output_path: str) -> None:
    """
    Simulates a document photo that's been forwarded through several rounds
    of a messaging app, each hop resizing and re-encoding at a lower
    quality. This should trip `compression_warning` via the source JPEG's
    own quantization table (see ela_detector._assess_compression_warning),
    independent of any actual tampering — a good demo of the "read with
    caution" signal, not a "reject" signal.
    """
    clean_path = os.path.join(SAMPLES_DIR, "_tmp_clean_source.jpg")
    generate_clean_sample(clean_path)
    current = cv2.imread(clean_path)
    os.remove(clean_path)

    tmp_path = os.path.join(SAMPLES_DIR, "_tmp_pass.jpg")
    for _ in range(5):
        h, w = current.shape[:2]
        current = cv2.resize(current, (int(w * 0.9), int(h * 0.9)))
        current = cv2.resize(current, (CARD_W, CARD_H))
        cv2.imwrite(tmp_path, current, [cv2.IMWRITE_JPEG_QUALITY, 55])
        current = cv2.imread(tmp_path)
    os.remove(tmp_path)

    cv2.imwrite(output_path, current, [cv2.IMWRITE_JPEG_QUALITY, 55])


def main() -> None:
    os.makedirs(SAMPLES_DIR, exist_ok=True)

    targets = {
        "sample_clean.jpg": generate_clean_sample,
        "sample_tampered_dob.jpg": generate_tampered_dob_sample,
        "sample_whatsapp_forward.jpg": generate_whatsapp_forward_sample,
    }

    for filename, generator in targets.items():
        output_path = os.path.join(SAMPLES_DIR, filename)
        generator(output_path)
        size_kb = os.path.getsize(output_path) / 1024
        print(f"  wrote {filename} ({size_kb:.1f} KB)")

    print(f"\nDone. Samples written to {os.path.abspath(SAMPLES_DIR)}")


if __name__ == "__main__":
    main()
