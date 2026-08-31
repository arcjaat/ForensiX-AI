"""
Biometric Face Matching — Feature #4.

Pipeline:
  1. Detect faces in both the ID document scan and the uploaded selfie
     using OpenCV's DNN face detector (Caffe-based SSD model with
     res10_300x300_ssd_iter_140000.caffemodel). Falls back to Haar Cascade
     if the DNN model files are absent.
  2. Crop the largest detected face from each image.
  3. Resize each crop to 160×160 and convert to a normalised float32
     feature vector (flattened pixel embedding).

     Production note: for a hackathon demo, pixel-level embeddings give
     surprisingly usable results on well-lit front-facing ID photos and
     selfies (both images are square-on, similar illumination, no occlusion).
     A Siamese ResNet/FaceNet embedding would be the obvious upgrade path
     for production deployment.

  4. Compute cosine similarity between the two feature vectors.
  5. Return a normalised 0.0–1.0 score plus boolean flags indicating
     whether a face was detected in each image.

Graceful degradation:
  - If no face is detected in either input, the module returns
    similarity_score = 0.0 with the appropriate detection flag set to False.
    It never raises an exception — the risk fusion engine simply down-weights
    the face channel for that screening run.

Strict PII mandate:
  This module never stores, logs, or transmits the raw face crops or
  embeddings. Only the scalar similarity score leaves this function.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_EMBEDDING_SIZE = 160  # Resize face crops to 160×160 before embedding
_DNN_CONFIDENCE_THRESHOLD = 0.55  # Minimum detection confidence for DNN
_HAAR_SCALE_FACTOR = 1.15
_HAAR_MIN_NEIGHBOURS = 5
_HAAR_MIN_SIZE = (40, 40)

# DNN model file paths (relative to this module). The Caffe SSD model files
# are bundled in the Docker image; on local dev they may not be present so we
# fall back to the Haar cascade.
_MODULE_DIR = Path(__file__).resolve().parent
_DNN_PROTO_PATH = _MODULE_DIR / "models" / "deploy.prototxt"
_DNN_MODEL_PATH = _MODULE_DIR / "models" / "res10_300x300_ssd_iter_140000.caffemodel"

# ---------------------------------------------------------------------------
# Lazy-initialised detector singletons (avoid re-loading on every request)
# ---------------------------------------------------------------------------
_dnn_net: cv2.dnn.Net | None = None
_haar_cascade: cv2.CascadeClassifier | None = None
_detector_mode: str = "none"


def _init_detector() -> str:
    """Load the best available face detector. Prefers DNN, falls back to Haar."""
    global _dnn_net, _haar_cascade, _detector_mode

    if _detector_mode != "none":
        return _detector_mode

    # Try DNN first
    if _DNN_PROTO_PATH.exists() and _DNN_MODEL_PATH.exists():
        try:
            _dnn_net = cv2.dnn.readNetFromCaffe(
                str(_DNN_PROTO_PATH), str(_DNN_MODEL_PATH)
            )
            _detector_mode = "dnn"
            logger.info("Face detector initialised: DNN (Caffe SSD)")
            return _detector_mode
        except Exception as exc:
            logger.warning("DNN face detector load failed (%s), trying Haar", exc)

    # Fall back to Haar cascade (bundled with opencv-python-headless)
    haar_xml = os.path.join(
        cv2.data.haarcascades, "haarcascade_frontalface_default.xml"  # type: ignore[attr-defined]
    )
    if os.path.isfile(haar_xml):
        _haar_cascade = cv2.CascadeClassifier(haar_xml)
        if not _haar_cascade.empty():
            _detector_mode = "haar"
            logger.info("Face detector initialised: Haar Cascade")
            return _detector_mode

    _detector_mode = "unavailable"
    logger.warning(
        "No face detector available. Face matching will return 0.0 scores."
    )
    return _detector_mode


# ---------------------------------------------------------------------------
# Face detection helpers
# ---------------------------------------------------------------------------

def _detect_faces_dnn(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Detect faces using the DNN SSD model. Returns list of (x, y, w, h)."""
    assert _dnn_net is not None
    h, w = image.shape[:2]
    blob = cv2.dnn.blobFromImage(
        cv2.resize(image, (300, 300)),
        scalefactor=1.0,
        size=(300, 300),
        mean=(104.0, 177.0, 123.0),
    )
    _dnn_net.setInput(blob)
    detections = _dnn_net.forward()

    faces: list[tuple[int, int, int, int]] = []
    for i in range(detections.shape[2]):
        confidence = float(detections[0, 0, i, 2])
        if confidence < _DNN_CONFIDENCE_THRESHOLD:
            continue
        box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
        x1, y1, x2, y2 = box.astype(int)
        # Clamp to image bounds
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        fw, fh = x2 - x1, y2 - y1
        if fw > 10 and fh > 10:
            faces.append((x1, y1, fw, fh))

    return faces


def _detect_faces_haar(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Detect faces using the Haar cascade. Returns list of (x, y, w, h)."""
    assert _haar_cascade is not None
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    rects = _haar_cascade.detectMultiScale(
        gray,
        scaleFactor=_HAAR_SCALE_FACTOR,
        minNeighbors=_HAAR_MIN_NEIGHBOURS,
        minSize=_HAAR_MIN_SIZE,
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    if len(rects) == 0:
        return []
    return [(int(x), int(y), int(w), int(h)) for x, y, w, h in rects]


def _detect_faces(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Detect faces using the best available backend."""
    mode = _init_detector()
    if mode == "dnn":
        return _detect_faces_dnn(image)
    elif mode == "haar":
        return _detect_faces_haar(image)
    else:
        return []


def _largest_face(faces: list[tuple[int, int, int, int]]) -> tuple[int, int, int, int] | None:
    """Return the face with the largest area (most likely the primary subject)."""
    if not faces:
        return None
    return max(faces, key=lambda f: f[2] * f[3])


# ---------------------------------------------------------------------------
# Feature embedding
# ---------------------------------------------------------------------------

def _extract_embedding(image: np.ndarray, face_rect: tuple[int, int, int, int]) -> np.ndarray:
    """
    Crop the detected face region, resize to _EMBEDDING_SIZE×_EMBEDDING_SIZE,
    and flatten into a normalised float32 feature vector.

    This pixel-level embedding is intentionally simple and dependency-light for
    the hackathon. For production, swap this for a proper FaceNet / ArcFace
    128-dimensional embedding from a fine-tuned ResNet.
    """
    x, y, w, h = face_rect
    crop = image[y : y + h, x : x + w]

    # Convert to grayscale for illumination-invariant comparison
    if len(crop.shape) == 3:
        crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # Apply histogram equalization to reduce lighting differences
    crop = cv2.equalizeHist(crop)

    # Resize to standard dimensions
    crop = cv2.resize(crop, (_EMBEDDING_SIZE, _EMBEDDING_SIZE), interpolation=cv2.INTER_AREA)

    # Flatten and L2-normalise
    vec = crop.astype(np.float32).flatten()
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec


# ---------------------------------------------------------------------------
# Cosine similarity
# ---------------------------------------------------------------------------

def _cosine_similarity(u: np.ndarray, v: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors:

        cos(θ) = (u · v) / (‖u‖₂ · ‖v‖₂)

    Since _extract_embedding already L2-normalises the vectors, this
    simplifies to a dot product. The clamp to [0, 1] handles floating-point
    edge cases and negative values (dissimilar faces).
    """
    dot = float(np.dot(u, v))
    norm_u = float(np.linalg.norm(u))
    norm_v = float(np.linalg.norm(v))

    if norm_u == 0.0 or norm_v == 0.0:
        return 0.0

    similarity = dot / (norm_u * norm_v)
    # Clamp to [0, 1] — negative cosine sim means highly dissimilar
    return float(max(0.0, min(1.0, similarity)))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_face_match(
    document_image_path: str,
    selfie_image_path: str | None,
) -> dict:
    """
    Compare the face on the ID document to the uploaded selfie.

    Parameters
    ----------
    document_image_path : str
        File path to the scanned ID document.
    selfie_image_path : str | None
        File path to the selfie photograph.  If ``None`` or the file does not
        exist, the result degrades gracefully with ``face_detected_on_selfie = False``.

    Returns
    -------
    dict
        Keys: ``similarity_score`` (float 0.0–1.0),
              ``face_detected_on_id`` (bool),
              ``face_detected_on_selfie`` (bool).
    """
    result = {
        "similarity_score": 0.0,
        "face_detected_on_id": False,
        "face_detected_on_selfie": False,
    }

    # --- Load document image ---
    doc_img = cv2.imread(document_image_path)
    if doc_img is None:
        logger.warning("Could not read document image: %s", document_image_path)
        return result

    # --- Detect face in document ---
    doc_faces = _detect_faces(doc_img)
    doc_face = _largest_face(doc_faces)
    if doc_face is not None:
        result["face_detected_on_id"] = True
        logger.info(
            "Document face detected at (%d, %d, %d, %d) [%d candidate(s)]",
            *doc_face, len(doc_faces),
        )
    else:
        logger.info("No face detected in the document image.")
        return result

    # --- Load selfie image ---
    if selfie_image_path is None or not Path(selfie_image_path).exists():
        logger.info("No selfie provided; skipping biometric comparison.")
        return result

    selfie_img = cv2.imread(selfie_image_path)
    if selfie_img is None:
        logger.warning("Could not read selfie image: %s", selfie_image_path)
        return result

    # --- Detect face in selfie ---
    selfie_faces = _detect_faces(selfie_img)
    selfie_face = _largest_face(selfie_faces)
    if selfie_face is not None:
        result["face_detected_on_selfie"] = True
        logger.info(
            "Selfie face detected at (%d, %d, %d, %d) [%d candidate(s)]",
            *selfie_face, len(selfie_faces),
        )
    else:
        logger.info("No face detected in the selfie image.")
        return result

    # --- Extract embeddings & compare ---
    doc_embedding = _extract_embedding(doc_img, doc_face)
    selfie_embedding = _extract_embedding(selfie_img, selfie_face)
    similarity = _cosine_similarity(doc_embedding, selfie_embedding)

    result["similarity_score"] = round(similarity, 4)
    logger.info("Face match cosine similarity: %.4f", similarity)

    return result
