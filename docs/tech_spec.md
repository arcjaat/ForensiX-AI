# Technical Architecture & Stack Specification

## 1. Core Tech Stack
* **Frontend:** React 18 + Vite + TypeScript
* **Styling:** Tailwind CSS + Radix UI Primitives
* **Backend:** Python 3.11 + FastAPI (Asynchronous orchestration)
* **Database:** Supabase (PostgreSQL) for rapid scaling, auth, and SQL management
* **ORM:** SQLAlchemy 2.0 + asyncpg
* **Computer Vision:** OpenCV + Pillow (PIL)
* **Machine Learning:** PyTorch + EasyOCR (CNN forgery detection, face matching, text parsing)
* **Containerization:** Docker & Docker Compose

## 2. Key Algorithms
1. **Error Level Analysis (ELA):**
   * Resaves image at 90% JPEG quality; measures pixel difference.
   * Inspects `PIL.Image.quantization` to detect multi-pass re-compression (e.g., WhatsApp forwards).
   * Calculates local max-region error (p99) to detect small splices.
2. **Siamese Face Matching:**
   * Extracts face crops via OpenCV.
   * Computes 128-dimensional vector embeddings via PyTorch CNN.
   * Evaluates identity via Cosine Distance.