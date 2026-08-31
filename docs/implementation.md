# Implementation Roadmap

* **Phase 1: Scaffolding**
  * Docker-compose setup.
  * FastAPI shell (`/api/v1/health`).
  * React + Vite initialization.
* **Phase 2: Database & API Core**
  * Supabase project initialization & SQLAlchemy models.
  * FastAPI `/api/v1/screen` endpoint structure (async mock).
* **Phase 3: Python AI Modules**
  * `ela_detector.py` (Quantization table + Diff Map).
  * `ocr_engine.py` (EasyOCR + Redaction rule).
  * `preprocess.py` (OpenCV deskew and crop).
* **Phase 4: Risk Fusion API**
  * Wire CV scripts into `/api/v1/screen` via `asyncio.gather`.
  * Calculate weighted Trust Score math.
* **Phase 5: React Dashboard**
  * Shadcn/ui component integration.
  * ELA SVG bracket overlay logic.
* **Phase 6: Hardening**
  * jsPDF report generation.
  * Fallback error handling for bad images.