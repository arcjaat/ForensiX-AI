"""
Document Pre-processing — Feature #1.

Pipeline:
  1. Grayscale + Gaussian blur + Canny edge detection.
  2. Find contours; locate the largest 4-point polygon (the ID card's
     boundary) among them.
  3. Perspective-warp that quadrilateral to a flat, axis-aligned rectangle
     (auto-crop + deskew in one step).
  4. Enhance contrast with CLAHE (Contrast Limited Adaptive Histogram
     Equalization) on the luminance channel, so text/photo detail is more
     legible for the downstream OCR and face-match stages without blowing
     out highlights the way global histogram equalization would.

Fallback behavior:
  Real-world captures don't always yield a clean 4-point contour (cluttered
  background, card touching the frame edge, low contrast between card and
  background). Rather than fail the whole request, this module degrades
  gracefully:
    - If a 4-point card contour is found -> perspective transform applied.
    - Else if any sufficiently large contour is found -> axis-aligned crop
      to its bounding rect (no deskew, since we don't have 4 reliable
      corners to warp from).
    - Else -> no crop, original frame is contrast-enhanced only.
  The response always reports which path was taken so the officer UI (and
  the officer) knows whether to trust the auto-crop or expect a manual one.
"""
from __future__ import annotations

import os

import cv2
import numpy as np

# --- Tunables -------------------------------------------------------------
CANNY_LOW = 50
CANNY_HIGH = 150
GAUSSIAN_KERNEL = (5, 5)
# A candidate contour must cover at least this fraction of the frame area to
# be considered "the card" rather than background noise/texture.
MIN_CONTOUR_AREA_FRACTION = 0.15
# Polygon approximation tolerance as a fraction of the contour's perimeter.
APPROX_POLY_EPSILON_FRACTION = 0.02
CLAHE_CLIP_LIMIT = 2.5
CLAHE_TILE_GRID_SIZE = (8, 8)


def _order_points(pts: np.ndarray) -> np.ndarray:
    """Order 4 points as [top-left, top-right, bottom-right, bottom-left],
    required by cv2.getPerspectiveTransform's destination convention."""
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left has smallest x+y
    rect[2] = pts[np.argmax(s)]  # bottom-right has largest x+y
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right has smallest y-x
    rect[3] = pts[np.argmax(diff)]  # bottom-left has largest y-x
    return rect


def _find_card_quadrilateral(edges: np.ndarray, frame_area: float) -> np.ndarray | None:
    """Return the 4 corner points of the largest 4-point contour above the
    minimum area threshold, or None if no such contour exists."""
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for c in contours:
        area = cv2.contourArea(c)
        if area < frame_area * MIN_CONTOUR_AREA_FRACTION:
            break  # sorted descending, so nothing after this will be big enough either
        perimeter = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, APPROX_POLY_EPSILON_FRACTION * perimeter, True)
        if len(approx) == 4:
            return approx.reshape(4, 2).astype(np.float32)

    return None


def _find_largest_contour_bbox(edges: np.ndarray, frame_area: float) -> tuple[int, int, int, int] | None:
    """Fallback: bounding box of the single largest contour, regardless of
    its shape, used when no clean 4-point quad was found."""
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < frame_area * MIN_CONTOUR_AREA_FRACTION:
        return None
    x, y, w, h = cv2.boundingRect(largest)
    return x, y, w, h


def _perspective_warp(image: np.ndarray, corners: np.ndarray) -> np.ndarray:
    rect = _order_points(corners)
    (tl, tr, br, bl) = rect

    width_top = np.linalg.norm(tr - tl)
    width_bottom = np.linalg.norm(br - bl)
    max_width = int(max(width_top, width_bottom))

    height_left = np.linalg.norm(bl - tl)
    height_right = np.linalg.norm(br - tr)
    max_height = int(max(height_left, height_right))

    max_width = max(max_width, 1)
    max_height = max(max_height, 1)

    dst = np.array(
        [[0, 0], [max_width - 1, 0], [max_width - 1, max_height - 1], [0, max_height - 1]],
        dtype=np.float32,
    )

    transform_matrix = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, transform_matrix, (max_width, max_height))
    return warped


def _apply_clahe(image_bgr: np.ndarray) -> np.ndarray:
    """Contrast-limited adaptive histogram equalization on the L channel of
    LAB color space — enhances local contrast (helps faint print, worn
    lamination glare, etc.) without distorting color balance the way
    equalizing each RGB channel independently would."""
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP_LIMIT, tileGridSize=CLAHE_TILE_GRID_SIZE)
    l_enhanced = clahe.apply(l_channel)

    enhanced_lab = cv2.merge((l_enhanced, a_channel, b_channel))
    return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)


def run_preprocessing(image_path: str, output_dir: str = "app/static/uploads") -> dict:
    """
    Main entry point. Auto-crops (if possible), deskews (if possible), and
    contrast-enhances an ID document photo.

    Returns a dict:
        {
            "output_path": str,
            "crop_method": "perspective_warp" | "bounding_box" | "none",
            "corners_detected": [[x,y], [x,y], [x,y], [x,y]] | None,
        }

    Raises ValueError if the image can't be read.
    """
    os.makedirs(output_dir, exist_ok=True)

    original = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if original is None:
        raise ValueError(f"Could not read image at {image_path}. Is it a valid JPEG/PNG?")

    frame_area = float(original.shape[0] * original.shape[1])

    gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, GAUSSIAN_KERNEL, 0)
    edges = cv2.Canny(blurred, CANNY_LOW, CANNY_HIGH)
    # Close small gaps in the edge map so a card's border forms one
    # continuous contour instead of several broken segments.
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)

    corners = _find_card_quadrilateral(edges, frame_area)

    if corners is not None:
        cropped = _perspective_warp(original, corners)
        crop_method = "perspective_warp"
        corners_out = corners.astype(int).tolist()
    else:
        bbox = _find_largest_contour_bbox(edges, frame_area)
        if bbox is not None:
            x, y, w, h = bbox
            cropped = original[y:y + h, x:x + w]
            crop_method = "bounding_box"
            corners_out = None
        else:
            cropped = original
            crop_method = "none"
            corners_out = None

    enhanced = _apply_clahe(cropped)

    base_name = os.path.splitext(os.path.basename(image_path))[0]
    output_filename = f"{base_name}_processed.jpg"
    output_path = os.path.join(output_dir, output_filename)
    cv2.imwrite(output_path, enhanced, [cv2.IMWRITE_JPEG_QUALITY, 95])

    return {
        "output_path": output_path,
        "crop_method": crop_method,
        "corners_detected": corners_out,
    }


if __name__ == "__main__":
    # Quick manual smoke test:
    #   python -m app.services.preprocessor /path/to/sample_id.jpg
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m app.services.preprocessor <image_path>")
        raise SystemExit(1)

    result = run_preprocessing(sys.argv[1])
    print(f"Crop method     : {result['crop_method']}")
    print(f"Corners detected: {result['corners_detected']}")
    print(f"Output saved to : {result['output_path']}")
